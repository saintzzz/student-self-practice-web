#!/usr/bin/env node
/**
 * CR-67 - deterministic image questions from existing concept assets.
 * No AI needed: qb_assets -> image-to-word-mcq / word-to-image-mcq rows +
 * qb_question_assets links. Grade assigned by word complexity.
 *
 *   node scripts/gen-visual-bank.mjs          (push)
 *   node scripts/gen-visual-bank.mjs --dry
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');
const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url;
const SVC = keys.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };

// Deterministic PRNG seeded per asset id - reruns must mint identical rows.
const seedOf = (s) => {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const mulberry = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Simple words -> G1-2, medium -> G3, hard -> G4-5
function gradeFor(word, rnd) {
  const len = word.replace(/[^a-z]/g, '').length;
  if (len <= 5 && !word.includes(' ')) return rnd() < 0.5 ? 1 : 2;
  if (len <= 8 && !word.includes(' ')) return 3;
  if (len <= 12) return 4;
  return 5;
}

const label = (assetId) => assetId.replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');

async function post(table, rows) {
  const res = await fetch(`${SUPA}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal,count=exact' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error(`push ${table} fail`, res.status, (await res.text()).slice(0, 200)); return false; }
  // report the true inserted count - a missing content-range is a failure
  // and "0" is a legitimate count (r5).
  const range = res.headers.get('content-range') ?? '';
  const n = Number(range.split('/')[1]);
  if (!Number.isFinite(n)) {
    console.error(`push ${table} fail: missing content-range count (got "${range}")`);
    return false;
  }
  console.log(`push ${table}: inserted ${n} / ${rows.length} attempted`);
  return true;
}

// Asset ids come from the file names in public/images/concepts/
// (qb_assets table is not readable by service_role; ids match filenames).
import { readdirSync } from 'node:fs';
const assetIds = readdirSync(join(HERE, '../public/images/concepts'))
  .filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, ''));
console.log(`${assetIds.length} concept assets`);
const labels = new Map(assetIds.map((id) => [id, label(id)]));
// distractor pool: prefer words of similar length
const byLen = new Map();
for (const id of assetIds) {
  const l = labels.get(id).length;
  byLen.set(l, [...(byLen.get(l) || []), id]);
}

const qRows = [];
const linkRows = [];
const pub = { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: true };

function base(id, grade, type, diff, prompt, choices, answer, topic, lo, ex) {
  const contentHash = createHash('sha1').update(JSON.stringify([prompt, choices, answer])).digest('hex').slice(0, 16);
  return {
    id, grade, subject: 'english', domain: 'vocabulary', skill: 'vocabulary-recognition',
    question_type: type, difficulty: diff, topic_key: topic,
    prompt_text: prompt, transcript: null, choices, answer,
    explanation_vi: ex ?? 'Nhìn hình, nhớ từ vựng đã học rồi chọn đáp án đúng.',
    learning_objective: lo,
    curriculum_alignment: { grade, coreTopic: topic, moetSubject: 'English', alignmentLevel: 'topic-skill', curriculumRole: 'core', primaryFramework: 'MOET-2018' },
    tags: null, canonical: true, variant_group_id: null,
    rights_status: 'owned-original-generated',
    review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
    publication_policy: pub, content_hash: contentHash,
    source: { kind: 'generated-v6', method: 'cr67-visual-gen', provenance: 'Deterministic generation from self-hosted concept assets.' },
    schema_version: '6.0', passage: null, statement: null, tokens: null,
  };
}

function distractors(correctId, n, rnd, pool = assetIds) {
  const wantLen = labels.get(correctId).length;
  const near = pool.filter((id) => id !== correctId && Math.abs(labels.get(id).length - wantLen) <= 3);
  const pick = new Set();
  let guard = 0;
  while (pick.size < n && guard++ < 500) {
    const src = near.length >= n ? near : pool;
    pick.add(src[Math.floor(rnd() * src.length)]);
  }
  return [...pick];
}

// Deterministic shuffle seeded per question.
const detSort = (arr, rnd) => arr.map((v) => [rnd(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

let seq = 0;
for (const id of [...assetIds].sort()) {
  const word = labels.get(id);
  const rnd = mulberry(seedOf(id));
  const grade = gradeFor(word, rnd);
  const topic = 'visual-vocabulary';
  const hash = id.slice(-6);

  // image-to-word-mcq: 1 image, 4 word choices
  const wDistr = distractors(id, 3, rnd).map((d) => labels.get(d));
  const wChoices = detSort([word, ...wDistr], rnd);
  const wIdx = wChoices.indexOf(word);
  const qid1 = `g${grade}-cr67-i2w-${String(seq++).padStart(4, '0')}-${hash}`;
  qRows.push(base(qid1, grade, 'image-to-word-mcq', grade <= 2 ? 1 : 2,
    'Look at the picture. Choose the correct English word.',
    wChoices, { text: word, index: wIdx }, topic,
    `Nhận diện từ vựng "${word}" qua hình ảnh.`, `Hình này minh họa từ "${word}". Đáp án đúng là "${word}".`));
  linkRows.push({ question_id: qid1, sort_order: 0, asset_id: id });

  // word-to-image-mcq: 1 word, 4 image choices (correct + 3 distractors)
  const iDistr = distractors(id, 3, rnd);
  const iIds = detSort([id, ...iDistr], rnd);
  const iIdx = iIds.indexOf(id);
  const qid2 = `g${grade}-cr67-w2i-${String(seq++).padStart(4, '0')}-${hash}`;
  qRows.push(base(qid2, grade, 'word-to-image-mcq', grade <= 2 ? 1 : 2,
    `Which picture shows "${word}"?`,
    iIds.map((a) => ({ assetId: a })), { index: iIdx }, topic,
    `Chọn hình đúng cho từ "${word}".`, `Từ "${word}" tương ứng với hình ảnh đúng. Các hình còn lại minh họa từ khác.`));
  iIds.forEach((a, i) => linkRows.push({ question_id: qid2, sort_order: i, asset_id: a }));
}

console.log(`${qRows.length} questions, ${linkRows.length} asset links`);
if (!DRY) {
  let ok = true;
  for (let c = 0; c < qRows.length; c += 300) ok = (await post('qb_questions', qRows.slice(c, c + 300))) && ok;
  for (let c = 0; c < linkRows.length; c += 300) ok = (await post('qb_question_assets', linkRows.slice(c, c + 300))) && ok;
  console.log(ok ? 'pushed' : 'PUSH FAILED');
  if (!ok) process.exit(1);
}
