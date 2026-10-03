import { chromium } from 'playwright';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
const apiLog = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('graphql') || url.includes('/api/')) {
    apiLog.push(`${res.status()} ${url}`);
  }
});
await page.goto('https://violympic.vn/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
console.log('URL:', page.url());
const txt = await page.locator('body').innerText().catch(() => '');
console.log('BODY:', txt.slice(0, 800));
const inputs = await page.locator('input').evaluateAll(els => els.map(e => ({type: e.type, ph: e.placeholder, name: e.name})));
console.log('INPUTS:', JSON.stringify(inputs));
await page.screenshot({ path: '/tmp/vio-home.png' });
await ctx.close();
