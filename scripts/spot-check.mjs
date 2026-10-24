// CR-111: academic spot-check - the "5% human review" QA step, run as a
// sampled LLM academic review. Draws a seeded random sample of served
// questions and asks a senior-teacher reviewer to verify: keyed answer
// correct, exactly one defensible answer, age-appropriate, explanation
// accurate and kid-friendly, no English/Vietnamese errors.
// Writes a reviewable artifact: docs/qa/spot-check-<ts>.json + .md
// Usage: node scripts/spot-check.mjs [--n 360] [--seed 42] [--dry] [--ids file.txt]
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createLlmChannel, parseJsonArray } from './llm-channel.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const N = Number(arg('--n', '360'));
const SEED = arg('--seed', String(Date.now()));
const WORKERS = Number(arg('--workers', '3'));
const BATCH = Number(arg('--batch', '30'));
const IDS = arg('--ids', null);

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };

// Deterministic seeded shuffle (xorshift32 over a mulberry seed)
const rng = (() => {
  let s = [...crypto.createHash('sha256').update(String(SEED)).digest()].reduce((a, b) => (a * 31 + b) >>> 0);
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 2 ** 32; };
})();

async function fetchAll() {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    let res = null;
    for (let t = 0; t < 5; t++) {
      res = await fetch(
        `${URL}/rest/v1/qb_questions?select=id,grade,subject,question_type,skill,prompt_text,passage,statement,tokens,transcript,choices,answer,explanation_vi` +
        `&review_status=neq.rejected&order=id&offset=${off}&limit=1000`,
        { headers: H, signal: AbortSignal.timeout(30000) }).catch(() => null);
      if (res?.ok) break;
      await new Promise((s) => setTimeout(s, 3000 * (t + 1)));
    }
    if (!res?.ok) throw new Error('fetch ' + (res?.status ?? 'timeout'));
    const chunk = await res.json();
    rows.push(...chunk);
    if (chunk.length < 1000) break;
  }
  return rows;
}

// Question-level image assets (qb_question_assets -> qb_assets): the
// reviewer must see that a picture exists or "no image" flags become FPs.
async function fetchAssetMap(ids) {
  const map = {};
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const res = await fetch(
      `${URL}/rest/v1/qb_question_assets?select=question_id,asset_id&question_id=in.(${chunk.map(encodeURIComponent).join(',')})`,
      { headers: H, signal: AbortSignal.timeout(20000) });
    if (!res.ok) continue;
    const links = await res.json();
    const assetIds = [...new Set(links.map((l) => l.asset_id))];
    const assets = {};
    for (let j = 0; j < assetIds.length; j += 200) {
      const ar = await fetch(
        `${URL}/rest/v1/qb_assets?select=id,file_path,alt_text&id=in.(${assetIds.slice(j, j + 200).map(encodeURIComponent).join(',')})`,
        { headers: H, signal: AbortSignal.timeout(20000) });
      if (ar.ok) for (const a of await ar.json()) assets[a.id] = a;
    }
    for (const l of links) {
      const a = assets[l.asset_id];
      if (a) (map[l.question_id] ??= []).push(a.alt_text || a.file_path);
    }
  }
  return map;
}

const correctLabel = (q) => {
  if (Array.isArray(q.choices) && q.answer?.index !== undefined) {
    const c = q.choices[q.answer.index];
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object') return `[image:${c.assetId}]`; // asset-choice rows render pictures
  }
  return q.answer?.text ?? q.answer?.accepted?.[0] ?? JSON.stringify(q.answer);
};

// assetId-backed choices render as pictures in the app - tell the reviewer
// so it does not flag "choices are resource codes".
const choiceLabel = (c) =>
  typeof c === 'string' ? c : (c && typeof c === 'object' && c.assetId ? `[image:${c.assetId}]` : c);

function promptFor(items) {
  return `You are a senior Vietnamese primary-school teacher doing an academic spot-check of served question-bank rows (English/math/science, grades 1-5).
Each item: {"i":id,"g":grade,"type":question_type,"q":prompt,"c":[choices],"a":keyed answer,"ex":Vietnamese explanation,"p":passage?,"s":statement to judge true/false?,"t":[reorder word tokens]?,"tr":transcript (spoken aloud via TTS in the app)?,"im":[linked picture descriptions]?}.
Notes on fields:
- "s" (statement) is rendered for true-false questions - the claim students judge. A true-false item WITH a statement is complete; do not flag it for lacking a claim.
- "t" (tokens) is the shuffled word bank for reorder questions - students rearrange these. Present tokens mean the item is complete.
- "tr" is the transcript the app speaks via text-to-speech for listening questions; its presence means audio exists.
- Choice entries like "[image:xxx]" are picture tiles rendered from real image assets - the pictures exist; judge the prompt/answer, not the missing pixels.
- "im" lists the real picture asset(s) attached to the question (alt text). A question WITH "im" displays that picture; do not flag it for a missing image.

For EVERY item output {"i":"<same id>","v":"ok"|"issue","note":"<only when issue - the defect in 1 short sentence>"}.

FLAG "issue" ONLY for real defects a teacher would reject:
- The keyed answer "a" is WRONG, or more than one choice is equally correct.
- The prompt is ambiguous, truncated, or cannot be answered from what is shown.
- Content is wrong for the grade level or pedagogically misleading.
- English grammar/spelling errors in prompt/choices/answer.
- Explanation teaches something incorrect, or contradicts the answer.
Do NOT flag: style preferences, explanations that mention distractors to refute them, correct-but-simple content, or missing visuals when picture/image choices or transcripts are provided.
Output ONLY a raw JSON array, same order as input.

ITEMS:
${JSON.stringify(items.map((r) => ({
    i: r.id, g: r.grade, type: r.question_type,
    q: String(r.prompt_text ?? '').slice(0, 300),
    p: r.passage ? String(r.passage).slice(0, 400) : undefined,
    s: r.statement ? String(r.statement).slice(0, 200) : undefined,
    t: Array.isArray(r.tokens) ? r.tokens : undefined,
    tr: r.transcript ? String(r.transcript).slice(0, 200) : undefined,
    im: r._assets?.length ? r._assets : undefined,
    c: Array.isArray(r.choices) ? r.choices.slice(0, 6).map(choiceLabel) : undefined,
    a: correctLabel(r),
    ex: String(r.explanation_vi ?? '').slice(0, 300),
  })), null, 0)}`;
}

const channel = createLlmChannel({ workers: WORKERS, codexModel: 'gpt-6.1-sol', codexEffort: 'high' });
const all = await fetchAll();
let sample;
if (IDS) {
  const wanted = new Set(readFileSync(IDS, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  sample = all.filter((r) => wanted.has(r.id));
  console.log(`targeted ids=${wanted.size} found=${sample.length}`);
} else {
  // stratified-ish seeded sample: shuffle then take N
  const shuffled = [...all].sort(() => rng() - 0.5);
  sample = shuffled.slice(0, N);
  console.log(`bank=${all.length} sample=${sample.length} seed=${SEED}`);
}
const assetMap = await fetchAssetMap(sample.map((r) => r.id));
for (const r of sample) r._assets = assetMap[r.id];
if (DRY) {
  const out = parseJsonArray((await channel.call(promptFor(sample.slice(0, 6)))).text);
  console.log(JSON.stringify(out, null, 1));
  await channel.close();
  process.exit(0);
}

const queue = [];
for (let i = 0; i < sample.length; i += BATCH) queue.push(sample.slice(i, i + BATCH));
const verdicts = [];
let done = 0, failedBatches = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (queue.length) {
    const batch = queue.shift();
    try {
      const out = parseJsonArray((await channel.call(promptFor(batch))).text);
      verdicts.push(...out);
    } catch (e) {
      failedBatches++;
      console.log(`  batch fail: ${String(e.message ?? e).slice(0, 120)}`);
    }
    done++;
    console.log(`  ${done} batches done | verdicts=${verdicts.length} fails=${failedBatches}`);
  }
}));
await channel.close();

const issues = verdicts.filter((v) => v.v === 'issue');
const ts = Date.now();
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'qa');
writeFileSync(join(dir, `spot-check-${ts}.json`),
  JSON.stringify({ seed: SEED, bank: all.length, sampled: sample.length, verdicts }, null, 1));
const byGrade = {};
for (const v of issues) {
  const g = sample.find((r) => r.id === v.i)?.grade;
  byGrade[g] = (byGrade[g] ?? 0) + 1;
}
writeFileSync(join(dir, `spot-check-${ts}.md`),
  `# Academic spot-check (seed ${SEED})\n\n` +
  `- Bank: ${all.length} served rows | sampled: ${sample.length} | reviewed: ${verdicts.length}\n` +
  `- Issues flagged: ${issues.length} (${((issues.length / Math.max(1, verdicts.length)) * 100).toFixed(2)}%)\n` +
  `- By grade: ${JSON.stringify(byGrade)}\n\n` +
  issues.map((v) => `- \`${v.i}\` - ${v.note}`).join('\n') + '\n');
console.log(`DONE: ${verdicts.length} reviewed, ${issues.length} issues flagged -> docs/qa/spot-check-${ts}.{json,md}`);
issues.slice(0, 30).forEach((v) => console.log(`  ISSUE ${v.i}: ${v.note}`));
