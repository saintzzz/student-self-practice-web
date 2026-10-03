import { chromium } from 'playwright';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
const subs = [];
page.on('request', r => { if (r.url().includes('submit') || r.url().includes('load-exam') || r.url().includes('begin-round')) subs.push({ u: r.url(), b: r.postData() }); });
await page.goto('https://violympic.vn/practice/651a52442c79f400624f8b43/651a52442c79f400624f8b45', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: '/tmp/vio-captures/exam-open.png' });
// dump visible answer buttons' aria-labels + a hint of which image each shows
const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button[aria-label]')];
  return btns.map(b => ({ label: b.getAttribute('aria-label'), img: b.querySelector('img')?.src ?? b.innerHTML.slice(0,120) }));
});
console.log(JSON.stringify(info, null, 1).slice(0, 3000));
fs.writeFileSync('/tmp/vio-captures/exam-open-info.json', JSON.stringify(info, null, 1));
await ctx.close();
