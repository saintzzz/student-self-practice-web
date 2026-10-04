#!/usr/bin/env node
/**
 * Question-bank content audit - repeatable verification for every defect
 * class found in CR-51 plus proactive checks for wrong/incomplete content.
 *
 * Usage:
 *   node scripts/qb-content-audit.mjs            # full report to stdout + docs/qa/content-audit.md
 *   node scripts/qb-content-audit.mjs --json     # machine-readable JSON to stdout
 *   node scripts/qb-content-audit.mjs --strict   # exit 1 if any P0 check > 0
 *
 * Auth: service_role key (read-only) from ~/.config/devin/secrets/supabase_new_keys.json
 *       or SUPABASE_SERVICE_KEY env.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPA_URL = 'https://cxjpgfhqchjoernfmcra.supabase.co';
const REPORT = join(
  dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'qa', 'content-audit.md',
);

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY;
  const p = join(homedir(), '.config/devin/secrets/supabase_new_keys.json');
  return JSON.parse(readFileSync(p, 'utf8')).keys.service_role;
}
const KEY = serviceKey();
const HEADERS = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  'Accept-Profile': 'practice', 'Content-Profile': 'practice',
};

async function fetchTable(table, cols) {
  const out = [];
  const PAGE = 1000;
  for (let off = 0; ; off += PAGE) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/${table}?select=${cols}&offset=${off}&limit=${PAGE}`,
      { headers: HEADERS },
    );
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

const choiceLabel = (c) =>
  typeof c === 'string' || typeof c === 'number'
    ? String(c)
    : String(c?.assetId ?? '').replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');

// Only types the adapter actually serves can be "unanswerable" -
// speaking/constructed-response items are rubric-only anyway.
const SERVED_TYPES = new Set([
  'mcq', 'true-false', 'word-order', 'fill-blank', 'word-to-image-mcq',
  'image-to-word-mcq', 'visual-mcq', 'visual-count-mcq',
]);

const LISTEN_PROMPT = /^\s*(listen|nghe)\b|\blisten and\b|\blisten to\b/i;
const READ_PROMPT = /read the (passage|text|email|letter|note|dialogue|story|paragraph|following)/i;
const VISUAL_TYPES = new Set(['word-to-image-mcq', 'image-to-word-mcq', 'visual-mcq', 'visual-count-mcq']);
const QUOTED = /[“"']([^“”"']{1,60})[”"']/;
const VN_MARK = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const TEMPLATE_RESIDUE = [
  /đáp án phù hợp với ngữ cảnh/i,
  /chọn câu (trả lời )?phù hợp/i,
  /thông tin phù hợp với kiến thức/i,
  /^có nhiều đáp án đúng/i,
  /đáp án đúng:?$/i,
];
const AMBIGUOUS_NAMES = new Set(['Bosnia', 'Congo', 'Korea', 'America']);

const questions = await fetchTable('qb_questions',
  'id,grade,subject,question_type,prompt_text,transcript,passage,choices,answer,explanation_vi,publication_policy,review_status,variant_group_id');
const links = await fetchTable('qb_question_assets', 'question_id');
const assetCount = new Map();
for (const l of links) assetCount.set(l.question_id, (assetCount.get(l.question_id) ?? 0) + 1);

const eligible = (q) => q.publication_policy?.practiceEligible || q.publication_policy?.examEligible || q.publication_policy?.mockEligible;
const correctLabel = (q) => {
  const a = q.answer ?? {};
  if (a.index !== undefined && Array.isArray(q.choices)) return choiceLabel(q.choices[a.index]);
  if (a.text) return String(a.text);
  if (a.boolean !== undefined) return String(a.boolean);
  return '';
};

const findings = [];
function check(name, severity, desc, rows) {
  findings.push({ name, severity, desc, count: rows.length, samples: rows.slice(0, 12) });
  return rows;
}

/* ---------- A. context integrity ---------- */

check('listen-no-transcript', 'P0',
  'Prompt says Listen but no transcript/audio - unanswerable',
  questions.filter((q) => eligible(q) && SERVED_TYPES.has(q.question_type) && LISTEN_PROMPT.test(q.prompt_text ?? '') && !q.transcript));

check('read-no-passage', 'P0',
  'Prompt references a passage/text but none stored - unanswerable',
  questions.filter((q) => eligible(q) && READ_PROMPT.test(q.prompt_text ?? '') && !q.passage && !q.transcript));

check('visual-no-assets', 'P0',
  'Image question type with no linked assets',
  questions.filter((q) => eligible(q) && VISUAL_TYPES.has(q.question_type) && !assetCount.get(q.id)));

/* ---------- B. answer integrity ---------- */

check('answer-out-of-range', 'P0',
  'answer.index points outside choices array',
  questions.filter((q) => Array.isArray(q.choices) && q.answer?.index !== undefined && (q.answer.index < 0 || q.answer.index >= q.choices.length)));

check('choices-too-few', 'P0',
  'MCQ-type with fewer than 3 choices',
  questions.filter((q) => eligible(q) && q.question_type?.endsWith('mcq') && Array.isArray(q.choices) && q.choices.length < 3));

check('option-placeholder', 'P0',
  'A choice is a literal generator placeholder like "option-4"',
  questions.filter((q) => eligible(q) && Array.isArray(q.choices) && q.choices.some((c) => typeof c === 'string' && /^option-\d+$/.test(c))));

check('duplicate-choices', 'P1',
  'Two identical choices in one question',
  questions.filter((q) => {
    if (!Array.isArray(q.choices)) return false;
    const labels = q.choices.map((c) => choiceLabel(c).toLowerCase());
    return new Set(labels).size !== labels.length;
  }));

check('prompt-answer-leak', 'P0',
  'Prompt literally contains the quoted correct answer (guessable without skill)',
  questions.filter((q) => {
    if (!eligible(q) || q.question_type === 'word-to-image-mcq' || q.question_type === 'image-to-word-mcq') return false;
    const ans = correctLabel(q);
    if (!ans || ans.length < 3 || /^(True|False)$/i.test(ans)) return false;
    const m = (q.prompt_text ?? '').match(QUOTED);
    return m && m[1].trim().toLowerCase() === ans.trim().toLowerCase();
  }));

/* ---------- C. explanation quality ---------- */

check('explanation-missing', 'P0',
  'No explanation at all',
  questions.filter((q) => eligible(q) && !q.explanation_vi?.trim()));

check('explanation-too-short', 'P1',
  'Explanation under 20 chars - teaches nothing',
  questions.filter((q) => eligible(q) && q.explanation_vi && q.explanation_vi.trim().length < 20));

check('explanation-template-residue', 'P0',
  'Leftover generator template text',
  questions.filter((q) => eligible(q) && TEMPLATE_RESIDUE.some((re) => re.test(q.explanation_vi ?? ''))));

check('explanation-mentions-other-answer', 'P1',
  'Explanation quotes a DIFFERENT choice than the correct answer (heuristic mismatch)',
  questions.filter((q) => {
    if (!eligible(q) || !Array.isArray(q.choices) || q.answer?.index === undefined) return false;
    const m = (q.explanation_vi ?? '').match(QUOTED);
    if (!m) return false;
    const quoted = m[1].trim().toLowerCase();
    const labels = q.choices.map((c) => choiceLabel(c).toLowerCase());
    const correct = correctLabel(q).toLowerCase();
    return labels.includes(quoted) && quoted !== correct;
  }));

check('explanation-not-vietnamese', 'P1',
  'Explanation has no Vietnamese characters (untranslated?)',
  questions.filter((q) => eligible(q) && q.explanation_vi && q.explanation_vi.length > 15 && !VN_MARK.test(q.explanation_vi)));

/* ---------- D. content sanity ---------- */

check('prompt-placeholder', 'P0',
  'Prompt contains placeholder tokens (undefined/null/TODO)',
  questions.filter((q) => /\b(undefined|null|TODO|FIXME|lorem)\b/i.test(q.prompt_text ?? '')));

check('dup-prompt-same-grade', 'P2',
  'Identical prompt+answer that can co-appear in one exam (no shared variant_group_id)',
  (() => {
    const byKey = new Map();
    for (const q of questions) {
      if (!eligible(q)) continue;
      const k = `${q.grade}|${q.subject}|${(q.prompt_text ?? '').trim().toLowerCase()}|${correctLabel(q).toLowerCase()}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(q);
    }
    const flagged = [];
    for (const g of byKey.values()) {
      if (g.length < 2) continue;
      const vgs = new Set(g.map((q) => q.variant_group_id));
      if (!(vgs.size === 1 && [...vgs][0])) flagged.push(...g);
    }
    return flagged;
  })());

check('ambiguous-country-name', 'P2',
  'Correct answer or prompted term is an ambiguous country name (Congo/Korea/Bosnia...)',
  questions.filter((q) => {
    if (!eligible(q)) return false;
    const term = (q.prompt_text ?? '').match(/Which picture shows: (.+)\?/)?.[1]
      ?? (q.prompt_text ?? '').match(/The picture shows [“"](.+?)[”"]\./)?.[1]
      ?? correctLabel(q);
    return [...AMBIGUOUS_NAMES].some((n) => n.toLowerCase() === String(term).trim().toLowerCase());
  }));

check('accented-text', 'P2',
  'Non-ASCII beyond punctuation/math in served prompt or choices',
  questions.filter((q) => {
    if (!eligible(q)) return false;
    const t = (q.prompt_text ?? '') + JSON.stringify(q.choices ?? []);
    return /[ñçãõÅéíüî]/i.test(t);
  }));

/* ---------- report ---------- */

const sevOrder = { P0: 0, P1: 1, P2: 2 };
findings.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || b.count - a.count);

const md = [
  `# Question Bank Content Audit`,
  ``,
  `Generated: ${new Date().toISOString()} · rows: ${questions.length} · regenerate: \`node scripts/qb-content-audit.mjs\``,
  ``,
  `| Check | Sev | Count | What it catches |`,
  `|---|---|---|---|`,
  ...findings.map((f) => `| \`${f.name}\` | ${f.severity} | **${f.count}** | ${f.desc} |`),
  ``,
  ...findings.filter((f) => f.count).flatMap((f) => [
    `## ${f.name} (${f.severity}) - ${f.count} rows`,
    ``,
    ...f.samples.map((q) => `- \`${q.id}\` — ${(q.prompt_text ?? '').slice(0, 90)} → **${correctLabel(q)}**`),
    f.count > f.samples.length ? `- _…and ${f.count - f.samples.length} more (see --json)_` : '',
    ``,
  ]),
].join('\n');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, md);
  console.log(findings.map((f) => `${f.severity} ${f.name}: ${f.count}`).join('\n'));
  console.log(`\nreport: ${REPORT}`);
}

if (process.argv.includes('--strict') && findings.some((f) => f.severity === 'P0' && f.count > 0)) {
  process.exit(1);
}
