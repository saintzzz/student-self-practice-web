import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://ea.vieschool.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.locator('button:has-text("Chơi không cần tài khoản")').click();
await page.waitForTimeout(3500);
console.log('--- GRADE SELECT ---');
console.log((await page.locator('body').innerText().catch(()=>'')).slice(0, 300));
const g4 = page.locator('button:has-text("4")').first();
await g4.click();
await page.waitForTimeout(3500);
const card = page.locator('[data-testid="daily-quest-card"]');
console.log('quest card count:', await card.count());
if (await card.count()) {
  console.log(await card.innerText());
} else {
  console.log('--- PAGE ---');
  console.log((await page.locator('body').innerText().catch(()=>'')).slice(0, 500));
}
await page.screenshot({ path: '/tmp/quest-card.png', fullPage: true });
await browser.close();
