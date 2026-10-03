import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/ioe-real-profile', { headless: true });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://ioe.vn/sso/login?returnUrl=%2Fhoc-sinh', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
if (await page.locator('input[type=password]').count()) {
  await page.locator('input').nth(0).fill(process.env.U);
  await page.locator('input[type=password]').first().fill(process.env.PW);
  await page.locator('input[type=password]').first().press('Enter');
  await page.waitForTimeout(8000);
}
console.log('after login:', page.url());
// find link to tu-luyen
const links = await page.locator('a[href*="tu-luyen"]').all();
console.log('tu-luyen links:', links.length);
if (links.length) { await links[0].click(); await page.waitForTimeout(8000); }
else { await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000); }
console.log('TL URL:', page.url());
console.log('round items:', await page.locator('[data-testid^="round-list-item"]').count());
console.log('do btns:', await page.locator('.ioe-exam-detail__do-btn').count());
await page.screenshot({ path: '/tmp/ioe-tl3.png' });
await browser.close();
