import { chromium } from 'playwright';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
const api = [];
page.on('response', (res) => {
  const u = res.url();
  if (u.includes('graphql') || u.includes('/api/') || u.includes('question') || u.includes('exam')) api.push(`${res.status()} ${u.slice(0,120)}`);
});
await page.goto('https://violympic.vn/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
await page.locator('#username').fill(process.env.VIO_USER ?? '');
await page.locator('#password').fill(process.env.VIO_PASS ?? '');
await page.locator('button[type="submit"], button:has-text("Đăng nhập")').first().click();
await page.waitForTimeout(8000);
console.log('URL:', page.url());
console.log('BODY:', (await page.locator('body').innerText().catch(()=>'')).slice(0, 600));
console.log('API:', api.join('\n'));
await page.screenshot({ path: '/tmp/vio-logged.png' });
await ctx.close();
