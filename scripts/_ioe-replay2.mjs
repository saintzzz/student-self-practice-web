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
await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1500);
  const skip = page.locator('text=Để sau').first();
  if (await skip.count()) { await skip.click(); continue; }
  if (await page.locator('[data-testid^="round-list-item"]').count() > 0) break;
}
const items = page.locator('[data-testid^="round-list-item"]');
const n = await items.count();
console.log('items:', n);
for (let i = 0; i < Math.min(n, 14); i++) {
  const t = (await items.nth(i).innerText().catch(()=>'')).replace(/\n/g,' | ').slice(0,90);
  console.log(i, ':', t);
}
for (const idx of [0, 3]) {
  await items.nth(idx).click().catch(e=>console.log('click',idx,'err',e.message.slice(0,50)));
  await page.waitForTimeout(5000);
  console.log('item', idx, '-> label:', (await page.locator('body').innerText()).match(/Vòng Tự luyện \d+[^\n]*/)?.[0], '| do-btns:', await page.locator('.ioe-exam-detail__do-btn').count());
}
await page.screenshot({path:'/tmp/ioe-r2.png'});
await browser.close();
