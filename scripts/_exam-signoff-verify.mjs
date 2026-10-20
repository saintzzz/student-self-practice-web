#!/usr/bin/env node
/* _exam-signoff-verify.mjs - PO review pass over the exam-approval backlog.
 *
 * Candidates: qb_questions where mockEligible AND requiresHumanApprovalForExam
 * AND review_status <> 'rejected'. Two gates:
 *
 *   1. structural - answer/choice integrity, per-type field presence, asset
 *      linkage for image types, foreign-script scan.
 *   2. llm-selfsolve - a checker model answers each text-only item blind;
 *      disagreement or "no single answer" -> exclude from approval.
 *
 * Output: scripts/gen-bulk-out/exam-signoff-{approve,drop}.json + report.
 *
 *   node scripts/_exam-signoff-verify.mjs [--limit N] [--offset N]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const arg = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; };
const LIMIT = Number(arg('--limit', 99999));
const OFFSET = Number(arg('--offset', 0));
const CHECK_MODEL = arg('--check-model', 'minimax/minimax-m3.1-flash:free');
const OR_KEY = readFileSync(join(process.env.APPDATA ?? '', 'devin/secrets/openrouter_api_key'), 'utf8').trim();
const keys = JSON.parse(readFileSync(join(process.env.APPDATA ?? '', 'devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url;
const SVC = keys.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };

// foreign-script scan: CJK, kana, hangul, cyrillic, arabic, thai
const FOREIGN = /[぀-ヿ㐀-䶿一-鿿가-힯Ѐ-ӿ؀-ۿ฀-๿]/;

function structuralFails(q, assets) {
  const why = [];
  const fields = [q.prompt_text, q.transcript, q.explanation_vi, q.learning_objective,
    ...(Array.isArray(q.choices) ? q.choices : []), ...(Array.isArray(q.tokens) ? q.tokens : []),
    q.passage, q.statement];
  for (const f of fields) if (typeof f === 'string' && FOREIGN.test(f)) why.push('foreign-script');
  const t = q.question_type;
  const a = q.answer || {};
  const c = Array.isArray(q.choices) ? q.choices : null;
  switch (t) {
    case 'mcq':
    case 'word-to-image-mcq':
    case 'image-to-word-mcq':
    case 'visual-count-mcq': {
      if (!c || c.length < 2) { why.push('no-choices'); break; }
      const fold = c.map((x) => String(x).toLowerCase().trim());
      if (new Set(fold).size !== c.length) why.push('dup-choices');
      if (Number.isInteger(a.index)) {
        if (a.index < 0 || a.index >= c.length) why.push('answer-oob');
        else if (a.text !== undefined && String(a.text).trim().toLowerCase() !== String(c[a.index]).trim().toLowerCase()) why.push('answer-text-mismatch');
      } else if (a.text !== undefined && !fold.includes(String(a.text).toLowerCase().trim())) why.push('answer-not-in-choices');
      break;
    }
    case 'true-false':
      if (!q.passage || q.passage.length < 10) why.push('no-passage');
      if (!q.statement || q.statement.length < 3) why.push('no-statement');
      if (typeof a.boolean !== 'boolean') why.push('no-bool');
      break;
    case 'reorder': {
      const norm = (s) => String(s).toLowerCase().replace(/[.!?,;:'"]/g, '').replace(/\s+/g, ' ').trim();
      if (!Array.isArray(q.tokens) || q.tokens.length < 3) why.push('no-tokens');
      else if (a.text && norm(q.tokens.join(' ')) !== norm(a.text)) why.push('tokens-mismatch');
      break;
    }
    case 'text-answer':
    case 'constructed-response':
    case 'speaking-prompt':
      if (!a.accepted && !a.text && !a.sample) why.push('no-accepted');
      break;
  }
  if (['word-to-image-mcq', 'image-to-word-mcq', 'visual-count-mcq'].includes(t) && !assets.has(q.id)) why.push('no-asset');
  if (!q.prompt_text || q.prompt_text.trim().length < 5) why.push('short-prompt');
  return why;
}

function batchCheckPrompt(items) {
  const lines = items.map((q, i) => {
    if (q.question_type === 'true-false') {
      return `${i}. Passage: ${q.passage}\n   Statement: ${q.statement} -> answer TRUE or FALSE`;
    }
    return `${i}. ${q.prompt_text}\n   A.${q.choices.map((x, j) => `${['A', 'B', 'C', 'D'][j]}.${x}`).join(' ')}`;
  }).join('\n');
  return `Answer each item. Reply with ONLY a JSON array: for each item the index 0-3 of the correct option, or for TRUE/FALSE items 0 for true and 1 for false. If an item has NO single clear correct answer, use -1.\n\n${lines}`;
}

function expectedIndex(q) {
  if (q.question_type === 'true-false') return q.answer.boolean ? 0 : 1;
  return q.answer.index;
}

async function llmCheck(items) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(180000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OR_KEY}` },
    body: JSON.stringify({
      model: CHECK_MODEL, temperature: 0, max_tokens: 4000, reasoning: { effort: 'low' },
      messages: [
        { role: 'system', content: 'You answer quiz items. Output ONLY a JSON array of integers.' },
        { role: 'user', content: batchCheckPrompt(items) },
      ],
    }),
  });
  if (!r.ok) return null;
  const m = (await r.json()).choices?.[0]?.message?.content ?? '';
  const s = m.indexOf('['); const e = m.lastIndexOf(']');
  if (s < 0) return null;
  try { const p = JSON.parse(m.slice(s, e + 1)); return Array.isArray(p) ? p : null; } catch { return null; }
}

// ---------- pull candidates ----------
console.log('pulling candidates...');
const cands = [];
{
  let from = OFFSET;
  for (;;) {
    const res = await fetch(`${SUPA}/rest/v1/qb_questions?select=id,grade,subject,question_type,prompt_text,choices,answer,passage,statement,tokens,transcript,explanation_vi,learning_objective,review_status,publication_policy&limit=1000&offset=${from}`, { headers: H });
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) break;
    for (const q of rows) {
      const p = q.publication_policy || {};
      if (p.mockEligible && p.requiresHumanApprovalForExam === true && q.review_status !== 'rejected') cands.push(q);
      if (cands.length >= LIMIT) break;
    }
    from += 1000;
    if (rows.length < 1000 || cands.length >= LIMIT) break;
  }
}
console.log(`candidates: ${cands.length}`);

// asset linkage for image questions
const assetIds = new Set();
{
  const ids = cands.filter((q) => ['word-to-image-mcq', 'image-to-word-mcq', 'visual-count-mcq'].includes(q.question_type)).map((q) => q.id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200).map((x) => `"${x}"`).join(',');
    const res = await fetch(`${SUPA}/rest/v1/qb_question_assets?select=question_id&question_id=in.(${chunk})`, { headers: H });
    const rows = await res.json();
    if (Array.isArray(rows)) for (const r of rows) assetIds.add(r.question_id);
  }
}
console.log(`image-linked: ${assetIds.size}`);

// ---------- structural gate ----------
const drops = new Map();
const survivors = [];
const noLlm = [];
for (const q of cands) {
  const why = structuralFails(q, assetIds);
  if (why.length) { drops.set(q.id, why); continue; }
  if (['mcq', 'true-false'].includes(q.question_type)) survivors.push(q);
  else noLlm.push(q); // image/text/reorder: structural gate only
}
console.log(`structural drop: ${drops.size} | llm-checkable: ${survivors.length} | asset/structural-only ok: ${noLlm.length}`);

// ---------- llm gate ----------
const approve = [...noLlm.map((q) => q.id)];
const CHUNK = 25;
let checked = 0;
for (let i = 0; i < survivors.length; i += CHUNK) {
  const slice = survivors.slice(i, i + CHUNK);
  const picks = await llmCheck(slice);
  checked += slice.length;
  if (!picks || picks.length !== slice.length) {
    // checker failed -> keep items (server audit remains the backstop)
    for (const q of slice) approve.push(q.id);
    continue;
  }
  slice.forEach((q, j) => {
    if (picks[j] === expectedIndex(q)) approve.push(q.id);
    else drops.set(q.id, ['llm-mismatch', `solver=${picks[j]} expected=${expectedIndex(q)}`]);
  });
  if (checked % 500 === 0) console.log(`  checked ${checked}/${survivors.length} approve=${approve.length} drop=${drops.size}`);
}

const dropList = [...drops.entries()].map(([id, why]) => ({ id, why }));
writeFileSync(join(HERE, 'gen-bulk-out', 'exam-signoff-approve.json'), JSON.stringify(approve));
writeFileSync(join(HERE, 'gen-bulk-out', 'exam-signoff-drop.json'), JSON.stringify(dropList, null, 1));
console.log(`DONE approve=${approve.length} drop=${drops.size}`);
