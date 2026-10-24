#!/usr/bin/env node
/**
 * Final content QC - runs AFTER polish/verify/repair pipeline.
 * Mechanical checks over 100% of the approved pool + optional codex re-audit.
 *
 *   node scripts/qc-content.mjs [--grades 1,2,3,4,5] [--semantic N] [--json out.json]
 *
 * Checks per row (approved pool = canonical, requiresHumanApprovalForExam=false,
 * not rejected):
 *   - structural: choices/dup/answer-index bounds/tokens-match/passage (mirrors
 *     verify-codex.mjs structuralFail)
 *   - dedupe: content_hash + normalized prompt collisions
 *   - dash-rule: no em/en-dash in prompt_text or explanation_vi
 *   - explanation: present, sane length
 *   - images: every assetId resolves to a file under public/images/<dir>/;
 *     image-to-word seedWordId must equal the correct choice word;
 *     word-to-image correct-option asset must exist
 *   - audio: listening-skill items carry a transcript
 * --semantic N: stratified sample re-audit via codex (judgment pass) - reports
 *   false-approval rate; high rate means the verify pass needs re-running.
 */
import { createLlmChannel, parseJsonArray } from './llm-channel.mjs';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paged } from './lib/paged.mjs';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ARGS = process.argv.slice(2);
const arg = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; };
const GRADES = arg('--grades', '1,2,3,4,5').split(',').map(Number);
const SEMANTIC = Number(arg('--semantic', 0));
const JSON_OUT = arg('--json', null);
// --requeue: deterministic dup -> canonical=false (keep the "same-as" twin);
// every other defect -> back to the polish pool for the repair loop.
const REQUEUE = ARGS.includes('--requeue');

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };

const SEL = 'id,grade,question_type,domain,skill,prompt_text,choices,answer,explanation_vi,passage,statement,tokens,transcript,content_hash,review_status,source';

async function fetchPool(where) {
  const rows = [];
  for (const g of GRADES)
    for await (const chunk of paged(
      `${URL}/rest/v1/qb_questions?select=${SEL}&grade=eq.${g}&subject=eq.english&canonical=eq.true&${where}`,
      { headers: H },
    ))
      rows.push(...chunk);
  return rows;
}

const IMG_DIRS = ['concepts', 'games', 'vocab', 'mascot', 'stickers', 'home', 'pets'];
const assetOk = new Map();
function assetFile(assetId) {
  if (!assetOk.has(assetId))
    assetOk.set(assetId, IMG_DIRS.some((d) => existsSync(join(ROOT, 'public', 'images', d, `${assetId}.webp`))));
  return assetOk.get(assetId);
}
const norm = (s) => String(s ?? '').toLowerCase().replace(/[.!?,;:'"()]/g, '').replace(/\s+/g, ' ').trim();
const wordSlug = (assetId) => { const m = String(assetId).match(/^[a-z]+-(.+)-[0-9a-f]{6}$/); return m ? norm(m[1].replace(/-/g, ' ')) : norm(assetId); };

function structuralFail(r) {
  const t = r.question_type;
  if (t === 'mcq' || t === 'word-to-image-mcq' || t === 'image-to-word-mcq') {
    const c = r.choices;
    if (!Array.isArray(c) || c.length < 2) return 'no-choices';
    if (t === 'mcq') {
      const texts = c.map((x) => norm(typeof x === 'string' ? x : x?.assetId ?? x));
      if (new Set(texts).size !== c.length) return 'dup-choices';
    }
    const idx = r.answer?.index;
    if (idx === undefined && r.answer?.text === undefined) return 'no-answer';
    if (idx !== undefined && (typeof idx !== 'number' || idx < 0 || idx >= c.length)) return 'answer-index-oob';
    if (!r.prompt_text || r.prompt_text.length < 8) return 'short-prompt';
    if (t === 'mcq' && /what is this|look at the picture|which picture|nhìn hình/i.test(r.prompt_text)) return 'image-dependent';
    return null;
  }
  if (t === 'true-false') {
    if (!r.passage || r.passage.length < 10) return 'no-passage';
    if (!r.statement || r.statement.length < 5) return 'no-statement';
    if (typeof r.answer?.boolean !== 'boolean') return 'no-boolean';
    return null;
  }
  if (t === 'reorder') {
    if (!Array.isArray(r.tokens) || r.tokens.length < 3) return 'no-tokens';
    if (norm(r.tokens.join(' ')) !== norm(r.answer?.text ?? '')) return 'tokens-mismatch';
    return null;
  }
  if (t === 'text-answer') {
    const acc = r.answer?.accepted ?? (r.answer?.text ? [r.answer.text] : []);
    if (!acc.length || acc.includes('open-response')) return 'unscorable';
    return null;
  }
  return null;
}

function imageWordFail(r) {
  const t = r.question_type;
  if (t === 'word-to-image-mcq') {
    let missing = 0;
    for (const ch of r.choices ?? []) if (ch?.assetId && !assetFile(ch.assetId)) missing++;
    if (missing) return `asset-missing x${missing}`;
    const idx = r.answer?.index;
    if (idx !== undefined && !r.choices?.[idx]?.assetId) return 'answer-not-image';
    // seed word should match what the prompt asks to find
    const seed = r.source?.seedWordId;
    if (seed) {
      const correctSlug = wordSlug(r.choices?.[idx]?.assetId ?? '');
      if (norm(seed.replace(/-/g, ' ')) !== correctSlug) return `seed-mismatch:${seed}!=${correctSlug}`;
    }
    return null;
  }
  if (t === 'image-to-word-mcq') {
    const seed = r.source?.seedWordId;
    const idx = r.answer?.index;
    const word = typeof r.choices?.[idx] === 'string' ? r.choices[idx] : null;
    if (seed && word) {
      const a = norm(seed.replace(/-/g, ' ')), b = norm(word).replace(/^the /, '');
      if (a !== b && !b.includes(a) && !a.includes(b)) return `seed-word-mismatch:${seed}!=${word}`;
    }
    return null;
  }
  return null;
}

const rows = await fetchPool(
  `publication_policy->>requiresHumanApprovalForExam=eq.false&review_status=neq.rejected`);
console.log(`approved pool: ${rows.length}`);

const issues = [];
const hashSeen = new Map(), promptSeen = new Map();
for (const r of rows) {
  const f = structuralFail(r); if (f) issues.push({ id: r.id, check: 'structural', fail: f });
  const iw = imageWordFail(r); if (iw) issues.push({ id: r.id, check: 'image-word', fail: iw });
  for (const fld of ['prompt_text', 'explanation_vi'])
    if (r[fld] && /[—–]/.test(r[fld])) issues.push({ id: r.id, check: 'dash-rule', fail: fld });
  if (!r.explanation_vi || r.explanation_vi.trim().length < 10) issues.push({ id: r.id, check: 'explanation', fail: 'missing-or-thin' });
  if (r.content_hash) {
    if (hashSeen.has(r.content_hash)) issues.push({ id: r.id, check: 'dup-hash', fail: `same-as:${hashSeen.get(r.content_hash)}` });
    else hashSeen.set(r.content_hash, r.id);
  }
  // full-content key: every field that differentiates a question must be in
  // the key (prompt is a shared template for tf/image types).
  const choiceKey = (r.choices ?? []).map((c) => norm(typeof c === 'string' ? c : c?.assetId ?? c?.text ?? '')).join('|');
  const pk = [r.grade, r.question_type, norm(r.prompt_text), choiceKey,
    norm(JSON.stringify(r.answer ?? '')), norm(r.passage), norm(r.statement),
    norm((r.tokens ?? []).join(' ')), r.source?.seedWordId ?? ''].join('~');
  if (promptSeen.has(pk)) issues.push({ id: r.id, check: 'dup-prompt', fail: `same-as:${promptSeen.get(pk)}` });
  else promptSeen.set(pk, r.id);
  if (/listening|nghe/i.test(r.skill ?? '') && !r.transcript)
    issues.push({ id: r.id, check: 'audio', fail: 'no-transcript' });
}

const byCheck = {};
for (const i of issues) byCheck[i.check] = (byCheck[i.check] ?? 0) + 1;
console.log('mechanical issues:', JSON.stringify(byCheck), `total=${issues.length}`);
if (issues.length) console.log(issues.slice(0, 40).map((i) => `  ${i.id} [${i.check}] ${i.fail}`).join('\n'));

const cov = {};
for (const r of rows) cov[r.grade] = (cov[r.grade] ??= 0) + 1;
console.log('coverage by grade:', JSON.stringify(cov));

let semantic = null;
if (SEMANTIC > 0 && rows.length) {
  const byGrade = {};
  for (const r of rows) (byGrade[r.grade] ??= []).push(r);
  const per = Math.max(1, Math.floor(SEMANTIC / GRADES.length));
  const sample = [];
  for (const g of GRADES) {
    const pool = byGrade[g] ?? [];
    const step = Math.max(1, Math.floor(pool.length / per));
    for (let i = 0; i < pool.length; i += step) { if (sample.length >= SEMANTIC) break; sample.push(pool[i]); }
  }
  console.log(`semantic re-audit sample: ${sample.length}`);
  const channel = createLlmChannel({ workers: 2, codexModel: 'gpt-6-astra', codexEffort: 'high' });
  const slim = sample.map((r) => ({ i: r.id, t: r.question_type, q: r.prompt_text, c: r.choices, a: r.answer, p: r.passage, s: r.statement }));
  const prompt = `You are RE-AUDITING already-approved exam items for Vietnamese primary English. For every item output {"i":"<id>","ok":true} or {"i":"<id>","ok":false,"why":"..."}.
FAIL when: declared answer wrong, ambiguity (2 defensible options), broken grammar/spelling, explanation contradicts answer, prompt unanswerable, content age-inappropriate.
Output ONLY a raw JSON array.
ITEMS:
${JSON.stringify(slim)}`;
  try {
    const out = await channel.call(prompt, { timeoutMs: 420_000 });
    const verdicts = parseJsonArray(out) ?? [];
    const flagged = verdicts.filter((v) => v && v.ok === false);
    semantic = { sample: sample.length, judged: verdicts.length, flagged: flagged.length, rate: verdicts.length ? +(flagged.length / verdicts.length).toFixed(3) : null, flaggedIds: flagged.map((f) => ({ i: f.i, why: f.why })) };
    console.log(`semantic: ${verdicts.length}/${sample.length} judged, flagged=${flagged.length} (rate=${semantic.rate ?? '?'})`);
    flagged.slice(0, 30).forEach((f) => console.log(`  FLAG ${f.i}: ${f.why}`));
    for (const f of flagged) if (f.i) issues.push({ id: f.i, check: 'semantic', fail: f.why || 'flagged' });
  } catch (e) {
    console.log(`semantic: audit failed (${String(e).slice(0, 120)}) - continuing to requeue`);
    semantic = { sample: sample.length, error: String(e).slice(0, 200) };
  }
  await channel.close?.();
}

let requeued = { dropped: 0, requeue: 0 };
if (REQUEUE && issues.length) {
  const HW = { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json' };
  const patchIn = async (ids, body) => {
    for (let i = 0; i < ids.length; i += 200) {
      const list = ids.slice(i, i + 200).map((x) => `"${x}"`).join(',');
      const res = await fetch(`${URL}/rest/v1/qb_questions?id=in.(${list})`, { method: 'PATCH', headers: HW, body: JSON.stringify(body) });
      if (!res.ok) console.log('patch err', res.status, (await res.text()).slice(0, 120));
    }
  };
  const dupIds = [...new Set(issues.filter((i) => i.check === 'dup-hash' || i.check === 'dup-prompt').map((i) => i.id))];
  const repairIds = [...new Set(issues.filter((i) => i.check !== 'dup-hash' && i.check !== 'dup-prompt').map((i) => i.id))];
  if (dupIds.length) await patchIn(dupIds, { canonical: false });
  if (repairIds.length) await patchIn(repairIds, {
    review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
    publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: false, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: true },
  });
  requeued = { dropped: dupIds.length, requeue: repairIds.length };
  console.log(`requeue: dropped(dup)=${dupIds.length} repair=${repairIds.length}`);
}

const report = { at: new Date().toISOString(), pool: rows.length, coverage: cov, mechanical: { total: issues.length, byCheck, issues: issues.slice(0, 500) }, semantic, requeued };
if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify(report, null, 1)); console.log(`report -> ${JSON_OUT}`); }
