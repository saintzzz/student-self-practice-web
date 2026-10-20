// Question generator via the shared LLM channel (codex primary, gemini-web
// fallback - see scripts/llm-channel.mjs). Zero API credits either way.
// Usage: node scripts/gen-codex-bank.mjs [--grades 3,4,5] [--per-topic 40] [--workers 3] [--provider auto|codex|gemini] [--dry]
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createLlmChannel } from './llm-channel.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const GRADES = (arg('--grades', '1,2,3,4,5')).split(',').map(Number);
const PER_TOPIC = Number(arg('--per-topic', '40'));
const WORKERS = Number(arg('--workers', '3'));
const TIER = arg('--tier', 'advanced'); // advanced=d4-5 niche topics | core=full bank d1-5 curriculum topics
const TARGET = Number(arg('--target', '0')); // core mode: top-up each grade to this eligible count
const BATCH = Number(arg('--batch', '15'));
const PROVIDER = arg('--provider', 'auto'); // auto = codex first, gemini-web fallback

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };
const HW = { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json', Prefer: 'count=exact,resolution=ignore-duplicates' };

// Core curriculum matrix - same as gen-bulk-bank (Global Success aligned).
const CORE_TOPICS = {
  1: ['school objects', 'colors', 'numbers 1-10', 'family members', 'body parts', 'pets and animals', 'toys', 'food basics', 'clothes basics', 'greetings', 'feelings', 'actions'],
  2: ['weather', 'clothes', 'rooms in the house', 'food and drink', 'jobs', 'days of the week', 'daily routines', 'sports', 'transport', 'abilities with can', 'playground', 'classroom language'],
  3: ['telling time', 'hobbies', 'months', 'school subjects', 'places and directions', 'sports activities', 'present simple', 'present continuous', 'prepositions of place', 'animals and habitats', 'shopping', 'families and homes'],
  4: ['past simple', 'daily routines', 'festivals Tet Mid-Autumn', 'places in Vietnam', 'giving directions', 'health and illness', 'comparatives', 'weather and climate', 'school life', 'jobs and workplaces', 'food and meals', 'free time'],
  5: ['future plans will', 'environment protection', 'famous places in Vietnam', 'conditional sentences', 'comparatives superlatives', 'jobs and ambitions', 'technology devices', 'celebrations and festivals', 'health advice should', 'directions and transport', 'reading stories', 'nature and seasons'],
};
const LEVELS = {
  1: 'single words and very short sentences (max 6 words). Grammar: am/is/are, this/that, plurals, numbers to 10.',
  2: 'short sentences (max 8 words). Grammar: can/can\'t, there is/are, present continuous, like+V-ing, days.',
  3: 'sentences up to 12 words. Grammar: present simple/continuous, prepositions, how much/many, comparatives basic.',
  4: 'sentences up to 15 words. Grammar: past simple, be going to, comparatives/superlatives, wh-questions, some/any.',
  5: 'sentences up to 18 words. Grammar: will future, should, conditional type 1, relative that/who basic, reported speech feel.',
};

// Advanced themes per grade - harder than the core matrix on purpose.
const ADV_TOPICS = {
  1: ['odd one out', 'rhyming words', 'count and compare', 'letter patterns', 'mixed vocabulary review'],
  2: ['odd one out', 'rhyming and spelling', 'comparisons big small fast slow', 'simple sentence puzzles', 'mixed review units'],
  3: ['grammar traps subject-verb', 'reading inference short passages', 'word families', 'prepositions in context', 'mixed review units'],
  4: ['grammar traps tense and agreement', 'reading inference passages', 'vocabulary in context cloze', 'sentence transformation reorder', 'cross-topic review'],
  5: ['advanced grammar conditionals passive', 'reading inference longer passages', 'idioms and everyday expressions', 'word formation', 'cross-topic review'],
};

function promptFor(grade, topic, n) {
  if (TIER === 'core') {
    const ex = (EXEMPLARS[grade] ?? []).map((e) => ({ q: e.prompt_text, c: e.choices, a: e.answer, ex: e.explanation_vi }));
    const exBlock = ex.length ? `\nSTYLE EXAMPLES (approved items - match this quality/tone, do not copy content):\n${JSON.stringify(ex)}` : '';
    return `Output ONLY a raw JSON array (no markdown fences, no commentary) of ${n} English practice questions for Vietnamese grade-${grade} students (age ${grade + 5}-${grade + 6}), topic: "${topic}", Global Success curriculum.
Language level: ${LEVELS[grade]}${exBlock}
Mix item shapes across the batch:
- {"q":"question","c":["a","b","c","d"],"a":index,"ex":"Vietnamese explanation","lo":"Vietnamese objective","d":1-5,"top":"${topic}"} for MCQ
- {"ro":true,"tokens":["w1","w2","w3"],"text":"w1 w2 w3.","ex":"...","lo":"...","d":2,"top":"${topic}"} for reorder
- {"tf":true,"passage":"short passage 2-3 sentences","statement":"statement","bool":true/false,"ex":"...","lo":"...","d":2,"top":"${topic}"} for true-false
RULES:
- exactly one clearly correct answer; three distractors provably wrong, not just less likely
- NEVER write prompts where fit is subjective or adjective-dependent ("A big ___" fails - giraffe and elephant both fit)
- cloze items: the missing word must be the ONLY word that completes the sentence grammatically AND semantically
- NO image-dependent prompts (no "what is this", "look", "which picture") - self-contained text only
- ex and lo in Vietnamese, friendly kid tone, hyphen '-' only
- vary correct-answer position; vary vocabulary within the topic; no two items ask the same thing
- difficulty d spreads 1-5 across the batch (mostly 1-3 for g1-2, include some 4-5 for g3-5)`;
  }
  return `Output ONLY a raw JSON array (no markdown fences, no commentary) of ${n} ADVANCED English questions for Vietnamese grade-${grade} students (top ~10% difficulty for the grade, theme: "${topic}", Global Success curriculum).
Mix item shapes across the batch:
- {"q":"question","c":["a","b","c","d"],"a":index,"ex":"Vietnamese explanation","lo":"objective","d":4,"top":"${topic}"} for MCQ
- {"ro":true,"tokens":["w1","w2","w3"],"text":"w1 w2 w3.","ex":"...","lo":"...","d":4,"top":"${topic}"} for reorder
- {"tf":true,"passage":"short passage 2-3 sentences","statement":"statement","bool":true/false,"ex":"...","lo":"...","d":4,"top":"${topic}"} for true-false
RULES:
- exactly one clearly correct answer; distractors must be plausible but wrong
- NO image-dependent prompts (no "what is this", "look", "which picture")
- self-contained: all needed info inside the prompt text
- child-safe Vietnamese+English only; ex must teach WHY, in Vietnamese
- d must be 4 or 5 - these are advanced items, no giveaway answers
- reorder: 4-9 tokens, exactly one grammatical ordering
- true-false: passage must contain the fact; statement unambiguous`;
}

function validItem(it) {
  if (it.tf) return typeof it.passage === 'string' && it.passage.length > 10 && typeof it.statement === 'string' && typeof it.bool === 'boolean' && typeof it.ex === 'string' && it.ex.length > 5;
  if (it.ro) {
    if (!Array.isArray(it.tokens) || it.tokens.length < 3 || typeof it.text !== 'string' || typeof it.ex !== 'string') return false;
    const norm = (s) => s.toLowerCase().replace(/[.!?,;:'"]/g, '').replace(/\s+/g, ' ').trim();
    return norm(it.tokens.join(' ')) === norm(it.text);
  }
  if (typeof it.q !== 'string' || it.q.length < 10) return false;
  if (/what is this|look!?|point to|which picture|in the picture|nhìn hình/i.test(it.q)) return false;
  return Array.isArray(it.c) && it.c.length === 4 && new Set(it.c).size === 4 &&
    new Set(it.c.map((x) => String(x).toLowerCase().trim())).size === 4 &&
    Number.isInteger(it.a) && it.a >= 0 && it.a <= 3 &&
    typeof it.ex === 'string' && it.ex.length > 5;
}

function toRow(it, grade, provider) {
  const questionType = it.tf ? 'true-false' : it.ro ? 'reorder' : 'mcq';
  const promptText = it.tf ? 'Read the passage. True or False?' : it.ro ? 'Rearrange the words to make a correct sentence.' : it.q;
  const idKey = it.q ?? it.statement ?? it.text;
  const id = `g${grade}-english-${provider}-${createHash('sha1').update(`${grade}|${idKey}`).digest('hex').slice(0, 12)}`;
  let choices = it.ro ? null : it.tf ? ['True', 'False'] : [...it.c];
  let answer;
  if (it.tf) answer = { boolean: it.bool };
  else if (it.ro) answer = { text: it.text };
  else {
    const shift = parseInt(createHash('sha1').update(id).digest('hex').slice(0, 2), 16) % 4;
    choices = choices.map((_, i) => it.c[(i + shift) % 4]);
    answer = { text: it.c[it.a], index: (it.a - shift + 4) % 4 };
  }
  const contentHash = createHash('sha1').update(JSON.stringify([promptText, choices, answer, it.passage ?? null])).digest('hex').slice(0, 16);
  return {
    id, grade, subject: 'english', domain: it.tf ? 'reading' : it.ro ? 'writing' : 'grammar',
    skill: it.tf ? 'reading' : it.ro ? 'writing' : 'grammar-use-of-english',
    question_type: questionType, difficulty: TIER === 'core' ? Math.min(5, Math.max(1, it.d ?? 2)) : Math.min(5, Math.max(4, it.d ?? 4)),
    topic_key: (it.top ?? 'advanced').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
    prompt_text: promptText.slice(0, 500), transcript: null, choices, answer,
    explanation_vi: String(it.ex).slice(0, 500), learning_objective: String(it.lo ?? '').slice(0, 200),
    curriculum_alignment: { grade, coreTopic: it.top ?? TIER, moetSubject: 'English', alignmentLevel: 'topic-skill', curriculumRole: TIER === 'core' ? 'core' : 'advanced', primaryFramework: 'MOET-2018' },
    tags: TIER === 'core' ? null : ['advanced'], canonical: true, variant_group_id: null, rights_status: 'owned-original-generated',
    review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
    publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: true },
    content_hash: contentHash,
    source: { kind: 'generated-v6', method: `${provider}-${TIER}`, provenance: `AI-drafted via ${provider} (subscription); schema-validated; original.` },
    schema_version: '6.0', passage: it.passage ?? null, statement: it.statement ?? null, tokens: it.ro ? it.tokens : null,
  };
}

const channel = createLlmChannel({ workers: WORKERS, provider: PROVIDER });

function parseOut(stdout) {
  const m = stdout.match(/\[[\s\S]*\]/g);
  if (!m) throw new Error('no-json');
  for (let i = m.length - 1; i >= 0; i--) {
    try { const arr = JSON.parse(m[i]); if (Array.isArray(arr) && arr.length) return arr; } catch { }
  }
  throw new Error('parse-fail');
}

async function push(rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const res = await fetch(`${URL}/rest/v1/qb_questions`, { method: 'POST', headers: HW, body: JSON.stringify(rows.slice(i, i + 200)) });
    if (!res.ok) { console.log('insert err', res.status, (await res.text()).slice(0, 160)); return; }
  }
}

async function countGrade(grade) {
  const res = await fetch(
    `${URL}/rest/v1/qb_questions?select=id&canonical=eq.true&subject=eq.english&grade=eq.${grade}` +
    `&or=(publication_policy->>practiceEligible.eq.true,publication_policy->>mockEligible.eq.true)`,
    { headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice', Prefer: 'count=exact' }, method: 'HEAD' });
  const range = res.headers.get('content-range');
  return range ? Number(range.split('/')[1]) : 0;
}

// few-shot exemplars: pull already-approved items per grade so new batches
// copy the house style instead of drifting (user's "gen theo mẫu" idea).
const EXEMPLARS = {};
async function loadExemplars() {
  for (const g of GRADES) {
    const res = await fetch(
      `${URL}/rest/v1/qb_questions?select=question_type,prompt_text,choices,answer,explanation_vi` +
      `&grade=eq.${g}&subject=eq.english&review_status=eq.approved&question_type=eq.mcq&limit=3&order=id`,
      { headers: H });
    EXEMPLARS[g] = res.ok ? await res.json() : [];
  }
}
await loadExemplars();

const tasks = [];
if (TIER === 'core' && TARGET > 0) {
  for (const g of GRADES) {
    const have = await countGrade(g);
    const need = Math.max(0, TARGET - have);
    const nB = Math.ceil(need / BATCH);
    const topics = CORE_TOPICS[g] ?? [];
    for (let b = 0; b < nB; b++) tasks.push({ g, t: topics[b % topics.length], b });
    console.log(`G${g}: existing=${have} need=${need} -> ${nB} batches`);
  }
} else {
  for (const g of GRADES) for (const t of ADV_TOPICS[g] ?? []) {
    const n = Math.ceil(PER_TOPIC / BATCH);
    for (let b = 0; b < n; b++) tasks.push({ g, t, b });
  }
}
console.log(`llm-bank: ${tasks.length} batches x~${BATCH} across grades ${GRADES} (provider=${PROVIDER})`);
if (DRY) {
  const { text } = await channel.call(promptFor(GRADES[0], (TIER === 'core' ? CORE_TOPICS : ADV_TOPICS)[GRADES[0]][0], BATCH));
  console.log(JSON.stringify(parseOut(text).slice(0, 3), null, 1));
  await channel.close();
  process.exit(0);
}

let done = 0, inserted = 0;
const queue = [...tasks];
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (queue.length) {
    const job = queue.shift();
    try {
      const { text, provider } = await channel.call(promptFor(job.g, job.t, BATCH));
      const items = parseOut(text).filter(validItem);
      const rows = items.map((it) => toRow(it, job.g, provider));
      if (rows.length && !DRY) { await push(rows); inserted += rows.length; }
      done++;
      if (done % 5 === 0) console.log(`  ${done}/${tasks.length} batches, ${inserted} rows`);
    } catch (e) {
      done++;
      const msg = String(e.message ?? e).slice(0, 80);
      console.log(`  [g${job.g} ${job.t}] fail: ${msg}`);
      if (/rate-limited|usage limit/i.test(msg)) { queue.unshift(job); await new Promise((r) => setTimeout(r, 300_000)); }
    }
  }
}));
await channel.close();
console.log(`DONE llm-bank: ${inserted} rows inserted (codex=${channel.counts.codex} gemini=${channel.counts.gemini})`);
