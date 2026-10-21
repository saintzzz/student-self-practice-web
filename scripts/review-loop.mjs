// File-based review loop for the question bank (design: one chunk per call,
// sequential - the gemini-web channel cannot take parallel load).
//
// Modes:
//   polish : pending items -> reviewer fixes or drops (same contract as polish-codex)
//   repair : items rejected by verify-codex -> reviewer gets the "why" and repairs
//            them back into the verify candidate pool (loop until pass, bounded)
//
// Every call: input chunk -> scripts/.tmp-cdp/reviewloop-<ts>/in-NNNN.json,
// raw response -> out-NNNN.txt. On parse/call fail the chunk splits in half
// (maxdepth) and retries; single-item chronic fails land in failed.jsonl and
// stay pending in DB - nothing is lost.
//
// Usage:
//   node scripts/review-loop.mjs [--mode polish|repair] [--provider auto|gemini|codex]
//       [--chunk 15] [--gap 8] [--limit 0] [--maxsplit 3] [--round 1]
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLlmChannel, parseJsonArray } from './llm-channel.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const MODE = arg('--mode', 'polish');
const PROVIDER = arg('--provider', 'gemini');
const CHUNK = Number(arg('--chunk', '15'));
const GAP = Number(arg('--gap', '8')) * 1000;
const LIMIT = Number(arg('--limit', '0'));
const MAXSPLIT = Number(arg('--maxsplit', '3'));
const ROUND = arg('--round', '1');
const GRADES = (arg('--grades', '1,2,3,4,5')).split(',').map(Number);

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };
const HW = { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json', Prefer: 'count=exact' };

const PENDING_STATUS = 'machine-editorial-reviewed-human-academic-signoff-required';
const POLISHED_STATUS = 'llm-polished-human-signoff-required';
const CANDIDATE_POLICY = { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: true };
const REJECT_POLICY = { examEligible: false, mockEligible: false, practiceEligible: false, commercialReleaseEligible: false, requiresHumanApprovalForExam: false, requiresHumanApprovalForCommercialRelease: false };

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const DIR = join(HERE, '.tmp-cdp', `reviewloop-${MODE}-r${ROUND}-${ts}`);
mkdirSync(DIR, { recursive: true });
const FAILJSONL = join(DIR, 'failed.jsonl');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPending() {
  const rows = [];
  for (const g of GRADES) {
    let off = 0;
    for (;;) {
      const res = await fetch(
        `${URL}/rest/v1/qb_questions?select=id,grade,question_type,prompt_text,choices,answer,explanation_vi,learning_objective,passage,statement,tokens` +
        `&grade=eq.${g}&subject=eq.english&review_status=eq.${PENDING_STATUS}` +
        `&order=id&offset=${off}&limit=1000`, { headers: H });
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

async function fetchRejected() {
  // input: verify run's drop list (id + why). If the file is missing (verify
  // was killed mid-run) fall back to the rejected pool directly with a generic
  // reason - the verifier re-judges them after repair anyway.
  const dropFile = join(HERE, 'gen-bulk-out', 'codex-verify-drop.json');
  let drops = existsSync(dropFile) ? JSON.parse(readFileSync(dropFile, 'utf8')) : [];
  const why = new Map(drops.map((d) => [d.id, d.why]));
  if (!drops.length) {
    console.log('drop file empty/missing - fetching rejected pool directly');
    const rows = [];
    for (let off = 0; ; off += 1000) {
      const res = await fetch(
        `${URL}/rest/v1/qb_questions?select=id,grade,question_type,prompt_text,choices,answer,explanation_vi,learning_objective,passage,statement,tokens` +
        `&subject=eq.english&canonical=eq.true&review_status=eq.rejected` +
        `&order=id&offset=${off}&limit=1000`, { headers: H });
      if (!res.ok) throw new Error('fetch ' + res.status);
      const chunk = await res.json();
      for (const r of chunk) { r._why = 'rejected earlier (reason lost) - re-check and fix any quality issue'; rows.push(r); }
      if (chunk.length < 1000 || (LIMIT && rows.length >= LIMIT)) break;
    }
    console.log(`repair fetch: ${rows.length} rejected rows`);
    return LIMIT ? rows.slice(0, LIMIT) : rows;
  }
  const rows = [];
  for (let i = 0; i < drops.length; i += 200) {
    const ids = drops.slice(i, i + 200).map((d) => `"${d.id}"`).join(',');
    const res = await fetch(
      `${URL}/rest/v1/qb_questions?select=id,grade,question_type,prompt_text,choices,answer,explanation_vi,learning_objective,passage,statement,tokens` +
      `&id=in.(${ids})&review_status=eq.rejected`, { headers: H });
    if (!res.ok) throw new Error('fetch ' + res.status);
    for (const r of await res.json()) { r._why = why.get(r.id); rows.push(r); }
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
  if (row._why) o.rejected_reason = row._why;
  return o;
}

function promptFor(mode, grade, items) {
  if (mode === 'repair') {
    return `You are a senior Vietnamese primary-English editor REPAIRING quiz items that a verifier rejected, for grade-${grade} Vietnamese kids (Global Success).
Each item has a "rejected_reason" field explaining the defect found by the verifier.
For EVERY item output a JSON object with the SAME fields it would have had if newly written:
{"i":"<same id>","q":"<fixed prompt>","c":[...],"a":{...},"ex":"...","lo":"...","passage":"...","statement":"...","tokens":[...]}
OR {"i":"<id>","drop":true} if the item is genuinely unfixable.
RULES:
- fix the EXACT defect named in rejected_reason; keep the same question type and learning intent
- exactly ONE defensible correct answer
- prompts self-contained text; reorder tokens join to EXACTLY the answer; true-false provable from passage alone
- ex: kid-friendly Vietnamese; hyphen '-' only, never em-dash
- output ONLY a raw JSON array, same order, one object per item. NO markdown fences, NO commentary.
ITEMS:
${JSON.stringify(items, null, 0)}`;
  }
  return `You are a senior Vietnamese primary-English editor polishing quiz items drafted by a weaker AI, for grade-${grade} Vietnamese kids (Global Success).
Each input item has fields: i=id, t=type(mcq|reorder|true-false|text-answer|word-to-image-mcq|image-to-word-mcq), q=prompt, c=choices, a=answer, ex=Vietnamese explanation, lo=objective, passage/statement/tokens where relevant.
For EVERY item output a JSON object:
{"i":"<same id>","q":"<polished prompt>","c":[...],"a":{...},"ex":"...","lo":"...","passage":"...","statement":"...","tokens":[...]}
OR {"i":"<id>","drop":true} if the item is unfixable: ambiguous, multiple defensible answers, nonsense, image-dependent prompt with no image, or pedagogically wrong for the grade.
POLISH RULES:
- exactly ONE defensible correct answer; rewrite distractors if two options can both fit
- keep the same question type and the same learning intent
- prompts must be self-contained text; no "look at the picture" phrasing unless type is *-image-*
- reorder: tokens join to EXACTLY the answer text
- true-false: statement provably true/false from the passage alone
- ex: kid-friendly Vietnamese; hyphen '-' only, no em-dash
- output ONLY a raw JSON array, same order, one object per item. NO markdown fences, NO commentary.
ITEMS:
${JSON.stringify(items, null, 0)}`;
}

function parseOut(text) {
  return parseJsonArray(text); // tolerant: fence, bracket match, inner-quote repair
}

async function patchItem(row, fix) {
  const body = {};
  if (typeof fix.q === 'string') body.prompt_text = fix.q.slice(0, 500);
  if (Array.isArray(fix.c)) body.choices = fix.c;
  if (fix.a && typeof fix.a === 'object') body.answer = fix.a;
  if (typeof fix.ex === 'string') body.explanation_vi = fix.ex.slice(0, 500);
  if (typeof fix.lo === 'string') body.learning_objective = fix.lo.slice(0, 200);
  if (typeof fix.passage === 'string') body.passage = fix.passage;
  if (typeof fix.statement === 'string') body.statement = fix.statement;
  if (Array.isArray(fix.tokens)) body.tokens = fix.tokens;
  body.review_status = POLISHED_STATUS;
  if (MODE === 'repair') body.publication_policy = CANDIDATE_POLICY; // back into verify pool
  const res = await fetch(`${URL}/rest/v1/qb_questions?id=eq.${row.id}`, { method: 'PATCH', headers: HW, body: JSON.stringify(body) });
  return res.ok ? 'ok' : 'err-' + res.status;
}

async function rejectItem(id) {
  await fetch(`${URL}/rest/v1/qb_questions?id=eq.${id}`, {
    method: 'PATCH', headers: HW,
    body: JSON.stringify({ review_status: 'rejected', publication_policy: REJECT_POLICY }),
  });
}

// ---- main ----
const items = MODE === 'repair' ? await fetchRejected() : await fetchPending();
console.log(`${MODE}: ${items.length} items -> chunks of ${CHUNK} (provider=${PROVIDER}, gap=${GAP / 1000}s)`);
if (!items.length) process.exit(0);

const channel = createLlmChannel({ workers: 1, provider: PROVIDER, codexModel: 'gpt-6.1-sol', codexEffort: 'high' });
const queue = [];
for (let i = 0; i < items.length; i += CHUNK) queue.push({ rows: items.slice(i, i + CHUNK), depth: 0 });
let ci = 0, polished = 0, dropped = 0, failed = 0;

while (queue.length) {
  const job = queue.shift();
  const idx = String(++ci).padStart(4, '0');
  writeFileSync(join(DIR, `in-${idx}.json`), JSON.stringify(job.rows.map(slim), null, 1));
  let out;
  try {
    const res = await channel.call(promptFor(MODE, job.rows[0].grade, job.rows.map(slim)));
    writeFileSync(join(DIR, `out-${idx}.txt`), res.text);
    out = parseOut(res.text);
  } catch (e) {
    const msg = String(e.message ?? e).slice(0, 120);
    if (job.rows.length > 1 && job.depth < MAXSPLIT) {
      const mid = Math.ceil(job.rows.length / 2);
      queue.unshift({ rows: job.rows.slice(mid), depth: job.depth + 1 });
      queue.unshift({ rows: job.rows.slice(0, mid), depth: job.depth + 1 });
      console.log(`  chunk ${idx} fail (${msg}) -> split ${job.rows.length} -> ${mid}+${job.rows.length - mid} (depth ${job.depth + 1})`);
    } else {
      failed += job.rows.length;
      appendFileSync(FAILJSONL, JSON.stringify({ idx, ids: job.rows.map((r) => r.id), err: msg }) + '\n');
      console.log(`  chunk ${idx} fail (${msg}) -> ${job.rows.length} item(s) stay pending`);
    }
    if (/usage limit|rate-limited/i.test(msg)) { console.log('  provider quota-bound - aborting, rerun resumes'); break; }
    await sleep(GAP);
    continue;
  }
  const byId = new Map(out.map((o) => [o.i, o]));
  for (const row of job.rows) {
    const fix = byId.get(row.id);
    if (!fix) { failed++; continue; }
    if (fix.drop) { await rejectItem(row.id); dropped++; continue; }
    (await patchItem(row, fix)) === 'ok' ? polished++ : failed++;
  }
  if (ci % 5 === 0 || queue.length === 0) console.log(`  ${ci} calls | queue=${queue.length} polished=${polished} dropped=${dropped} failed=${failed}`);
  await sleep(GAP);
}
await channel.close();
console.log(`DONE review-loop ${MODE}: polished=${polished} dropped=${dropped} failed=${failed} (codex=${channel.counts.codex} gemini=${channel.counts.gemini}) dir=${DIR}`);
