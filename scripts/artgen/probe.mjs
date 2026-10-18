// Probe the artgen profile's ChatGPT state: logged-in? composer? banners?
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const HERE = dirname(fileURLToPath(import.meta.url));
const ctx = await chromium.launchPersistentContext(join(HERE, 'profile'), {
  headless: false, viewport: { width: 1280, height: 800 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] ?? await ctx.newPage();
await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
const state = await page.evaluate(() => {
  const q = (s) => document.querySelectorAll(s).length;
  const text = (s) => [...document.querySelectorAll(s)].slice(0, 5).map((e) => e.innerText?.slice(0, 60) ?? e.getAttribute('aria-label') ?? e.outerHTML.slice(0, 80));
  return {
    url: location.href,
    composer: q('#prompt-textarea') + q('#mobile-composer-prompt') + q('div[contenteditable="true"]') + q('textarea'),
    loginBtns: text('a[href*="auth"], button[class*="login"], [data-testid="login-button"]'),
    avatars: q('[data-testid*="profile"], img[alt*="ser"], button[aria-label*="ccount"], button[aria-label*="rofile"]'),
    cookieBanner: q('[id*="cookie"], [class*="cookie"]'),
    bannerText: text('#cookie-consent-description'),
    btns: text('button').slice(0, 10),
    body: document.body.innerText.slice(0, 300),
  };
});
console.log(JSON.stringify(state, null, 1));
await page.screenshot({ path: join(tmpdir(), 'artgen-state.png') });
await ctx.close();
