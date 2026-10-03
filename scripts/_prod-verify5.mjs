import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://ea.vieschool.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.locator('text=/Chơi không cần tài khoản/i').first().click();
await page.waitForTimeout(4000);
await page.locator('text=/Lớp 4/').first().click();
await page.waitForTimeout(4000);
await page.locator('button:has-text("Thi thử - 200 câu")').first().click();
await page.waitForTimeout(3000);
console.log((await page.locator('body').innerText()).slice(0, 700));
const start = page.locator('button:has-text("Bắt đầu")').first();
if (await start.count()) {
  await start.click(); await page.waitForTimeout(5000);
  console.log('===== exam =====');
  console.log((await page.locator('body').innerText()).slice(0, 800));
  await page.screenshot({ path: '/tmp/prod-exam.png' });
}
await browser.close();
