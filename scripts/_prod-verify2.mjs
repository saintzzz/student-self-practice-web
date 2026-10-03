import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://ea.vieschool.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.locator('text=/Chơi không cần tài khoản/i').first().click();
await page.waitForTimeout(4000);
await page.locator('text=/Lớp 4/').first().click();
await page.waitForTimeout(4000);
console.log('url:', page.url());
const txt = await page.locator('body').innerText();
console.log(txt.slice(0, 1200));
await page.screenshot({ path: '/tmp/prod-g4.png', fullPage: true });
// click Luyện đề Tiếng Anh if present
const drill = page.locator('text=/Luyện đề/').first();
if (await drill.count()) {
  await drill.click(); await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/prod-drill.png' });
  console.log('--- drill ---'); console.log((await page.locator('body').innerText()).slice(0, 1200));
}
await browser.close();
