// Codex polish pass: re-words + fine-tunes items previously drafted by
// weaker free models. For each batch of pending rows, codex returns either
// a polished item (same type/intent) or {"drop":true} when unfixable.
// Usage: node scripts/polish-codex.mjs [--grades 1] [--workers 3] [--limit 500] [--dry]
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const GRADES = (arg('--grades', '1,2,3,4,5')).split(',').map(Number);
const WORKERS = Number(arg('--workers', '3'));
const LIMIT = Number(arg('--limit', '0')); // 0 = all pending
const BATCH = Number(arg('--batch', '10'));

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };
const HW = { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json', Prefer: 'count=exact' };

async function fetchPending() {
  const rows = [];
  for (const g of GRADES) {
    let off = 0;
    for (;;) {
      const res = await fetch(
        `${URL}/rest/v1/qb_questions?select=id,grade,question_type,prompt_text,choices,answer,explanation_vi,learning_objective,passage,statement,tokens` +
        `&grade=eq.${g}&subject=eq.english&review_status=eq.machine-editorial-reviewed-human-academic-signoff-required` +
        `&order=id&offset=${off}&limit=1000`,
        { headers: H });
      if (!res.ok) throw new Error('fetch ' + res.status);
      const chunk = await res.json();
      rows.push(...chunk);
      if (chunk.length < 1000 || (LIMIT && rows.length >= LIMIT)) break;
      off += 1000;
    }
    if (LIMIT && rows.length >= LIMIT) break;
  }
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

function slim(row) {
  const o = { i: row.id, t: row.question_type, q: row.prompt_text };
  if (row.choices) o.c = row.choices;
  if (row.answer) o.a = row.answer;
  if (row.explanation_vi) o.ex = row.explanation_vi;
  if (row.learning_objective) o.lo = row.learning_objective;
  if (row.passage) o.passage = row.passage;
  if (row.statement) o.statement = row.statement;
  if (row.tokens) o.tokens = row.tokens;
  return o;
}

function promptFor(grade, items) {
  return `You are a senior Vietnamese primary-English editor polishing quiz items drafted by a weaker AI, for grade-${grade} Vietnamese kids (Global Success).
Each input item has fields: i=id, t=type(mcq|reorder|true-false|text-answer|word-to-image-mcq|image-to-word-mcq), q=prompt, c=choices, a=answer, ex=Vietnamese explanation, lo=objective, passage/statement/tokens where relevant.

For EVERY item output a JSON object:
{"i":"<same id>","q":"<polished prompt>","c":[...],"a":{...},"ex":"...","lo":"...","passage":"...","statement":"...","tokens":[...]}
OR {"i":"<id>","drop":true} if the item is unfixable: ambiguous, multiple defensible answers, nonsense, image-dependent prompt with no image, or pedagogically wrong for the grade.

POLISH RULES:
- exactly ONE defensible correct answer; rewrite distractors if two options can both fit (e.g. plural nouns together, synonyms, "big/nice" subjective clues)
- keep the same question type and the same learning intent - reword, do not replace the topic
- prompts must be self-contained text; no "look at the picture" phrasing unless type is *-image-* (those have real images)
- for word-to-image-mcq / image-to-word-mcq keep choices/a as-is unless wording of q needs polish
- reorder: ensure tokens join to EXACTLY the answer text (same words, punctuation aside)
- true-false: statement must be provably true/false from the passage alone
- ex: kid-friendly Vietnamese explaining WHY correct + why key distractor fails; hyphen '-' only, no em-dash
- fix grammar/spelling in q, c, a, ex
- output ONLY a raw JSON array, same order as input, one object per item

ITEMS:
${JSON.stringify(items, null, 0)}`;
}

function codexRun(prompt) {
  return new Promise((resolve, reject) => {
    const p = spawn('codex.cmd', ['exec', '--skip-git-repo-check'], { cwd: process.cwd(), shell: true, windowsHide: true });
    let out = '', err = '';
    const kill = setTimeout(() => { p.kill(); reject(new Error('codex-timeout')); }, 300000);
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => { clearTimeout(kill); reject(e); });
    p.on('close', (code) => { clearTimeout(kill); code === 0 ? resolve(out) : reject(new Error(`exit-${code}: ${err.slice(0, 160)}`)); });
    p.stdin.write(prompt);
    p.stdin.end();
  });
}

function parseOut(stdout) {
  const m = stdout.match(/\[[\s\S]*\]/g);
  if (!m) throw new Error('no-json');
  for (let i = m.length - 1; i >= 0; i--) {
    try { const arr = JSON.parse(m[i]); if (Array.isArray(arr) && arr.length) return arr; } catch { }
  }
  throw new Error('parse-fail');
}

async function patch(row, fix) {
  const body = {};
  if (typeof fix.q === 'string') body.prompt_text = fix.q.slice(0, 500);
  if (Array.isArray(fix.c)) body.choices = fix.c;
  if (fix.a && typeof fix.a === 'object') body.answer = fix.a;
  if (typeof fix.ex === 'string') body.explanation_vi = fix.ex.slice(0, 500);
  if (typeof fix.lo === 'string') body.learning_objective = fix.lo.slice(0, 200);
  if (typeof fix.passage === 'string') body.passage = fix.passage;
  if (typeof fix.statement === 'string') body.statement = fix.statement;
  if (Array.isArray(fix.tokens)) body.tokens = fix.tokens;
  body.review_status = 'codex-polished-human-signoff-required';
  if (!Object.keys(body).length) return 'noop';
  const res = await fetch(`${URL}/rest/v1/qb_questions?id=eq.${row.id}`, { method: 'PATCH', headers: HW, body: JSON.stringify(body) });
  return res.ok ? 'ok' : 'err-' + res.status;
}

async function rejectRow(id) {
  await fetch(`${URL}/rest/v1/qb_questions?id=eq.${id}`, {
    method: 'PATCH', headers: HW,
    body: JSON.stringify({ review_status: 'rejected', publication_policy: { examEligible: false, mockEligible: false, practiceEligible: false, commercialReleaseEligible: false, requiresHumanApprovalForExam: false, requiresHumanApprovalForCommercialRelease: false } }),
  });
}

const pending = await fetchPending();
console.log(`pending to polish: ${pending.length}`);
if (DRY && pending.length) {
  const batch = pending.slice(0, BATCH);
  const out = parseOut(await codexRun(promptFor(batch[0].grade, batch.map(slim))));
  console.log(JSON.stringify(out.slice(0, 4), null, 1));
  process.exit(0);
}

const queue = [];
for (let i = 0; i < pending.length; i += BATCH) queue.push(pending.slice(i, i + BATCH));
let done = 0, polished = 0, dropped = 0, failed = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (queue.length) {
    const batch = queue.shift();
    try {
      const out = parseOut(await codexRun(promptFor(batch[0].grade, batch.map(slim))));
      const byId = new Map(out.map((o) => [o.i, o]));
      for (const row of batch) {
        const fix = byId.get(row.id);
        if (!fix) { failed++; continue; }
        if (fix.drop) { await rejectRow(row.id); dropped++; continue; }
        const r = await patch(row, fix);
        r === 'ok' ? polished++ : failed++;
      }
    } catch (e) {
      failed += batch.length;
      console.log(`  batch fail: ${String(e.message ?? e).slice(0, 100)}`);
    }
    done++;
    if (done % 5 === 0) console.log(`  ${done}/${queue.length + done} batches | polished=${polished} dropped=${dropped} failed=${failed}`);
  }
}));
console.log(`DONE polish: ${polished} polished, ${dropped} dropped, ${failed} failed`);
