// Shared LLM channel for repo pipelines (gen / polish / verify / review).
// Primary: codex CLI (ChatGPT subscription via `codex exec`, stdin prompt).
// Fallback: gemini.google.com web (Gemini Plus subscription) driven through a
// persistent Playwright profile - requires one-time `node scripts/_gemini-login.mjs`.
//
// Usage:
//   const channel = createLlmChannel({ workers: 3 });
//   const { text, provider } = await channel.call(prompt);
//   await channel.close();
//
// Once codex reports a usage/quota error the channel stops spawning it and
// sends the rest of the run to gemini - restarting the process re-prefers codex.
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
// Chromium locks a profile dir to one process; to run two LLM-channel
// processes concurrently, copy the profile dir and point the second at it:
//   cp -r scripts/gemini-web-profile scripts/gemini-web-profile-2
//   LLM_GEMINI_PROFILE=.../gemini-web-profile-2 node scripts/polish-codex.mjs
const PROFILE = process.env.LLM_GEMINI_PROFILE || join(HERE, 'gemini-web-profile');
const INPUT = 'div.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], div[contenteditable="true"][role="textbox"]';
const RESPONSE = 'message-content';
const RATE_RE = /reached your (usage |)limit|try again (later|tomorrow)|rate.?limit|quota exceeded|too many requests/i;
const CODEX_QUOTA_RE = /usage limit|hit your|quota|insufficient/i;

// codex ships as a .cmd shim on Windows, a plain node bin elsewhere.
const CODEX_BIN = process.platform === 'win32' ? 'codex.cmd' : 'codex';

function codexRun(prompt, timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    const p = spawn(CODEX_BIN, ['exec', '--skip-git-repo-check'], { cwd: process.cwd(), shell: true, windowsHide: true });
    let out = '', err = '';
    const kill = setTimeout(() => { p.kill(); reject(new Error('codex-timeout')); }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { clearTimeout(kill); reject(e); });
    p.on('close', (code) => { clearTimeout(kill); code === 0 ? resolve(out) : reject(new Error(`codex-exit-${code}: ${err.slice(0, 160)}`)); });
    p.stdin.write(prompt);
    p.stdin.end();
  });
}

class GeminiWeb {
  constructor(maxPages, headed) {
    this.maxPages = maxPages;
    this.headed = headed;
    this.ctx = null;
    this.free = [];
    this.created = 0;
    this.waiters = [];
  }
  async init() {
    if (this.ctx) return;
    this.ctx = await chromium.launchPersistentContext(PROFILE, {
      headless: !this.headed,
      viewport: { width: 1200, height: 800 },
      args: ['--disable-blink-features=AutomationControlled'],
    });
  }
  async acquire() {
    if (this.free.length) return this.free.pop();
    if (this.created < this.maxPages) {
      this.created++;
      return this.ctx.newPage();
    }
    return new Promise((res) => this.waiters.push(res));
  }
  release(page) {
    if (this.waiters.length) this.waiters.shift()(page);
    else this.free.push(page);
  }
  async call(prompt) {
    const page = await this.acquire();
    try {
      // fresh chat per call - isolates context and keeps prompts small
      await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });
      await page.locator(INPUT).first().waitFor({ timeout: 45_000 });
      const box = page.locator(INPUT).first();
      await box.click();
      await page.keyboard.insertText(prompt);
      await page.keyboard.press('Enter');
      const t0 = Date.now();
      let last = '', stable = 0;
      while (Date.now() - t0 < 240_000) {
        await page.waitForTimeout(2_000);
        const texts = await page.locator(RESPONSE).allInnerTexts().catch(() => []);
        const cur = (texts[texts.length - 1] ?? '').trim();
        if (cur === last && cur.length > 20) { if (++stable >= 3) break; }
        else { stable = 0; last = cur; }
      }
      if (!last || last.length <= 20) throw new Error('gemini-empty-response');
      if (RATE_RE.test(last)) throw new Error('gemini-rate-limited');
      return last;
    } finally {
      this.release(page);
    }
  }
  async close() {
    if (this.ctx) { await this.ctx.close(); this.ctx = null; }
  }
}

export function createLlmChannel({ workers = 3, headed = false, provider = 'auto' } = {}) {
  const gemini = provider === 'codex' ? null : new GeminiWeb(workers, headed);
  let codexDown = provider === 'gemini';
  const counts = { codex: 0, gemini: 0 };
  let quotaLogged = false;

  async function call(prompt) {
    if (!codexDown) {
      try {
        const text = await codexRun(prompt);
        counts.codex++;
        return { text, provider: 'codex' };
      } catch (e) {
        if (CODEX_QUOTA_RE.test(String(e.message ?? e))) {
          codexDown = true;
          if (!quotaLogged) { console.log('  [llm] codex quota hit - switching to gemini-web for this run'); quotaLogged = true; }
        }
        if (!gemini) throw e;
      }
    }
    if (!gemini) throw new Error('no-provider');
    await gemini.init();
    const text = await gemini.call(prompt);
    counts.gemini++;
    return { text, provider: 'gemini' };
  }

  return {
    call,
    async close() { if (gemini) await gemini.close(); },
    counts,
  };
}
