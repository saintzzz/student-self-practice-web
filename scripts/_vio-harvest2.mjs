// Violympic practice harvester v2
// - begin-round / resume to get examId, play through exams via submit-single-answer,
//   chain nextExam until round done, then next round.
// - Learns MCQ answer keys by rotating untried options per question _id.
// - MATCHING pairs decoded from filename suffix _N_0/_N_1 (matchingAnswers wrapper).
// - ORDERING taps items until isCorrect (oracle per tap).
// Usage: ROUNDS="id1,id2" MAXEXAMS=6 node scripts/_vio-harvest2.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const ROUNDS = (process.env.ROUNDS ?? '651a52442c79f400624f8b43').split(',');
const MAX_EXAMS = Number(process.env.MAXEXAMS ?? '4');
const OUT = process.env.OUT ?? '/tmp/vio-captures/bank-math-en.json';
const bank = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : { questions: {}, exams: 0 };

const ctx = await chromium.launchPersistentContext('/tmp/vio-harvest', { headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://violympic.vn/practice', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);

const record = (q, type, extra = {}) => {
  const e = (bank.questions[q._id] ??= { type, q, tried: {}, correctIds: [], ...extra });
  e.q = q;
  return e;
};

async function playExam(examId, roundId, tag) {
  // build picks: for each known MCQ question, choose first untried answer; remember all option ids
  const picks = {}, triedSeen = {};
  for (const [qid, e] of Object.entries(bank.questions)) {
    if (e.solvedId) picks[qid] = e.solvedId;
    else if ((e.type === 'MULTI_CHOICE' || e.type === 'MULTI_CHOICE_NEW') && !e.correctIds?.length) {
      const untried = (e.q.answers ?? []).filter(a => !(a._id in (e.tried ?? {})));
      if (untried.length) picks[qid] = untried[0]._id;
    }
  }
  const log = await page.evaluate(async ({ examId, roundId, picks, bankq }) => { const __BANKQ__ = bankq;
    const __PICKS__ = picks; const __TEXTS__ = {}; for (const [k,e] of Object.entries(__BANKQ__)) { if (e.solvedText) __TEXTS__[k] = e.solvedText; }
    const headers = { 'Content-Type': 'application/json' };
    const post = async (p, b) => {
      const r = await fetch(`/api/v1/universal-api/${p}`, { method: 'POST', headers, body: JSON.stringify(b), credentials: 'include' });
      return r.json();
    };
    const steps = [];
    let d = await post('practice/load-exam', { examId, sourceType: 'DESKTOP' });
    if (!d?.currentQuestion) return { steps, err: d };
    for (let i = 0; i < 30 && d?.currentQuestion; i++) {
      const q = d.currentQuestion;
      const type = q.answerType;
      if (type === 'MATCHING') {
        const groups = {};
        for (const a of q.matchingAnswers ?? q.matchingAnswersGroups ?? []) {
          const m = (a.image?.path ?? '').match(/_(\d+)_(\d)\D/);
          if (m) (groups[m[1]] ??= {})[m[2]] = a._id;
        }
        for (const g of Object.values(groups)) {
          if (!g[0] || !g[1]) continue;
          const resp = await post('practice/submit-single-answer', { examId, answer: { questionId: q._id, matchingAnswers: { answerId1: g[0], answerId2: g[1] } } });
          steps.push({ q, type, answer: [g[0], g[1]], isCorrect: resp?.isCorrect });
          if (resp?.currentQuestion) d = { ...d, ...resp };
          if (resp?.isLastQs || resp?.lives === 0) break;
        }
      } else if (type === 'ORDERING' || type === 'GAME_ORDERING') {
        // tap each remaining item in listed order; isCorrect locks position
        const done = [];
        let alive = true;
        for (const a of q.orderedAnswers ?? []) {
          const resp = await post('practice/submit-single-answer', { examId, answer: { questionId: q._id, answerId: a._id } });
          steps.push({ q, type, answer: a._id, text: a.text, isCorrect: resp?.isCorrect });
          done.push({ id: a._id, text: a.text, ok: resp?.isCorrect });
          if (resp?.currentQuestion && resp.currentQuestion._id !== q._id) { d = { ...d, ...resp }; }
          if (resp?.isLastQs || resp?.lives === 0) { alive = false; break; }
        }
        if (!alive) break;
      } else if (type === 'MULTI_CHOICE' || type === 'MULTI_CHOICE_NEW') {
        // pick is decided outside; here default to first (script rotates via `pick` map passed in)
        const pick = {}[q._id] ?? q.answers?.[0]?._id;
        const resp = await post('practice/submit-single-answer', { examId, answer: { questionId: q._id, answerId: pick } });
        steps.push({ q, type, answer: pick, isCorrect: resp?.isCorrect });
        d = { ...d, ...resp };
        if (resp?.isLastQs || resp?.lives === 0) break;
      } else {
        const resp = await post('practice/submit-single-answer', { examId, answer: { questionId: q._id, answerText: String({}[q._id] ?? '0') } });
        steps.push({ q, type, answer: 'text', isCorrect: resp?.isCorrect });
        d = { ...d, ...resp };
        if (resp?.isLastQs || resp?.lives === 0) break;
      }
      if (d?.isLastQs || d?.lives === 0) break;
    }
    const fin = await post('practice/submit-exam', { examId, roundId });
    return { steps, fin };
  }, { examId, roundId, picks, bankq: bank.questions })
  .catch(e => ({ err: String(e) }));

  for (const s of log.steps ?? []) {
    const e = record(s.q, s.type);
    if (s.type === 'MATCHING' && s.answer) (e.pairs ??= []).push({ ids: s.answer, ok: s.isCorrect });
    else if (s.type === 'MULTI_CHOICE' || s.type === 'MULTI_CHOICE_NEW') {
      if (s.answer) { e.tried[s.answer] = s.isCorrect; if (s.isCorrect && !e.correctIds.includes(s.answer)) e.correctIds.push(s.answer); if (e.solvedId && s.answer === e.solvedId) e.verified = s.isCorrect === true; }
    } else if (s.type === 'ORDERING' || s.type === 'GAME_ORDERING') {
      (e.taps ??= []).push({ id: s.answer, text: s.text, ok: s.isCorrect });
      if (e.solvedText && String(s.answer) === String(e.solvedText)) e.verified = s.isCorrect === true;
    }
  }
  const nQ = new Set((log.steps ?? []).map(s => s.q?._id)).size;
  const nOk = (log.steps ?? []).filter(s => s.isCorrect === true).length;
  console.log(`${tag} exam ${examId.slice(-4)}: ${nQ} questions, ${nOk} correct steps${log.err ? ' ERR ' + JSON.stringify(log.err).slice(0, 200) : ''}${log.fin ? ' score=' + log.fin.score + '/' + (log.fin.totalScore ?? '?') : ''}`);
  fs.writeFileSync(OUT, JSON.stringify(bank));
  return log.fin?.nextExam ?? null;
}

for (const roundId of ROUNDS) {
  // begin-round (or resume)
  let examId = await page.evaluate(async (roundId) => {
    const headers = { 'Content-Type': 'application/json' };
    const r = await fetch('/api/v1/universal-api/practice/begin-round', { method: 'POST', headers, body: JSON.stringify({ roundId, freeDates: '11/4/2024', freeTimes: '19h30-20h:2-3-4-5-6-7-8-9' }), credentials: 'include' });
    const j = await r.json();
    return j?.resume?.examId ?? j?.examId ?? j?.exam?.id ?? j?.nextExam ?? null;
  }, roundId);
  if (!examId) { console.log('round', roundId.slice(-4), 'no examId'); continue; }
  let n = 0;
  while (examId && n++ < MAX_EXAMS) {
    examId = await playExam(examId, roundId, `r${roundId.slice(-4)}`);
    await page.waitForTimeout(800);
  }
}
const qs = Object.values(bank.questions);
console.log('TOTAL:', qs.length, 'questions | MCQ keyed:', qs.filter(q => q.correctIds?.length).length, '| matching paired:', qs.filter(q => q.pairs?.some(p => p.ok)).length);
await ctx.close();
