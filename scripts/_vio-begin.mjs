import { chromium } from 'playwright';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
const r = await page.evaluate(async () => {
  const headers = { 'Content-Type': 'application/json' };
  const post = async (p, b) => (await fetch(`/api/v1/universal-api/${p}`, { method:'POST', headers, body: JSON.stringify(b), credentials:'include' })).json();
  return await post('practice/begin-round', { roundId:'651a52442c79f400624f8b47', freeDates:'11/4/2024', freeTimes:'19h30-20h:2-3-4-5-6-7-8-9' });
});
console.log(JSON.stringify(r, null, 1).slice(0, 2000));
await ctx.close();
