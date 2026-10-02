import { chromium } from 'playwright';
const PROFILE = process.env.P;
const USER = process.env.U, PW = process.env.PW;
const browser = await chromium.launchPersistentContext(PROFILE, { headless: false });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://ioe.vn/sso/login?returnUrl=%2Fhoc-sinh', { waitUntil: 'domcontentloaded' });
for (let t = 0; t < 30; t++) {
  await page.waitForTimeout(1500);
  const n = await page.locator('input').count();
  if (n >= 2) break;
  if (page.url().includes('ioe.vn/hoc-sinh')) break;
}
console.log('inputs:', await page.locator('input').count(), 'url:', page.url());
for (let i = 0; i < await page.locator('input').count(); i++) {
  const el = page.locator('input').nth(i);
  console.log(i, await el.getAttribute('type'), await el.getAttribute('placeholder'), await el.getAttribute('name'));
}
await page.screenshot({ path: '/tmp/ioe-login-debug.png' });
const usr = page.locator('input[type=text], input:not([type])').first();
if (await usr.count()) {
  await usr.fill(USER);
  await page.locator('input[type=password]').first().fill(PW);
  await page.locator('button:has-text("Đăng nhập")').first().click().catch(async()=>{ await page.locator('button[type=submit]').first().click(); });
  for (let t = 0; t < 25; t++) {
    await page.waitForTimeout(1500);
    const skip = page.locator('text=Để sau').first();
    if (await skip.count()) { await skip.click().catch(()=>{}); continue; }
    if (page.url().includes('ioe.vn')) break;
  }
}
console.log('after login url:', page.url());
await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' });
for (let t = 0; t < 15; t++) { await page.waitForTimeout(1500); if (await page.locator('.ioe-exam-detail__do-btn').count()) break; }
console.log('do-btns:', await page.locator('.ioe-exam-detail__do-btn').count());
await browser.close();
