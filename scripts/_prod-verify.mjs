import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://ea.vieschool.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.screenshot({ path: '/tmp/prod-home.png' });
console.log('url:', page.url());
const txt = await page.locator('body').innerText();
console.log(txt.slice(0, 800));
// guest flow
const guest = page.locator('text=/Chơi không cần|Khách|Guest|Chơi ngay/i').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(4000); }
await page.screenshot({ path: '/tmp/prod-after-guest.png' });
console.log('---');
console.log((await page.locator('body').innerText()).slice(0, 800));
await browser.close();
