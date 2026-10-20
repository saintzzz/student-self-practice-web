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
const CONCURRENCY = Number(arg('--concurrency', 2)); // free tier rate limits
const BATCH = Number(arg('--batch', 20));           // items per AI call                                    // items per AI call

// ---------- secrets ----------
let env = {};
try {
  const envFile = readFileSync(join(HERE, '../../so-chu-nhiem/.env.local'), 'utf8');
  env = Object.fromEntries(envFile.split('\n').filter((l) => l.includes('=')).map((l) => l.split('=')));
} catch { /* sibling env optional */ }
let OR_KEY = (env.OPENAI_API_KEY || '').trim();
if (!OR_KEY) {
  // openrouter key stored in devin secrets dir (%APPDATA%/devin/secrets)
  for (const p of [
    join(process.env.APPDATA ?? '', 'devin/secrets/openrouter_api_key'),
    join(homedir(), '.config/devin/secrets/openrouter_api_key'),
  ]) {
    try { OR_KEY = readFileSync(p, 'utf8').trim(); if (OR_KEY) break; } catch { /* next */ }
  }
}
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
- THE CRITICAL RULE: the correct answer must be the ONLY defensible option. Three distractors must be provably wrong, not just less likely. Never write prompts where fit is subjective or adjective-dependent (e.g. "A big ___" - giraffe and elephant both fit). Every question must have a verifiable single answer.
- Cloze/gap items: the missing word must be the only word that completes the sentence correctly, both grammatically and semantically.
- No two items ask the same thing. Vary vocabulary within the topic.
- Question text must be self-contained and unambiguous without pictures. FORBIDDEN prompt shapes: "What is this?", "Look! ...", "Point to...", "Which picture..." - anything needing an image to resolve. Questions must name or describe the target in words (e.g. "What do you write with?", "Which animal says 'meow'?").
- Vary the position of the correct answer across items - do not always put it first.
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
  if (typeof it.q !== 'string' || it.q.length < 10) return false;
  // image-dependent prompts are unanswerable in text form (audit reject class)
  if (/what is this|look!?|point to|which picture|in the picture|nhìn hình/i.test(it.q)) return false;
  return Array.isArray(it.c) && it.c.length === 4 && new Set(it.c).size === 4 &&
    new Set(it.c.map((x) => String(x).toLowerCase().trim())).size === 4 &&
    Number.isInteger(it.a) && it.a >= 0 && it.a <= 3 &&
    typeof it.ex === 'string' && it.ex.length > 5 && typeof it.lo === 'string';
}

function toRow(it, grade) {
  const questionType = it.tf ? 'true-false' : it.ro ? 'reorder' : 'mcq';
  const promptText = it.tf ? 'Read the passage. True or False?' : it.ro ? 'Rearrange the words to make a correct sentence.' : it.q;
  const idKey = it.q ?? it.statement ?? it.text;
  const id = `g${grade}-${SUBJECT}-bulk-${createHash('sha1').update(`${grade}|${SUBJECT}|${idKey}`).digest('hex').slice(0, 12)}`;
  // deterministic choice shuffle - models default to answer index 0 which is a
  // positional tell; rotate options by hash so the correct slot spreads evenly.
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
    signal: AbortSignal.timeout(150000),
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

// free OpenRouter models first (rate-limited but zero-cost), paid flash-lite
// last as credit may be thin. A failing model falls through to the next.
const MODELS = (arg('--models', 'minimax/minimax-m3.1-flash:free,nvidia/nemotron-3-super-120b-a12b:free,google/gemini-2.5-flash-lite')).split(',');
const CHECK_MODEL = arg('--check-model', 'minimax/minimax-m3.1-flash:free');

async function callOpenRouter(grade, topic, batchIdx, attempt) {
  for (const model of MODELS) {
    const res = await fetch(`${OR_BASE}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(150000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OR_KEY}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You output only valid strict JSON arrays - double-quoted keys, no comments, no trailing commas, no markdown fences.' },
          { role: 'user', content: promptFor(grade, topic, batchIdx) + (attempt > 0 ? `\n\nIMPORTANT: output must be a raw JSON array, nothing else.` : '') },
        ],
        temperature: 0.9,
        max_tokens: 12000,
        reasoning: { effort: 'low' }, // reasoning models burn the token budget otherwise
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429 || res.status >= 500) continue; // rate-limited -> next model
      console.error(`  HTTP ${res.status} [${model}] ${t.slice(0, 100)}`);
      if (res.status === 402 && GEM_KEY) return { retry: false, text: '', fallback: true };
      continue;
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    if (parseItems(text).length) return { retry: false, text };
    // empty parse -> try next model rather than return nothing
  }
  return { retry: true, text: '' }; // all models busy -> caller backs off
}

function parseItems(text) {
  const clean = text.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim();
  const start = clean.indexOf('['); const end = clean.lastIndexOf(']');
  if (start < 0 || end < 0) return [];
  try { const arr = JSON.parse(clean.slice(start, end + 1)); return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

/**
 * Second-pass self-solve: the model re-answers each MCQ without seeing the
 * declared answer. Items whose self-solve disagrees with the declared `a`
 * are dropped - this is the same ambiguity check the audit pipeline applied
 * when it rejected ~50% of the earlier bulk wave.
 */
async function selfCheck(items) {
  const mcqs = items.filter((it) => !it.tf && !it.ro);
  if (!mcqs.length) return items;
  const qs = mcqs.map((it, i) => `${i}. ${it.q}\n   A.${it.c[0]} B.${it.c[1]} C.${it.c[2]} D.${it.c[3]}`).join('\n');
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(150000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OR_KEY}` },
    body: JSON.stringify({
      model: CHECK_MODEL,
      messages: [
        { role: 'system', content: 'You answer multiple-choice questions. Output ONLY a JSON array of integers (0-3), the index of the single correct answer per item, in order.' },
        { role: 'user', content: `Answer each question. If a question has no single clear answer, output -1 for it.\n\n${qs}` },
      ],
      temperature: 0,
      max_tokens: 2000,
      reasoning: { effort: 'low' },
    }),
  });
  if (!res.ok) return items; // self-check offline -> keep, server audit still gates
  const m = (await res.json()).choices?.[0]?.message?.content ?? '';
  let picks = [];
  const s = m.indexOf('['); const e = m.lastIndexOf(']');
  if (s >= 0 && e > s) { try { picks = JSON.parse(m.slice(s, e + 1)); } catch { picks = []; } }
  if (!picks.length) {
    // tolerant parse: "1. A" / "2. B" style lines -> indices (undefined = unparsed)
    picks = mcqs.map((_, i) => {
      const mm = m.match(new RegExp(`${i + 1}[.\\)]\\s*([A-D])`));
      return mm ? mm[1].charCodeAt(0) - 65 : undefined;
    });
  }
  if (picks.every((v) => v === undefined)) return items; // checker output unusable
  if (!Array.isArray(picks) || picks.length !== mcqs.length) return items;
  const drop = new Set();
  // drop on declared-answer mismatch or checker-flagged ambiguity (-1);
  // keep on unparsed checker output (undefined) - don't punish parse noise.
  mcqs.forEach((it, i) => { if (picks[i] !== undefined && picks[i] !== it.a) drop.add(it); });
  return items.filter((it) => !drop.has(it));
}

async function genBatch(grade, topic, batchIdx) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await callOpenRouter(grade, topic, batchIdx, attempt);
      if (r.retry) { process.stdout.write(`  [${topic}] attempt${attempt} all-models-busy\n`); await new Promise((x) => setTimeout(x, 3000 * (attempt + 1))); continue; }
      if (r.fallback && GEM_KEY) {
        const items = parseItems(await callGemini(promptFor(grade, topic, batchIdx)));
        if (items.length) return items;
        continue;
      }
      const parsed = parseItems(r.text);
      const kept = await selfCheck(parsed);
      process.stdout.write(`  [${topic}] gen ${parsed.length} -> selfcheck ${kept.length}\n`);
      return kept;
    } catch (e) {
      console.error(`  [${topic}] call fail a${attempt}: ${String(e).slice(0, 80)}`);
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
      Prefer: 'resolution=ignore-duplicates,return=minimal,count=exact',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) { console.error('  push fail', res.status, (await res.text()).slice(0, 200)); return -1; }
  // count rows actually inserted, not attempted - "0" is a valid count
  // and a missing content-range is a failure (external-review r5).
  const range = res.headers.get('content-range') ?? '';
  const n = Number(range.split('/')[1]);
  if (!Number.isFinite(n)) {
    console.error(`  push fail: missing content-range count (got "${range}")`);
    return -1;
  }
  return n;
}

// ---------- existing count ----------
async function countGrade(grade) {
  // count only rows that actually SERVE (practice or mock eligible) - rejected
  // quarantine rows must not eat into the regen target.
  const res = await fetch(
    `${SUPA}/rest/v1/qb_questions?select=id&canonical=eq.true&subject=eq.${SUBJECT}&grade=eq.${grade}` +
      `&or=(publication_policy->>practiceEligible.eq.true,publication_policy->>mockEligible.eq.true)`,
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
      let inserted = fresh.length;
      if (!DRY) {
        inserted = 0;
        for (let c = 0; c < fresh.length; c += 500) {
          const n = await push(fresh.slice(c, c + 500));
          if (n < 0) {
            console.error(`G${grade}: push batch failed - aborting run`);
            process.exit(1);
          }
          inserted += n;
        }
      }
      gradeRows += inserted; totalPushed += inserted;
      console.log(`G${grade}: +${inserted} inserted / ${fresh.length} attempted (total new ${gradeRows}/${need})`);
      log.push({ grade, at: new Date().toISOString(), added: inserted });
      mkdirSync(join(HERE, 'gen-bulk-out'), { recursive: true });
      writeFileSync(join(HERE, 'gen-bulk-out', `progress-${SUBJECT}.json`), JSON.stringify(log, null, 1));
    }
    if (fresh.length === 0 && batchIdx > topics.length * 4) {
      console.log(`G${grade}: no fresh items after ${batchIdx} calls - stopping`);
      break;
    }
  }
}

const GRADES = (arg('--grades', '1,2,3,4,5')).split(',').map(Number);
for (const g of GRADES) {
  await runGrade(g);
}
console.log(`DONE ${SUBJECT}: pushed ${totalPushed} new items${DRY ? ' (dry run)' : ''}`);
