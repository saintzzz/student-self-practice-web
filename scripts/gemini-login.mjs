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
console.log('==> Script tu thoat khi thay avatar Google Account (login that).');

const INPUT = 'div.ql-editor[contenteditable="true"], rich-textarea [contenteditable="true"], div[contenteditable="true"][role="textbox"]';
// Logged-in proof: CORE session cookies only - SID/HSID/__Secure-1PSID/3PSID
// EXACT match. __Secure-*TS/*CC variants are set pre-login and false-trigger.
const CORE = /^(SID|HSID|SSID|__Secure-[13]PSID)$/;
const t0 = Date.now();
let logged = false;
while (Date.now() - t0 < 600_000) {
  const cookies = await ctx.cookies();
  if (cookies.some((c) => CORE.test(c.name) && c.domain.includes('google'))) {
    logged = true; break;
  }
  await page.waitForTimeout(3_000).catch(() => {});
}
if (logged) {
  console.log('Session cookie detected - cho redirect ve gemini...');
  try { await page.waitForURL(/gemini\.google\.com/, { timeout: 90_000 }); } catch { }
  // let the app fully render logged-in (input box present) - proves session landed
  await page.locator(INPUT).first().waitFor({ timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(20_000); // Chromium commits cookies to disk async
  // storageState reads the LIVE cookie jar - deterministic, does not depend on
  // Chromium's async profile flush (which was losing the OAuth cookies)
  const statePath = join(DIR, '..', 'gemini-auth.json');
  await ctx.storageState({ path: statePath });
  const authN = (await ctx.cookies()).filter((c) => CORE.test(c.name)).length;
  console.log(`LOGGED IN - ${authN} core auth cookies -> ${statePath}`);
  writeFileSync(new URL('./gemini-web-ready.flag', import.meta.url), new Date().toISOString());
} else {
  console.log('TIMEOUT 10min khong thay Google session cookie - chua login, thu lai.');
}
await ctx.close();
