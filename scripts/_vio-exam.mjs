import { chromium } from 'playwright';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
let n = 300;
page.on('response', async (res) => {
  const u = res.url();
  if (u.includes('violympic') && (u.includes('graphql') || u.includes('/api') || u.includes('exam') || u.includes('question') || u.includes('round') || u.includes('practice'))) {
    try {
      const body = await res.text();
      fs.writeFileSync(`/tmp/vio-captures/${String(n).padStart(3,'0')}-${u.split('/').pop()?.slice(0,40) ?? 'x'}.json`, `${res.status()} ${u}\nREQ:${res.request().postData()?.slice(0,500) ?? ''}\n---\n${body}`);
      n++;
    } catch {}
  }
});
await page.goto('https://violympic.vn/practice/651a52442c79f400624f8b43/651a52442c79f400624f8b44', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
console.log('BODY:', (await page.locator('body').innerText().catch(()=>'')).slice(0, 1200));
// list every frame + look for canvas/iframes
console.log('FRAMES:', page.frames().map(f => f.url().slice(0,80)));
await page.screenshot({ path: '/tmp/vio-exam.png' });
await page.waitForTimeout(5000);
await ctx.close();
