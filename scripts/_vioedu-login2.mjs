import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/vioedu-profile', { headless: true });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://vio.edu.vn/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const dong = page.getByText('Đóng').first();
if (await dong.count()) await dong.click().catch(()=>{});
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /Đăng nhập/ }).first().click().catch(async ()=>{ await page.getByText('Đăng nhập').first().click(); });
await page.waitForTimeout(4000);
await page.screenshot({ path: '/tmp/vioedu-login2.png' });
const inputs = page.locator('input:visible');
const ni = await inputs.count();
console.log('visible inputs:', ni);
for (let i = 0; i < ni; i++) console.log(i, await inputs.nth(i).getAttribute('placeholder'), await inputs.nth(i).getAttribute('type'), await inputs.nth(i).getAttribute('name'));
if (ni >= 2) {
  await inputs.nth(0).fill(process.env.U);
  const pw = page.locator('input[type=password]:visible').first();
  await pw.fill(process.env.PW);
  await pw.press('Enter');
  await page.waitForTimeout(7000);
  console.log('after login URL:', page.url());
  console.log((await page.locator('body').innerText()).slice(0, 400));
  await page.screenshot({ path: '/tmp/vioedu-after.png' });
}
await browser.close();
