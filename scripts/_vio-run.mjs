import { chromium } from 'playwright';
import fs from 'fs';
const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);

const out = await page.evaluate(async (examId) => {
  const headers = { 'Content-Type': 'application/json' };
  const post = async (path, body) => {
    const r = await fetch(`/api/v1/universal-api/${path}`, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
    return r.json();
  };
  const log = [];
  let data = await post('practice/load-exam', { examId, sourceType: 'DESKTOP' });
  log.push({ step: 'load', data });
  for (let i = 0; i < 30 && data?.currentQuestion; i++) {
    const q = data.currentQuestion;
    let answer = { questionId: q._id ?? q.id };
    if (q.answerType === 'MATCHING' && q.matchingAnswers?.length >= 2) {
      answer = { ...answer, answerId1: q.matchingAnswers[0]._id, answerId2: q.matchingAnswers[1]._id };
    } else if (q.answers?.length) {
      answer = { ...answer, answerId: q.answers[0]._id ?? q.answers[0].id };
    } else {
      answer = { ...answer, answerText: '0' };
    }
    data = await post('practice/submit-single-answer', { examId, answer });
    log.push({ q, answer, resp: data });
    if (data?.isLastQs) break;
  }
  return log;
}, '651a52442c79f400624f8b44');

fs.writeFileSync('/tmp/vio-captures/run1.json', JSON.stringify(out, null, 1));
console.log('STEPS:', out.length);
console.log(JSON.stringify(out[1], null, 1).slice(0, 2500));
await ctx.close();
