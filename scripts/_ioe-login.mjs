import { chromium } from 'playwright';
const PROFILE = process.env.P;
const USER = process.env.U, PW = process.env.PW;
const browser = await chromium.launchPersistentContext(PROFILE, { headless: false });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://ioe.vn/sso/login?returnUrl=%2Fhoc-sinh', { waitUntil: 'domcontentloaded' });
for (let t = 0; t < 20; t++) {
  if (await page.locator('input[type=password]').count()) break;
  if (page.url().includes('ioe.vn')) break;
  await page.waitForTimeout(1500);
}
if (await page.locator('input[type=password]').count()) {
  await page.locator('input').nth(0).fill(USER);
  await page.locator('input[type=password]').first().fill(PW);
  await page.locator('button[type=submit], button:has-text("Đăng nhập")').first().click();
  for (let t = 0; t < 20; t++) {
    await page.waitForTimeout(1500);
    const skip = page.locator('text=Để sau').first();
    if (await skip.count()) { await skip.click(); }
    if (page.url().includes('ioe.vn')) break;
  }
}
await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' });
for (let t = 0; t < 15; t++) {
  await page.waitForTimeout(1500);
  if (await page.locator('.ioe-exam-detail__do-btn').count()) break;
}
console.log('do-btns:', await page.locator('.ioe-exam-detail__do-btn').count(), 'url:', page.url());
await browser.close();
