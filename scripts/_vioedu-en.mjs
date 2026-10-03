import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('/tmp/vioedu-caps', { recursive: true });
const browser = await chromium.launchPersistentContext('/tmp/vioedu-profile', { headless: true });
const page = browser.pages()[0] || await browser.newPage();
let ci = 100;
page.on('response', async r => {
  const u = r.url();
  if (!/api|graphql/i.test(u)) return;
  try {
    const b = await r.text();
    if (b.length > 500) fs.writeFileSync(`/tmp/vioedu-caps/${String(ci++).padStart(3,'0')}-${(u.match(/\/api[^?]*/)||['x'])[0].replace(/\W+/g,'_').slice(0,50)}.json`, b);
  } catch {}
});
await page.goto('https://vio.edu.vn/skill-list', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const dong = page.getByText('Đóng').first();
if (await dong.count()) await dong.click().catch(()=>{});
await page.getByText('Tiếng Anh').first().click().catch(e=>console.log('tab',e.message.slice(0,50)));
await page.waitForTimeout(4000);
console.log((await page.locator('body').innerText()).match(/Hôm nay bạn muốn[\s\S]{0,2500}/)?.[0]?.slice(0,1500));
await page.screenshot({ path: '/tmp/vioedu-en.png' });
await browser.close();
