/**
 * One-time login bootstrap for the gemini.google.com web channel.
 * Opens a headed Chromium window with a persistent profile; the user
 * signs into Google (Gemini Plus account) once. Cookies persist in
 * scripts/gemini-web-profile/ for all later headless runs.
 *
 * Usage: node scripts/gemini-login.mjs
 * Exits automatically once the Gemini input box is visible (logged in).
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'gemini-web-profile');
mkdirSync(DIR, { recursive: true });

const ctx = await chromium.launchPersistentContext(DIR, {
  headless: false,
  viewport: { width: 1200, height: 800 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });
console.log('==> Dang nhap Google trong cua so vua mo (tai khoan co Gemini Plus).');
console.log('==> Script tu thoat khi thay o nhap prompt (da login).');

// Gemini input: contenteditable div inside the prompt area.
const INPUT = 'div.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], div[contenteditable="true"][role="textbox"]';
try {
  await page.waitForSelector(INPUT, { timeout: 300_000 });
  console.log('LOGGED IN - input box visible. Profile saved.');
} catch {
  console.log('TIMEOUT 5min khong thay input box - thu lai.');
}
await ctx.close();
writeFileSync(new URL('./gemini-web-ready.flag', import.meta.url), new Date().toISOString());
