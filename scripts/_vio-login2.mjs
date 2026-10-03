import { chromium } from 'playwright';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://violympic.vn/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
// close the modal overlay first
await page.locator('button:has-text("Đóng")').first().click().catch(() => {});
await page.waitForTimeout(1500);
await page.locator('text=Đăng nhập').first().click();
await page.waitForTimeout(4000);
console.log('URL:', page.url());
const inputs = await page.locator('input').evaluateAll(els => els.map(e => ({type: e.type, ph: e.placeholder, name: e.name, id: e.id})));
console.log('INPUTS:', JSON.stringify(inputs));
await page.screenshot({ path: '/tmp/vio-login.png' });
await ctx.close();
