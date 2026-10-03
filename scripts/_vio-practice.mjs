import { chromium } from 'playwright';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
let n = 100;
page.on('response', async (res) => {
  const u = res.url();
  if (!u.includes('graphql')) return;
  try {
    const body = await res.text();
    const post = res.request().postData() ?? '';
    const op = post.match(/"operationName"\s*:\s*"([^"]+)"/)?.[1] ?? `op${n}`;
    fs.writeFileSync(`/tmp/vio-captures/${String(n).padStart(3,'0')}-${op}.res.json`, body);
    fs.writeFileSync(`/tmp/vio-captures/${String(n).padStart(3,'0')}-${op}.req.json`, post.slice(0, 3000));
    n++;
  } catch {}
});
await page.goto('https://violympic.vn/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
await page.locator('button:has-text("Đóng")').first().click().catch(() => {});
await page.waitForTimeout(1000);
await page.locator('text=Thi thử ngay').first().click().catch(() => {});
await page.waitForTimeout(6000);
console.log('URL:', page.url());
console.log('BODY:', (await page.locator('body').innerText().catch(()=>'')).slice(0, 2000));
await page.screenshot({ path: '/tmp/vio-thithu.png' });
await ctx.close();
