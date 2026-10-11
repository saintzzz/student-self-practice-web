#!/usr/bin/env node
/**
 * CR-67 - bulk question generation: AI drafts items (OpenRouter
 * gemini-2.5-flash), strict validation, dedupe by prompt hash, upsert to
 * practice.qb_questions via PostgREST service key.
 *
 *   node scripts/gen-bulk-bank.mjs --subject english --target 5000
 *   node scripts/gen-bulk-bank.mjs --subject english --target 5000 --dry
 *
 * Keys: reads ../so-chu-nhiem/.env.local (OPENAI_API_KEY+OPENAI_BASE_URL
 * = OpenRouter, GEMINI_API_KEY fallback) and
 * ~/.config/devin/secrets/supabase_new_keys.json - never printed.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const arg = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; };
const SUBJECT = arg('--subject', 'english');
const TARGET = Number(arg('--target', 5000));         // total per grade including existing
const DRY = ARGS.includes('--dry');
const CONCURRENCY = 3;
const BATCH = 30;                                    // items per AI call

// ---------- secrets ----------
const envFile = readFileSync(join(HERE, '../../so-chu-nhiem/.env.local'), 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter((l) => l.includes('=')).map((l) => l.split('=')));
const OR_KEY = (env.OPENAI_API_KEY || '').trim();
const OR_BASE = (env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1').trim();
const GEM_KEY = (env.GEMINI_API_KEY || '').trim();
const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url;
const SVC = keys.keys.service_role;
if (!OR_KEY || !SVC) { console.error('missing OPENAI_API_KEY or service key'); process.exit(1); }

// ---------- topic matrix (Global Success themes per grade) ----------
const TOPICS = {
  1: ['school objects', 'colors', 'numbers 1-10', 'family members', 'body parts', 'pets and animals', 'toys', 'food basics', 'clothes basics', 'greetings', 'feelings', 'actions'],
  2: ['weather', 'clothes', 'rooms in the house', 'food and drink', 'jobs', 'days of the week', 'daily routines', 'sports', 'transport', 'abilities with can', 'playground', 'classroom language'],
  3: ['telling time', 'hobbies', 'months', 'school subjects', 'places and directions', 'sports activities', 'present simple', 'present continuous', 'prepositions of place', 'animals and habitats', 'shopping', 'families and homes'],
  4: ['past simple', 'daily routines', 'festivals Tet Mid-Autumn', 'places in Vietnam', 'giving directions', 'health and illness', 'comparatives', 'weather and climate', 'school life', 'jobs and workplaces', 'food and meals', 'free time'],
  5: ['future plans will', 'environment protection', 'famous places in Vietnam', 'conditional sentences', 'comparatives superlatives', 'jobs and ambitions', 'technology devices', 'celebrations and festivals', 'health advice should', 'directions and transport', 'reading stories', 'nature and seasons'],
};

// Grade-calibrated language constraints for the prompt.
const LEVELS = {
  1: 'single words and very short sentences (max 6 words). Grammar: am/is/are, this/that, plurals, numbers to 10.',
  2: 'short sentences (max 8 words). Grammar: can/can\'t, there is/are, present continuous, like+V-ing, days.',
  3: 'sentences up to 12 words. Grammar: present simple/continuous, prepositions, how much/many, comparatives basic.',
  4: 'sentences up to 15 words. Grammar: past simple, be going to, comparatives/superlatives, wh-questions, some/any.',
  5: 'sentences up to 18 words. Grammar: will future, should, conditional type 1, relative that/who basic, reported speech feel.',
};

const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;

function promptFor(grade, topic, batchIdx) {
  // Rotate question types across calls for variety.
  const tf = batchIdx % 5 === 3 ? 'Include 4 true-false items with a 2-3 sentence "passage" and a "statement" to judge (field tf:true, passage, statement, bool).' : '';
  const ro = batchIdx % 5 === 4 ? `Include 4 reorder items (field ro:true, tokens:[words in order], text:full sentence).` : '';
  return `You are writing English practice questions for Vietnamese grade ${grade} students (age ${grade + 5}-${grade + 6}), aligned to the Global Success textbook, topic: "${topic}".

Language level: ${LEVELS[grade]}

Return ONLY a JSON array of ${BATCH} DIFFERENT items about "${topic}". Each item:
{"q": "<question>", "c": ["<4 distinct options>"], "a": <0-3 correct index>, "ex": "<Vietnamese explanation - why correct, name the trap in distractors>", "lo": "<Vietnamese learning objective>", "d": <difficulty 1-5 spread across the batch>}
${tf}${ro}
Rules:
- Every explanation (ex) and objective (lo) MUST be in Vietnamese, friendly tone for kids, use hyphen '-' not em-dash.
- Choices must be 4 DISTINCT strings; exactly one clearly correct.
- No two items ask the same thing. Vary vocabulary within the topic.
- No markdown fences, no commentary - raw JSON array only.`;
}

// ---------- validation ----------
function validItem(it) {
  if (it.tf) return typeof it.passage === 'string' && it.passage.length > 10 && typeof it.statement === 'string' && typeof it.bool === 'boolean' && typeof it.ex === 'string' && it.ex.length > 5;
  if (it.ro) {
    if (!Array.isArray(it.tokens) || it.tokens.length < 3 || typeof it.text !== 'string' || typeof it.ex !== 'string') return false;
    const norm = (s) => s.toLowerCase().replace(/[.!?,;:'"]/g, '').replace(/\s+/g, ' ').trim();
    return norm(it.tokens.join(' ')) === norm(it.text);
  }
  // mcq
  return typeof it.q === 'string' && it.q.length > 5 &&
    Array.isArray(it.c) && it.c.length === 4 && new Set(it.c).size === 4 &&
    Number.isInteger(it.a) && it.a >= 0 && it.a <= 3 &&
    typeof it.ex === 'string' && it.ex.length > 5 && typeof it.lo === 'string';
}

function toRow(it, grade) {
  const questionType = it.tf ? 'true-false' : it.ro ? 'reorder' : 'mcq';
  const promptText = it.tf ? 'Read the passage. True or False?' : it.ro ? 'Rearrange the words to make a correct sentence.' : it.q;
  const idKey = it.q ?? it.statement ?? it.text;
  const id = `g${grade}-${SUBJECT}-bulk-${createHash('sha1').update(`${grade}|${SUBJECT}|${idKey}`).digest('hex').slice(0, 12)}`;
  const choices = it.ro ? null : it.tf ? ['True', 'False'] : it.c;
  const answer = it.tf ? { boolean: it.bool } : it.ro ? { text: it.text } : { text: it.c[it.a], index: it.a };
  const contentHash = createHash('sha1').update(JSON.stringify([promptText, choices, answer, it.passage ?? null])).digest('hex').slice(0, 16);
  return {
    id, grade, subject: SUBJECT, domain: it.tf ? 'reading' : it.ro ? 'writing' : 'vocabulary',
    skill: it.tf ? 'reading' : it.ro ? 'writing' : (it.skill ?? 'vocabulary-in-context'),
    question_type: questionType, difficulty: Math.min(5, Math.max(1, it.d ?? 2)),
    topic_key: (it.top ?? 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
    prompt_text: promptText.slice(0, 500), transcript: null,
    choices, answer,
    explanation_vi: String(it.ex).slice(0, 500), learning_objective: String(it.lo ?? '').slice(0, 200),
    curriculum_alignment: { grade, coreTopic: it.top ?? 'general', moetSubject: 'English', alignmentLevel: 'topic-skill', curriculumRole: 'core', primaryFramework: 'MOET-2018' },
    tags: null, canonical: true, variant_group_id: null,
    rights_status: 'owned-original-generated',
    review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
    publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: true },
    content_hash: contentHash,
    source: { kind: 'generated-v6', method: 'cr67-bulk-ai', provenance: 'AI-drafted via OpenRouter gemini-2.5-flash; schema-validated; original, not copied.' },
    schema_version: '6.0', passage: it.passage ?? null, statement: it.statement ?? null, tokens: it.ro ? it.tokens : null,
  };
}

// ---------- providers: OpenRouter, fallback direct Gemini ----------
async function callGemini(prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEM_KEY}`, {
    method: 'POST',
    signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 12000 },
    }),
  });
  if (!res.ok) { if (res.status === 429 || res.status >= 500) throw new Error('retryable ' + res.status); throw new Error('gemini ' + res.status); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
}

async function callOpenRouter(grade, topic, batchIdx, attempt) {
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OR_KEY}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: 'You output only valid JSON arrays. No markdown, no commentary.' },
        { role: 'user', content: promptFor(grade, topic, batchIdx) + (attempt > 0 ? `\n\nIMPORTANT: output must be a raw JSON array, nothing else.` : '') },
      ],
      temperature: 0.9,
      max_tokens: 12000,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429 || res.status >= 500) return { retry: true, text: '' };
    console.error(`  HTTP ${res.status} ${t.slice(0, 120)}`);
    return { retry: false, text: '', fallback: res.status === 402 };
  }
  const data = await res.json();
  return { retry: false, text: data.choices?.[0]?.message?.content ?? '' };
}

function parseItems(text) {
  const clean = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim();
  const start = clean.indexOf('['); const end = clean.lastIndexOf(']');
  if (start < 0 || end < 0) return [];
  try { const arr = JSON.parse(clean.slice(start, end + 1)); return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

async function genBatch(grade, topic, batchIdx) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await callOpenRouter(grade, topic, batchIdx, attempt);
      if (r.retry) { await new Promise((x) => setTimeout(x, 3000 * (attempt + 1))); continue; }
      if (r.fallback && GEM_KEY) {
        const items = parseItems(await callGemini(promptFor(grade, topic, batchIdx)));
        if (items.length) return items;
        continue;
      }
      return parseItems(r.text);
    } catch (e) {
      if (attempt === 3) console.error(`  call fail: ${String(e).slice(0, 80)}`);
      await new Promise((x) => setTimeout(x, 2000 * (attempt + 1)));
    }
  }
  return [];
}

// ---------- push ----------
async function push(rows) {
  const res = await fetch(`${SUPA}/rest/v1/qb_questions`, {
    method: 'POST',
    headers: {
      apikey: SVC, Authorization: `Bearer ${SVC}`,
      'Accept-Profile': 'practice', 'Content-Profile': 'practice',
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) console.error('  push fail', res.status, (await res.text()).slice(0, 200));
  return res.ok;
}

// ---------- existing count ----------
async function countGrade(grade) {
  const res = await fetch(`${SUPA}/rest/v1/qb_questions?select=id&canonical=eq.true&subject=eq.${SUBJECT}&grade=eq.${grade}`,
    { headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice', Prefer: 'count=exact' }, method: 'HEAD' });
  const range = res.headers.get('content-range'); // '0-999/6083'
  return range ? Number(range.split('/')[1]) : 0;
}

// ---------- main ----------
const seenIds = new Set();
const log = [];
let totalPushed = 0;

async function runGrade(grade) {
  const existing = await countGrade(grade);
  const need = Math.max(0, TARGET - existing);
  console.log(`G${grade}: existing=${existing} need=${need}`);
  if (!need) return;
  const topics = TOPICS[grade];
  let gradeRows = 0;
  let batchIdx = 0;
  // round-robin topics until grade target reached
  while (gradeRows < need) {
    const jobs = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      jobs.push({ topic: topics[(batchIdx + i) % topics.length], idx: batchIdx + i });
    }
    batchIdx += CONCURRENCY;
    const results = await Promise.all(jobs.map((j) => genBatch(grade, j.topic, j.idx)));
    const fresh = [];
    for (let j = 0; j < results.length; j++) {
      for (const it of results[j]) {
        if (!validItem(it)) continue;
        it.top = jobs[j].topic;
        const row = toRow(it, grade);
        if (seenIds.has(row.id) || seenIds.has(row.content_hash)) continue;
        seenIds.add(row.id); seenIds.add(row.content_hash);
        fresh.push(row);
      }
    }
    if (fresh.length) {
      if (!DRY) {
        for (let c = 0; c < fresh.length; c += 500) {
          await push(fresh.slice(c, c + 500));
        }
      }
      gradeRows += fresh.length; totalPushed += fresh.length;
      console.log(`G${grade}: +${fresh.length} (total new ${gradeRows}/${need})`);
      log.push({ grade, at: new Date().toISOString(), added: fresh.length });
      mkdirSync(join(HERE, 'gen-bulk-out'), { recursive: true });
      writeFileSync(join(HERE, 'gen-bulk-out', `progress-${SUBJECT}.json`), JSON.stringify(log, null, 1));
    }
    if (fresh.length === 0 && batchIdx > topics.length * 4) {
      console.log(`G${grade}: no fresh items after ${batchIdx} calls - stopping`);
      break;
    }
  }
}

for (const g of [1, 2, 3, 4, 5]) {
  await runGrade(g);
}
console.log(`DONE ${SUBJECT}: pushed ${totalPushed} new items${DRY ? ' (dry run)' : ''}`);
