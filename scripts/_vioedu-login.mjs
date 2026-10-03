import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/vioedu-profile', { headless: true });
const page = browser.pages()[0] || await browser.newPage();
const caps = [];
page.on('response', async r => {
  const u = r.url();
  if (/api|graphql|login|exam|question|practice/i.test(u)) {
    try { const b = await r.text(); if (b.length > 200) caps.push({u: u.slice(0,120), b: b.slice(0,400)}); } catch {}
  }
});
await page.goto('https://vio.edu.vn/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
await page.getByText('Đăng nhập').first().click().catch(()=>{});
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/vioedu-login.png' });
const inputs = page.locator('input');
const ni = await inputs.count();
console.log('inputs:', ni, 'url:', page.url());
for (let i = 0; i < ni; i++) console.log(i, await inputs.nth(i).getAttribute('placeholder'), await inputs.nth(i).getAttribute('type'));
await browser.close();
