import { chromium } from 'playwright';
const PROFILE = '/tmp/ioe-real-profile';
const browser = await chromium.launchPersistentContext(PROFILE, { headless: true });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://ioe.vn/sso/login?returnUrl=%2Fhoc-sinh', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
if (await page.locator('input[type=password]').count()) {
  await page.locator('input').nth(0).fill(process.env.U);
  await page.locator('input[type=password]').first().fill(process.env.PW);
  await page.locator('input[type=password]').first().press('Enter');
  await page.waitForTimeout(6000);
}
console.log('URL:', page.url());
console.log('body:', (await page.locator('body').innerText()).slice(0, 500));
await page.screenshot({ path: '/tmp/ioe-real.png' });
await browser.close();
