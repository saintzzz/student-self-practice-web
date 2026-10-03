// Violympic practice harvester: replays free rounds, answers via
// matching-filename pairs / rotating MCQ cursor, records every question
// + submit verdict into /tmp/vio-captures/bank.json
import { chromium } from 'playwright';
import fs from 'fs';

const ROUND_IDS = process.env.ROUNDS
  ? process.env.ROUNDS.split(',')
  : ['651a52442c79f400624f8b43']; // math-english round 1
const PASSES = Number(process.env.PASSES ?? '8');
const OUT = '/tmp/vio-captures/bank.json';
const state = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : { questions: {}, runs: 0 };

function hexPlus(id, n) {
  return (BigInt('0x' + id) + BigInt(n)).toString(16).padStart(24, '0');
}

function pickMcq(q, seen) {
  const tried = seen[q._id]?.tried ?? {};
  const untried = q.answers.filter(a => !(a._id in tried));
  const pick = untried[0] ?? q.answers[0];
  return pick?._id ?? pick?.id;
}

const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);

for (const roundId of ROUND_IDS) {
  const examId = hexPlus(roundId, 1);
  for (let pass = 0; pass < PASSES; pass++) {
    try {
      const log = await page.evaluate(async ({ examId, roundId, state }) => {
        const headers = { 'Content-Type': 'application/json' };
        const post = async (path, body) => {
          const r = await fetch(`/api/v1/universal-api/${path}`, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
          return r.json();
        };
        const log = [];
        let data = await post('practice/load-exam', { examId, sourceType: 'DESKTOP' });
        if (!data?.currentQuestion) return [{ err: 'load-failed', data }];
        for (let i = 0; i < 40 && data?.currentQuestion; i++) {
          const q = data.currentQuestion;
          let answers = [];
          if (q.answerType === 'MATCHING') {
            // pair left(_N_0) with right(_N_1) by filename suffix
            const groups = {};
            for (const a of q.matchingAnswers ?? []) {
              const m = (a.image?.path ?? '').match(/_(\d+)_(\d)\D/);
              if (!m) continue;
              (groups[m[1]] ??= {})[m[2]] = a._id;
            }
            for (const g of Object.values(groups)) {
              if (g[0] && g[1]) answers.push({ questionId: q._id, answerId1: g[0], answerId2: g[1] });
            }
          } else if (q.answers?.length) {
            const tried = state.questions[q._id]?.tried ?? {};
            const untried = q.answers.filter(a => !(a._id in tried));
            const pick = untried[0] ?? q.answers[0];
            answers.push({ questionId: q._id, answerId: pick?._id ?? pick?.id });
          } else if (q.answerType === 'TEXT') {
            answers.push({ questionId: q._id, answerText: '0' });
          } else {
            answers.push({ questionId: q._id, answerText: '0' });
          }
          for (const answer of answers) {
            const resp = await post('practice/submit-single-answer', { examId, answer });
            log.push({ qid: q._id, answerType: q.answerType, q, answer, isCorrect: resp?.isCorrect, status: resp?.status });
            if (resp?.currentQuestion) data = { ...data, ...resp, currentQuestion: resp.currentQuestion };
            else if (q.answerType !== 'MATCHING') data = { ...data, ...resp };
            if (resp?.isLastQs || resp?.lives === 0) break;
          }
          if (data?.isLastQs || data?.lives === 0) break;
          if (q.answerType !== 'MATCHING' && !data?.currentQuestion) break;
        }
        const fin = await post('practice/submit-exam', { examId, roundId }).catch(() => null);
        log.push({ step: 'submit-exam', resp: fin });
        return log;
      }, { examId, roundId, state });

      // merge into bank
      for (const step of log) {
        if (!step.qid) continue;
        const e = (state.questions[step.qid] ??= { roundId, type: step.answerType, q: step.q, tried: {}, correctIds: [] });
        const aid = step.answer.answerId;
        if (aid) {
          e.tried[aid] = step.isCorrect;
          if (step.isCorrect === true && !e.correctIds.includes(aid)) e.correctIds.push(aid);
        }
        if (step.answerType === 'MATCHING' && step.answer.answerId1)
          e.pairs = [...(e.pairs ?? []), [step.answer.answerId1, step.answer.answerId2, step.isCorrect]];
      }
      state.runs++;
      const ok = log.filter(s => s.isCorrect === true).length;
      console.log(`round ${roundId.slice(-4)} pass ${pass}: ${log.length} steps, ${ok} correct`);
      fs.writeFileSync(OUT, JSON.stringify(state));
      await page.waitForTimeout(1200);
    } catch (e) {
      console.log('pass err:', String(e).slice(0, 200));
      await page.waitForTimeout(2000);
    }
  }
}
console.log('TOTAL UNIQUE QUESTIONS:', Object.keys(state.questions).length);
console.log('WITH ANSWER:', Object.values(state.questions).filter(q => q.correctIds?.length || q.pairs?.length).length);
await ctx.close();
