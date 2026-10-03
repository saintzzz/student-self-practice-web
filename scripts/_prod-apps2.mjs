import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
// TVC360 demo login
await page.goto('https://congcuso.vieschool.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.locator('text=/Đăng nhập/').first().click().catch(()=>{});
await page.waitForTimeout(4000);
const ins = page.locator('input');
console.log('tvc inputs:', await ins.count());
if (await ins.count() >= 2) {
  await ins.nth(0).fill('gv@demo.tvc');
  await ins.nth(1).fill('demo1234');
  await page.locator('button[type=submit], button:has-text("Đăng nhập")').first().click();
  await page.waitForTimeout(6000);
  console.log('after login:', page.url());
  console.log((await page.locator('body').innerText().catch(()=>'')).slice(0, 400));
}
await page.screenshot({ path: '/tmp/prod-tvc-loggedin.png' });
// So CN
await page.goto('https://sochunhiem.vieschool.com/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const ins2 = page.locator('input');
if (await ins2.count() >= 2) {
  await ins2.nth(0).fill('gvcn@demo.scn');
  await ins2.nth(1).fill('demo1234');
  await page.locator('button[type=submit], button:has-text("Đăng nhập")').first().click();
  await page.waitForTimeout(6000);
  console.log('scn after login:', page.url());
  console.log((await page.locator('body').innerText().catch(()=>'')).slice(0, 400));
}
await page.screenshot({ path: '/tmp/prod-scn-loggedin.png' });
await browser.close();
