// Shared LLM channel for repo pipelines (gen / polish / verify / review).
// Primary: codex CLI (ChatGPT subscription via `codex exec`, stdin prompt).
// Fallback: gemini.google.com web (Gemini Plus subscription) driven through a
// persistent Playwright profile - requires one-time `node scripts/gemini-login.mjs`.
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
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
// Chromium locks a profile dir to one process; to run two LLM-channel
// processes concurrently, copy the profile dir and point the second at it:
//   cp -r scripts/gemini-web-profile scripts/gemini-web-profile-2
//   LLM_GEMINI_PROFILE=.../gemini-web-profile-2 node scripts/polish-codex.mjs
const PROFILE = process.env.LLM_GEMINI_PROFILE || join(HERE, 'gemini-web-profile');
// gemini-auth.json (ctx.storageState from gemini-login) is the reliable auth
// source - Chromium's async profile cookie flush was losing OAuth cookies.
const AUTH_STATE = join(HERE, 'gemini-auth.json');
const INPUT = 'div.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], div[contenteditable="true"][role="textbox"]';
const RESPONSE = 'message-content';
const RATE_RE = /reached your (usage |)limit|try again (later|tomorrow)|rate.?limit|quota exceeded|too many requests/i;
const CODEX_QUOTA_RE = /usage limit|hit your|quota|insufficient/i;

// codex ships as a .cmd shim on Windows, a plain node bin elsewhere.
const CODEX_BIN = process.platform === 'win32' ? 'codex.cmd' : 'codex';

function codexRun(prompt, { model = '', effort = '' } = {}, timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    const args = ['exec', '--skip-git-repo-check'];
    if (model) args.push('-m', model);
    if (effort) args.push('-c', `model_reasoning_effort=${effort}`);
    const p = spawn(CODEX_BIN, args, { cwd: process.cwd(), shell: true, windowsHide: true });
    let out = '', err = '';
    const kill = setTimeout(() => { p.kill(); reject(new Error('codex-timeout')); }, timeoutMs);
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { clearTimeout(kill); reject(e); });
    p.on('close', (code) => {
      clearTimeout(kill);
      if (code === 0) return resolve(out);
      // quota/limit errors print late in stdout - keep the TAIL of both
      // streams so the classifier sees them, not just the session banner.
      reject(new Error(`codex-exit-${code}: ${(err + ' ' + out.slice(-400)).slice(-400)}`));
    });
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
  async reset() {
    // browser crashed or context died - drop handles so init() rebuilds.
    try { await this.ctx?.close(); } catch { }
    try { await this.browser?.close(); } catch { }
    this.ctx = null; this.browser = null;
    this.free = []; this.created = 0; this.waiters = [];
  }
  async init() {
    // zombie ctx: dead browser still holds a ctx handle - drop and rebuild
    if (this.ctx && this.browser && !this.browser.isConnected()) await this.reset();
    if (this.ctx) return;
    if (existsSync(AUTH_STATE)) {
      this.browser = await chromium.launch({
        headless: !this.headed,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      this.ctx = await this.browser.newContext({
        storageState: AUTH_STATE,
        viewport: { width: 1200, height: 800 },
      });
      return;
    }
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
      const p = await this.ctx.newPage();
      // gemini's SPA is heavy - drop images/fonts/media so the renderer
      // survives on memory-tight machines (DOM/JS still intact).
      await p.route('**/*', (r) =>
        ['image', 'media', 'font'].includes(r.request().resourceType()) ? r.abort() : r.continue());
      return p;
    }
    return new Promise((res) => this.waiters.push(res));
  }
  release(page) {
    if (this.waiters.length) this.waiters.shift()(page);
    else this.free.push(page);
  }
  async ensureBestMode(page) {
    // pick the strongest model in the web picker (once per page, locale-safe).
    // Verified options on this Plus account: Flash-Lite / Flash / 3.1 Pro /
    // 4 Argon + thinking level (Thap/Trung binh/Cao).
    if (page._modeSet) return;
    page._modeSet = true;
    try {
      const picker = page.locator('button:has(span.picker-primary-text), [aria-label*="mode picker" i], [class*="input-area"] button:has-text("Flash")').first();
      if (!(await picker.count())) return;
      const cur = (await picker.innerText().catch(() => '')).trim();
      if (/argon|pro|thinking|suy luận/i.test(cur)) return;
      await picker.click();
      await page.waitForTimeout(1200);
      const scope = page.locator('[role="menuitemradio"], [role="option"], [role="menuitem"], li, button');
      // prefer 3.1 Pro (Plus tier confirmed); Argon last - may be AI Pro gated
      for (const re of [/\bpro\b/i, /thinking|suy luận/i, /argon/i]) {
        const opt = scope.filter({ hasText: re }).first();
        if (await opt.count()) { await opt.click(); break; }
      }
      await page.waitForTimeout(800);
      // best-effort: thinking level -> Cao (High) when the level control exists
      const lvl = scope.filter({ hasText: /^(cao|high)$/i }).first();
      if (await lvl.count()) await lvl.click().catch(() => {});
    } catch { /* best effort - keep default mode */ }
  }
  async call(prompt) {
    const page = await this.acquire();
    try {
      // fresh chat per call - isolates context and keeps prompts small
      await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });
      await page.locator(INPUT).first().waitFor({ timeout: 45_000 });
      await this.ensureBestMode(page);
      const box = page.locator(INPUT).first();
      await box.click();
      await page.keyboard.insertText(prompt);
      await page.keyboard.press('Enter');
      const t0 = Date.now();
      let last = '', stable = 0;
      while (Date.now() - t0 < 360_000) {
        await page.waitForTimeout(2_000);
        const texts = await page.locator(RESPONSE).allInnerTexts().catch(() => []);
        const cur = (texts[texts.length - 1] ?? '').trim();
        // 16s of unchanged text before capture - long JSON streams can pause
        // mid-generation; grabbing them early truncates output into parse-fail
        if (cur === last && cur.length > 20) { if (++stable >= 8) break; }
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
    if (this.browser) { await this.browser.close(); this.browser = null; }
  }
}

// Gemini-web often emits unescaped '"' inside JSON string values -> strict
// JSON.parse fails on otherwise good output. A quote inside a string is a
// real terminator only if the next non-space char is , } ] or : (or EOF);
// anything else is an inner quote and gets escaped.
export function fixInnerQuotes(s) {
  let out = '', inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === '\\') { out += c; esc = true; continue; }
    if (c === '"') {
      if (!inStr) { inStr = true; out += c; continue; }
      let j = i + 1;
      while (j < s.length && ' \n\t\r'.includes(s[j])) j++;
      const nxt = s[j];
      if (nxt === ',' || nxt === '}' || nxt === ']' || nxt === ':' || j >= s.length) { inStr = false; out += c; }
      else out += '\\"';
      continue;
    }
    out += c;
  }
  return out;
}

// Shared tolerant JSON-array parser for LLM output: whole-text, ```json
// fence, then longest bracket match - each retried with fixInnerQuotes.
export function parseJsonArray(text) {
  if (typeof text !== 'string') throw new Error('parse-fail');
  const tries = (s) => {
    try { const v = JSON.parse(s); if (Array.isArray(v) && v.length) return v; } catch { }
    try { const v = JSON.parse(fixInnerQuotes(s)); if (Array.isArray(v) && v.length) return v; } catch { }
    return null;
  };
  let v = tries(text.trim()); if (v) return v;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { v = tries(fence[1].trim()); if (v) return v; }
  const m = text.match(/\[[\s\S]*\]/g);
  if (m) for (let i = m.length - 1; i >= 0; i--) {
    v = tries(m[i]); if (v) return v;
  }
  throw new Error('parse-fail');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Continuous rate-limit protection: each provider has a circuit that opens
// after consecutive failures. Quota errors open long (codex reset time is
// parsed from stderr when present); transport/empty-response opens short.
// While a circuit is open calls route to the other provider; when BOTH are
// open the call SLEEPS until the earliest cooldown ends instead of burning a
// batch - failed items stay pending and the run survives quota windows.
export function createLlmChannel({ workers = 3, headed = false, provider = 'auto', codexModel = '', codexEffort = '' } = {}) {
  const gemini = provider === 'codex' ? null : new GeminiWeb(workers, headed);
  const codexOpts = {
    model: process.env.LLM_CODEX_MODEL || codexModel,
    effort: process.env.LLM_CODEX_EFFORT || codexEffort,
  };
  const OPEN_AFTER = 3;
  const circ = {
    codex: { fails: 0, openUntil: provider === 'gemini' ? Date.now() + 24 * 3600_000 : 0 },
    gemini: { fails: 0, openUntil: provider === 'codex' ? Date.now() + 24 * 3600_000 : 0 },
  };
  const counts = { codex: 0, gemini: 0, waits: 0 };

  const classifyCodex = (e) => {
    const m = String(e?.message ?? e);
    if (CODEX_QUOTA_RE.test(m)) {
      // codex prints "try again at HH:MM" / "resets in Nh" - honor it if found
      const clock = m.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (clock) {
        const d = new Date();
        let hh = Number(clock[1]) % 12;
        if (/pm/i.test(clock[3])) hh += 12;
        d.setHours(hh, Number(clock[2]), 0, 0);
        if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
        return { kind: 'quota', until: d.getTime() };
      }
      return { kind: 'quota', until: Date.now() + 30 * 60_000 };
    }
    return { kind: 'transient', until: Date.now() + 90_000 };
  };
  const classifyGemini = (e) => {
    const m = String(e?.message ?? e);
    if (/rate.?limit/i.test(m)) return { kind: 'quota', until: Date.now() + 10 * 60_000 };
    if (/empty-response/i.test(m)) return { kind: 'degraded', until: Date.now() + 3 * 60_000 };
    return { kind: 'transient', until: Date.now() + 90_000 };
  };
  const open = (p, until, why) => {
    circ[p].openUntil = Math.max(circ[p].openUntil, until);
    console.log(`  [llm] circuit ${p} OPEN ${Math.round((until - Date.now()) / 1000)}s (${why})`);
  };

  async function call(prompt) {
    for (;;) {
      const now = Date.now();
      const codexOpen = now < circ.codex.openUntil;
      const gemOpen = !gemini || now < circ.gemini.openUntil;
      if (codexOpen && gemOpen) {
        const wake = Math.min(circ.codex.openUntil, circ.gemini.openUntil) - now;
        const wait = Math.min(Math.max(wake, 10_000), 15 * 60_000);
        counts.waits++;
        console.log(`  [llm] all providers cooling - sleep ${Math.round(wait / 1000)}s (wait #${counts.waits})`);
        await sleep(wait);
        continue;
      }
      if (!codexOpen) {
        try {
          const text = await codexRun(prompt, codexOpts);
          circ.codex.fails = 0;
          counts.codex++;
          return { text, provider: 'codex' };
        } catch (e) {
          const c = classifyCodex(e);
          circ.codex.fails++;
          if (c.kind === 'quota' || circ.codex.fails >= OPEN_AFTER) open('codex', c.until, c.kind);
          if (circ.codex.openUntil > Date.now()) continue; // quota/open -> route to gemini or sleep
          if (!gemini) throw e;
          await sleep(2_000); continue; // transient codex miss - quick retry before falling over
        }
      }
      if (gemini) {
        try {
          await gemini.init();
          const text = await gemini.call(prompt);
          circ.gemini.fails = 0;
          counts.gemini++;
          return { text, provider: 'gemini' };
        } catch (e) {
          const c = classifyGemini(e);
          circ.gemini.fails++;
          if (circ.gemini.fails >= OPEN_AFTER || c.kind === 'quota') open('gemini', c.until, `${c.kind}: ${String(e?.message ?? e).slice(0, 80)}`);
          if (/browser has been closed|Target closed|has been closed/i.test(String(e?.message ?? e))) await gemini.reset().catch(() => {});
          await sleep(2_000); // loop: codex open+gemini open -> top sleeps
        }
      }
    }
  }

  return {
    call,
    async close() { if (gemini) await gemini.close(); },
    counts,
  };
}
