import { chromium } from 'playwright';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
const reqs = [];
page.on('request', r => { if (r.url().includes('api/') || r.url().includes('graphql')) reqs.push({ u: r.url(), m: r.method(), b: r.postData()?.slice(0, 500) }); });
page.on('response', async r => { if (r.url().includes('api/') || r.url().includes('graphql')) { try { const j = await r.json(); const hit = reqs.find(q => q.u === r.url() && !q.res); if (hit) hit.res = JSON.stringify(j).slice(0, 800); } catch {} } });
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
// dismiss "đang trong vòng thi thử" banner if present by continuing? click it to resume - captures URL
const banner = page.locator('text=tiếp tục thi').first();
if (await banner.count()) { await banner.click().catch(()=>{}); await page.waitForTimeout(4000); }
console.log('URL after resume:', page.url());
// go back to practice, pick Toán Tiếng Anh tab & round 1
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
await page.locator('text=Thi thử Toán Tiếng Anh').first().click().catch(()=>{});
await page.waitForTimeout(3000);
console.log('URL after subject:', page.url());
reqs.length = 0;
await page.locator('text=Vòng 1').first().click().catch(()=>{});
await page.waitForTimeout(5000);
console.log('URL after round1:', page.url());
import fs from 'fs';
fs.writeFileSync('/tmp/vio-captures/round-click-reqs.json', JSON.stringify(reqs, null, 1));
console.log(JSON.stringify(reqs.map(r => ({u: r.u.replace('https://violympic.vn',''), b: r.b, res: r.res?.slice(0,300)})), null, 1));
await ctx.close();
