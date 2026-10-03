import { chromium } from 'playwright';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
const api = [];
page.on('response', async r => { if (r.url().includes('api/') || r.url().includes('graphql')) { try { api.push({ u: r.url().replace('https://violympic.vn',''), req: r.request().postData()?.slice(0,300), res: JSON.stringify(await r.json()).slice(0, 2000) }); } catch{} } });
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
// spam-answer remaining questions of open exam then submit-exam via API
const r = await page.evaluate(async () => {
  const headers = { 'Content-Type': 'application/json' };
  const post = async (p, b) => (await fetch(`/api/v1/universal-api/${p}`, { method:'POST', headers, body: JSON.stringify(b), credentials:'include' })).json();
  const examId = '651a52442c79f400624f8b45', roundId = '651a52442c79f400624f8b43';
  let d = await post('practice/load-exam', { examId, sourceType:'DESKTOP' });
  const seen = [];
  for (let i=0; i<30 && d?.currentQuestion; i++) {
    const q = d.currentQuestion;
    seen.push({ id: q._id, type: q.answerType });
    const answer = q.answers?.length ? { questionId: q._id, answerId: q.answers[0]._id } : { questionId: q._id, answerText: '0' };
    d = await post('practice/submit-single-answer', { examId, answer });
    if (d?.isLastQs) break;
  }
  const fin = await post('practice/submit-exam', { examId, roundId });
  return { seen, fin };
});
console.log('EXAM:', JSON.stringify(r).slice(0, 1200));
// open result page
await page.goto('https://violympic.vn/round-result/651a52442c79f400624f8b43', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: '/tmp/vio-captures/round-result.png' });
fs.writeFileSync('/tmp/vio-captures/result-apis.json', JSON.stringify(api, null, 1));
console.log(api.map(a => a.u).join('\n'));
await ctx.close();
