import { chromium } from 'playwright';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
const subs = [];
page.on('request', r => { if (r.url().includes('submit-single-answer') || r.url().includes('submit-exam')) subs.push({ u: r.url().replace('https://violympic.vn',''), b: r.postData() }); });
page.on('response', async r => { if (r.url().includes('submit-single-answer')) { try { subs.push({ res: JSON.stringify(await r.json()).slice(0,1500) }); } catch{} } });
await page.goto('https://violympic.vn/practice/651a52442c79f400624f8b43/651a52442c79f400624f8b45', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
// answer "48+31=79" then click submit
await page.fill('input[placeholder*="answer" i], input[type=text]', '79');
await page.waitForTimeout(500);
await page.locator('button:has-text("Submit answer")').first().click().catch(async () => {
  await page.keyboard.press('Enter');
});
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/vio-captures/after-submit.png' });
fs.writeFileSync('/tmp/vio-captures/submit-capture.json', JSON.stringify(subs, null, 1));
console.log(JSON.stringify(subs, null, 1));
await ctx.close();
