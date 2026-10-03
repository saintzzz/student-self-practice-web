import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/ioe-real-profile', { headless: true });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1500);
  const skip = page.locator('text=Để sau').first();
  if (await skip.count()) { await skip.click(); continue; }
  if (await page.locator('.ioe-exam-detail__do-btn').count() > 0) break;
}
// list first ~15 round items' text
const items = page.locator('[data-testid^="round-list-item"]');
const n = await items.count();
console.log('items:', n);
for (let i = 0; i < Math.min(n, 12); i++) {
  const t = (await items.nth(i).innerText().catch(()=>'')).replace(/\n/g,' | ').slice(0,80);
  console.log(i, ':', t);
}
// click item 0 (vòng 1?)
await items.nth(0).click().catch(e=>console.log('click err', e.message.slice(0,50)));
await page.waitForTimeout(6000);
console.log('after click URL text:', (await page.locator('body').innerText()).match(/Vòng Tự luyện \d+[^\n]*/)?.[0]);
console.log('do-btns now:', await page.locator('.ioe-exam-detail__do-btn').count());
await page.screenshot({path:'/tmp/ioe-r1.png'});
await browser.close();
