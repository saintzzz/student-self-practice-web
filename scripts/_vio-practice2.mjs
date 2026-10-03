import { chromium } from 'playwright';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
let n = 200;
page.on('response', async (res) => {
  const u = res.url();
  if (!u.includes('graphql')) return;
  try {
    const body = await res.text();
    const post = res.request().postData() ?? '';
    const op = post.match(/"operationName"\s*:\s*"([^"]+)"/)?.[1] ?? `op${n}`;
    fs.writeFileSync(`/tmp/vio-captures/${String(n).padStart(3,'0')}-${op}.res.json`, body);
    fs.writeFileSync(`/tmp/vio-captures/${String(n).padStart(3,'0')}-${op}.req.json`, post.slice(0, 4000));
    n++;
  } catch {}
});
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
await page.locator('text=Thi thử Toán Tiếng Anh').first().click();
await page.waitForTimeout(3000);
console.log('SUBJECT BODY:', (await page.locator('body').innerText().catch(()=>'')).match(/Cấp Trường[\s\S]{0,400}/)?.[0]);
// click free round Vòng 1
await page.locator('text=Vòng 1').first().click();
await page.waitForTimeout(4000);
console.log('URL:', page.url());
console.log('ROUND BODY:', (await page.locator('body').innerText().catch(()=>'')).slice(0, 1500));
await page.screenshot({ path: '/tmp/vio-round1.png' });
await ctx.close();
