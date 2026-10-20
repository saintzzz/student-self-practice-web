/**
 * Probe the gemini.google.com web channel end-to-end:
 * persistent profile -> submit prompt -> wait for streamed response
 * to stabilize -> dump response text.
 * Usage: node scripts/gemini-web-probe.mjs [headed]
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, 'gemini-web-profile');
const HEADED = process.argv[2] === 'headed';

const INPUT = 'div.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], div[contenteditable="true"][role="textbox"]';
const RESPONSE = 'message-content .markdown, .model-response-text, message-content';

const PROMPT = `Output ONLY a JSON array, no markdown fences, no commentary:
[{"q":"She ___ a student.","c":["is","are","am","be"],"a":0,"ex":"test"}]`;

const ctx = await chromium.launchPersistentContext(DIR, {
  headless: !HEADED,
  viewport: { width: 1200, height: 800 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });

const box = page.locator(INPUT).first();
await box.waitFor({ timeout: 30_000 });
await box.click();
await page.keyboard.insertText(PROMPT);
await page.keyboard.press('Enter');
console.log('submitted, waiting for response...');

const t0 = Date.now();
let last = '', stable = 0;
while (Date.now() - t0 < 180_000) {
  await page.waitForTimeout(2_000);
  const texts = await page.locator(RESPONSE).allInnerTexts().catch(() => []);
  const cur = texts.join('\n---\n').trim();
  if (cur === last && cur.length > 10) {
    if (++stable >= 3) break;
  } else {
    stable = 0;
    last = cur;
  }
}
writeFileSync(join(HERE, '_gemini-web-response.txt'), last || '(empty)');
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${last.length} chars -> _gemini-web-response.txt`);
await ctx.close();
