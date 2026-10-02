import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/vio-probe', { headless: false });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://violympic.vn/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
// find register element
const els = await page.locator('a,button,[role=button],span,div').evaluateAll(es =>
  es.filter(e => /đăng ký/i.test(e.textContent||'')).map(e => ({tag: e.tagName, href: e.href||'', cls: (e.className||'').toString().slice(0,60)})));
console.log(JSON.stringify(els.slice(0,10), null, 1));
// try direct URL guesses
for (const u of ['https://violympic.vn/dang-ky','https://violympic.vn/register','https://accounts.violympic.vn/register','https://id.violympic.vn/dang-ky']) {
  await page.goto(u, { waitUntil: 'domcontentloaded' }).catch(()=>{});
  await page.waitForTimeout(4000);
  console.log(u, '->', page.url(), '| inputs:', await page.locator('input').count());
}
await browser.close();
