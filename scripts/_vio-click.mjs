import { chromium } from 'playwright';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
const reqs = [];
page.on('request', r => { if (r.url().includes('violympic') && (r.url().includes('api/') || r.url().includes('graphql'))) reqs.push({ u: r.url(), m: r.method(), b: r.postData()?.slice(0, 400) }); });
page.on('response', async r => { if (r.url().includes('api/') || r.url().includes('graphql')) { try { const j = await r.json(); const hit = reqs.find(q => q.u === r.url()); if (hit) hit.res = JSON.stringify(j).slice(0, 600); } catch {} } });
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
// click "Thi thử Toán Tiếng Anh" card / or the practice tab for math-english
await page.screenshot({ path: '/tmp/vio-captures/practice-page.png' });
const btns = await page.locator('a,button,div[role=button]').allTextContents();
console.log('clickables:', btns.filter(b => b.trim()).slice(0, 40));
await ctx.close();
