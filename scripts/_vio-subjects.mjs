import { chromium } from 'playwright';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
const gql = [];
page.on('response', async r => { if (r.url().includes('graphql')) { try { const req = JSON.parse(r.request().postData() ?? '{}'); gql.push({ op: req.operationName, vars: req.variables, res: JSON.stringify(await r.json()).slice(0, 4000) }); } catch{} } });
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
// click each subject tab to trigger its rounds query
for (const name of ['Toán Tiếng Anh', 'Tiếng Việt', 'Khoa học', 'Toán']) {
  const t = page.locator(`text=${name}`).first();
  if (await t.count()) { await t.click().catch(()=>{}); await page.waitForTimeout(2500); }
}
fs.writeFileSync('/tmp/vio-captures/subjects-gql.json', JSON.stringify(gql, null, 1));
console.log(gql.map(g => g.op + ' ' + JSON.stringify(g.vars)).join('\n'));
await ctx.close();
