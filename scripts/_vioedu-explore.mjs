import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('/tmp/vioedu-caps', { recursive: true });
const browser = await chromium.launchPersistentContext('/tmp/vioedu-profile', { headless: true });
const page = browser.pages()[0] || await browser.newPage();
let ci = 0;
page.on('response', async r => {
  const u = r.url();
  if (!/api|graphql/i.test(u)) return;
  try {
    const b = await r.text();
    if (b.length > 500) { fs.writeFileSync(`/tmp/vioedu-caps/${String(ci++).padStart(3,'0')}-${(u.match(/\/api[^?]*/)||['x'])[0].replace(/\W+/g,'_').slice(0,60)}.json`, b); }
  } catch {}
});
await page.goto('https://vio.edu.vn/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const dong = page.getByText('Đóng').first();
if (await dong.count()) await dong.click().catch(()=>{});
if (await page.locator('input[placeholder*="đăng nhập" i]').count() || !(await page.getByText('Lê Duy Minh').count())) {
  await page.getByRole('button', { name: /Đăng nhập/ }).first().click().catch(()=>{});
  await page.waitForTimeout(3000);
  const ins = page.locator('input:visible');
  if (await ins.count() >= 2) { await ins.nth(0).fill(process.env.U); await page.locator('input[type=password]:visible').first().fill(process.env.PW); await page.locator('input[type=password]:visible').first().press('Enter'); await page.waitForTimeout(6000); }
}
console.log('url:', page.url());
// click "Vào Học"
await page.getByText('Vào Học').first().click().catch(()=>{});
await page.waitForTimeout(3000);
console.log('hoc url:', page.url());
await page.screenshot({ path: '/tmp/vioedu-hoc.png' });
console.log((await page.locator('body').innerText()).slice(0, 1000));
await browser.close();
