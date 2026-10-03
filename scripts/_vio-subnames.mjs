import { chromium } from 'playwright';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
const r = await page.evaluate(async () => {
  const q = `query($subjectClass:String!){subjectClass(subjectClass:$subjectClass){id class subject{id name slug}}}`;
  const out = {};
  for (const sid of ['651a522d505c2f0019b2c52c','651a523472189d004c6c553b','6530a6ae5c23a000619a564b']) {
    const res = await fetch('/graphql', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({operationName:'sc', variables:{subjectClass:sid}, query:`query sc($subjectClass:String!){subjectClass(subjectClass:$subjectClass){id class subject{id name slug}}}`}), credentials:'include' });
    out[sid] = await res.json();
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await ctx.close();
