import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
for (const u of ['https://congcuso.vieschool.com', 'https://sochunhiem.vieschool.com']) {
  await page.goto(u, { waitUntil: 'domcontentloaded' }).catch(e => console.log(u, 'ERR', e.message.slice(0,60)));
  await page.waitForTimeout(6000);
  console.log('=====', u, '->', page.url());
  console.log((await page.locator('body').innerText().catch(()=>'')).slice(0, 500));
  await page.screenshot({ path: `/tmp/prod-${u.split('//')[1].split('.')[0]}.png` });
}
await browser.close();
