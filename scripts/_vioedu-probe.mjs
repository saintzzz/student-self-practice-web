import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/vioedu-profile', { headless: true });
const page = browser.pages()[0] || await browser.newPage();
for (const u of ['https://vio.edu.vn', 'https://vioedu.vn']) {
  try { await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 }); console.log(u, '->', page.url()); break; }
  catch (e) { console.log(u, 'fail', e.message.slice(0,80)); }
}
await page.waitForTimeout(6000);
console.log('title:', await page.title());
const txt = (await page.locator('body').innerText()).slice(0, 800);
console.log(txt);
await page.screenshot({ path: '/tmp/vioedu.png' });
await browser.close();
