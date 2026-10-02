import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/ioe-g1', { headless: false });
let setResp = null;
const page = browser.pages()[0] || await browser.newPage();
page.on('dialog', d => d.accept());
page.on('response', async r => { if (/setinfo/.test(r.url()) && r.url().includes('api-edu')) setResp = await r.text().catch(() => null); });
await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1500);
  const skip = page.locator('text=Để sau').first();
  if (await skip.count()) { await skip.click(); await page.waitForTimeout(3000); continue; }
  if (await page.locator('.ioe-exam-detail__do-btn').count() > 0) break;
}
await page.locator('.ioe-exam-detail__do-btn').first().click().catch(() => {});
for (let t = 0; t < 12 && !setResp; t++) await page.waitForTimeout(1000);
const set = JSON.parse(setResp);
const g = await browser.newPage();
await g.setViewportSize({ width: 1280, height: 720 });
g.on('request', r => {
  const u = r.url();
  if (u.includes('api-edu')) console.log('GREQ', u.split('/').pop(), '|', (r.postData() || '').replace(/eyJ[^"]*/g, 'JWT').slice(0, 400));
});
g.on('response', async r => {
  const u = r.url();
  if (/startgame|answercheck|finishGame/i.test(u)) console.log('GRESP', u.split('/').pop(), (await r.text().catch(() => '')).slice(0, 300));
});
await g.goto(set.data.urlgame, { waitUntil: 'domcontentloaded' });
await g.waitForTimeout(12000);
await g.mouse.click(640, 490); // OK button
await g.waitForTimeout(6000);
await g.screenshot({ path: '/tmp/g-start.png' });
// click first tile (crossbow game) - tiles around y=360-380, x spread
await g.mouse.click(500, 380);
await g.waitForTimeout(3000);
await g.mouse.click(590, 380);
await g.waitForTimeout(3000);
await g.mouse.click(680, 380);
await g.waitForTimeout(3000);
await g.screenshot({ path: '/tmp/g-play.png' });
await browser.close();
