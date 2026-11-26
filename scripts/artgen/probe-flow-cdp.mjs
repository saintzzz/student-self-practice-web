import { chromium } from 'playwright';

// Probe Flow UI via CDP on the user's real signed-in Chrome (port 9222).
const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = browser.contexts()[0];
const pages = ctx.pages();
console.log('pages:', pages.map(p => p.url()));

let page = pages.find(p => p.url().includes('flow.google.com'));
if (!page) { page = await ctx.newPage(); await page.goto('https://flow.google.com/', { waitUntil: 'domcontentloaded' }); }
await page.waitForTimeout(4000);

const dump = await page.evaluate(() => {
  const txt = (document.body?.innerText || '').slice(0, 3000);
  const inputs = [...document.querySelectorAll('textarea, [contenteditable=true], input[type=text]')]
    .map(e => ({ tag: e.tagName, ph: e.placeholder || '', aria: e.getAttribute('aria-label') || '', cls: (e.className || '').slice(0, 80) }));
  const btns = [...document.querySelectorAll('button, [role=button]')].slice(0, 60)
    .map(e => ({ t: (e.innerText || '').trim().slice(0, 60), aria: e.getAttribute('aria-label') || '' }))
    .filter(b => b.t || b.aria);
  return { url: location.href, txt, inputs, btns };
});
console.log(JSON.stringify(dump, null, 2));
