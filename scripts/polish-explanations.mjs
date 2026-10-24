// CR-111: restore Vietnamese diacritics + natural grammar in explanation_vi
// for the rows the audit flags (explanation-not-vietnamese). Explanations
// were template-generated undiacritized Vietnamese with machine-translation
// artifacts ("make lam chia thanh made") - kids deserve teacher-quality text.
// Uses the shared LLM channel (codex CLI primary, gemini-web fallback) -
// bulk content generation runs on subscription automation, never API keys.
//
// Two-phase contract (r130#2):
//   1. default run: generate proposals, validate, write a reviewable
//      before/after artifact to docs/qa/polish-edits-<ts>.jsonl - NO writes.
//   2. --apply <artifact.jsonl>: replay recorded proposals verbatim via
//      PATCH. The artifact is the independent-review / rollback / replay
//      record of every edit.
// Usage: node scripts/polish-explanations.mjs [--dry] [--limit N] [--workers 3]
//        node scripts/polish-explanations.mjs --apply docs/qa/polish-edits-*.jsonl
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLlmChannel, parseJsonArray } from './llm-channel.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const APPLY = arg('--apply', '');
const LIMIT = Number(arg('--limit', '0'));
const WORKERS = Number(arg('--workers', '3'));
const BATCH = Number(arg('--batch', '30'));

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };
const HW = { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json' };

const VN_MARK = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵĂÂĐÊÔƠƯÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ]/;
// Paired delimiters; an apostrophe inside a contraction ('can't', 'don't')
// is part of the token, not a closer - '(?=\w) keeps it internal (r131#2).
const QUOTED = /"([^"]+)"|'((?:[^']|'(?=\w))*)'|“([^”]+)”|‘((?:[^’]|’(?=\w))*)’/g;

// Diacritics-insensitive comparison (r132#1): an undiacritized VN gloss
// like 'khong the' quoted in the original must match its restored form
// 'không thể', so required-term checks compare stripped forms.
const stripVN = (s) => String(s ?? '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'd');

// Resolve the correct answer to its served label (r130#1): the model must
// see WHICH choice is right - a bare {index:N} without choices is unusable.
const correctLabel = (row) => {
  if (Array.isArray(row.choices) && row.answer?.index !== undefined) {
    const c = row.choices[row.answer.index];
    if (typeof c === 'string') return c;
  }
  return row.answer?.text ?? row.answer?.accepted?.[0] ?? '';
};

// English terms quoted in the ORIGINAL explanation are the taught vocab -
// a rewrite that drops or renames them loses the lesson (r130#1 validation).
// Every quoted term in the original must survive the rewrite in
// diacritics-insensitive form - English vocab stays verbatim, VN glosses
// may gain their marks back ('khong the' -> 'không thể' is a match).
const quotedTerms = (s) =>
  [...String(s ?? '').matchAll(QUOTED)]
    .map((m) => ({ term: (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').trim(), at: m.index ?? 0 }))
    .filter((q) => q.term);

// A quoted term in a DEFINING-GLOSS slot is Vietnamese regardless of how
// English its spelling looks: "'can' nghia la 'no'" makes 'no' a gloss
// that may be restored to 'nó' - 'la' alone is not a cue ('dap an la
// 'can'' keeps 'can' English). (r137#3)
const GLOSS_PRE = /(nghia la|co nghia|tuc)\s*$/i;
const GLOSS_POST = /^\s*(la|tuc)\s*(nghia|cua)\b/i;
const isGlossSlot = (src, at, end) =>
  GLOSS_PRE.test(src.slice(Math.max(0, at - 40), at)) ||
  GLOSS_POST.test(src.slice(end, end + 40));

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const boundaryRe = (t) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(t)}(?![\\p{L}\\p{N}])`, 'iu');

// Classify each quoted occurrence (r136, r137): neither the rewrite nor
// the question context is trusted - prompts may contain Vietnamese and
// the rewrite is what we are validating. The trusted English evidence is
// the bank's own taught vocabulary (all choice labels + answer texts)
// plus a core-word list. Preservation is checked PER WORD: a lexicon word
// inside ANY quote must survive literally with boundaries (so 'can snore'
// still protects 'can', and 'tense' cannot fake 'ten'); non-lexicon words
// must survive in stripped-boundary form; whole terms in gloss slots may
// be restored with diacritics.
const CORE_EN = new Set(('a an the i you he she it we they me him her us them my your his its our their ' +
  'am is are was were be been being do does did done have has had having will would shall should can could ' +
  'may might must ought need dare not no yes and or but if then than so such too very just only also even ' +
  'this that these those there here what which who whom whose when where why how in on at to for of with by ' +
  'from up down out off over under again once past simple present future tense singular plural verb noun ' +
  'adjective adverb pronoun preposition question answer sentence word letter sound picture story read write ' +
  'listen speak look choose correct wrong true false more most less least many much few some any all both ' +
  'each every other another same different first last next new old big small long short tall good bad happy ' +
  'sad like want go come get give take make see say know think tell ask use find put keep let begin show ' +
  'try turn play run walk eat drink sit stand open close say tell').split(' '));
const LEXICON = new Set(CORE_EN);
const lexWords = (s) => String(s ?? '').toLowerCase().split(/[^a-z']+/).filter(Boolean);
const addLex = (s) => lexWords(s).forEach((w) => LEXICON.add(stripVN(w)));

async function fetchTargets() {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const res = await fetch(
      `${URL}/rest/v1/qb_questions?select=id,grade,question_type,prompt_text,choices,answer,explanation_vi` +
      `&explanation_vi=not.is.null&order=id&offset=${off}&limit=1000`,
      { headers: H, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('fetch ' + res.status);
    const chunk = await res.json();
    for (const r of chunk) {
      // every choice label / answer text is taught English vocabulary
      for (const c of Array.isArray(r.choices) ? r.choices : []) {
        if (typeof c === 'string') addLex(c);
      }
      addLex(r.answer?.text);
      for (const a of r.answer?.accepted ?? []) addLex(a);
      if (r.explanation_vi && !VN_MARK.test(r.explanation_vi)) rows.push(r);
    }
    if (chunk.length < 1000) break;
  }
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

function promptFor(items) {
  return `You are a senior Vietnamese primary-school English teacher rewriting student-facing explanations.
Each input item: {"i":id,"g":grade,"q":English prompt,"c":[choices],"a":correct answer label,"ex":current explanation - Vietnamese stripped of diacritics, with machine-translation artifacts}.

For EVERY item output {"i":"<same id>","ex":"<rewritten explanation>"}.

RULES:
- Write NATURAL Vietnamese with FULL diacritics, at the vocabulary level of a grade-<g> Vietnamese pupil. Short sentences.
- The CORRECT answer is "a" - explain WHY it is correct (and briefly why a tempting wrong choice fails, if the original did). Never justify a different choice.
- Keep EVERY English word/phrase being taught EXACTLY as in the input (answers, quoted options, grammar terms like "Past Simple" stay in English). Never translate the tested vocabulary.
- Fix broken artifacts: "make lam chia thanh made" -> "động từ 'make' chia ở thì quá khứ thành 'made'".
- Same meaning as the original - no new facts, no removed corrections.
- Hyphen '-' only, never em-dash or en-dash.
- Max 240 characters.
- Output ONLY a raw JSON array, same order as input.

ITEMS:
${JSON.stringify(items.map((r) => ({
    i: r.id, g: r.grade, q: String(r.prompt_text ?? '').slice(0, 160),
    c: Array.isArray(r.choices) ? r.choices.filter((x) => typeof x === 'string').slice(0, 6) : undefined,
    a: correctLabel(r), ex: r.explanation_vi,
  })), null, 0)}`;
}

const channel = createLlmChannel({ workers: WORKERS, codexModel: 'gpt-6.1-sol', codexEffort: 'high' });

// ---- apply mode: replay a recorded artifact verbatim ----
// Conditional apply (r131#1): only overwrite when the live value still
// equals the recorded `before` - a row edited since the artifact was made
// is a conflict, not a silent overwrite. Rows already at `proposed` count
// as idempotent success; missing/conflicted rows fail loudly.
if (APPLY) {
  const edits = readFileSync(APPLY, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let applied = 0, failed = 0;
  const HR = { ...HW, Prefer: 'return=representation' };
  for (const e of edits) {
    const cur = await fetch(
      `${URL}/rest/v1/qb_questions?id=eq.${e.id}&select=id,explanation_vi`, { headers: H })
      .then((r) => r.json()).catch(() => null);
    const live = cur?.[0]?.explanation_vi;
    if (!cur?.length) { failed++; console.log(`  apply fail ${e.id}: row missing`); continue; }
    if (live === e.proposed) { applied++; continue; }           // idempotent
    if (live !== e.before) {                                   // drifted since artifact
      failed++;
      console.log(`  apply CONFLICT ${e.id}: live value differs from recorded 'before' - skipping`);
      continue;
    }
    const res = await fetch(
      `${URL}/rest/v1/qb_questions?id=eq.${e.id}&explanation_vi=eq.${encodeURIComponent(e.before)}`, {
      method: 'PATCH', headers: HR,
      body: JSON.stringify({ explanation_vi: e.proposed }),
    });
    const rows = res.ok ? await res.json() : [];
    rows.length ? applied++ : (failed++, console.log(`  apply fail ${e.id}: no row updated (concurrent edit)`));
  }
  await channel.close();
  console.log(`APPLIED ${applied}, failed ${failed} from ${APPLY}`);
  process.exit(failed ? 1 : 0);
}

const targets = await fetchTargets();
console.log(`explanations needing polish: ${targets.length}`);
if (!targets.length) { await channel.close(); process.exit(0); }
if (DRY) {
  const batch = targets.slice(0, 6);
  const out = parseJsonArray((await channel.call(promptFor(batch))).text);
  console.log(JSON.stringify(out, null, 1));
  await channel.close();
  process.exit(0);
}

const queue = [];
for (let i = 0; i < targets.length; i += BATCH) queue.push(targets.slice(i, i + BATCH));
const edits = [];
let done = 0, proposed = 0, failed = 0, unchanged = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (queue.length) {
    const batch = queue.shift();
    try {
      const out = parseJsonArray((await channel.call(promptFor(batch))).text);
      const byId = new Map(out.map((o) => [o.i, o.ex]));
      for (const row of batch) {
        const ex = byId.get(row.id);
        // validation: present, sane length, actually Vietnamese now, and
        // every English term quoted in the original is still present
        const exLower = String(ex ?? '').toLowerCase();
        const exNorm = stripVN(ex);
        const missingTerms = [];
        for (const q of quotedTerms(row.explanation_vi)) {
          const end = q.at + q.term.length + 2; // quote delimiters
          if (isGlossSlot(row.explanation_vi, q.at, end)) {
            // whole-term stripped-boundary match allows diacritic repair
            if (!boundaryRe(stripVN(q.term)).test(exNorm)) missingTerms.push(q.term);
            continue;
          }
          const words = lexWords(q.term);
          // All-lexicon (or nonalphabetic) terms are complete English
          // phrases - check them as a bounded whole so reordering
          // ('dog bites man' -> 'man bites dog') and number swaps
          // ('10' -> '20') cannot pass (r138#2, r138#3).
          if (!words.length || words.every((w) => LEXICON.has(stripVN(w)))) {
            if (!boundaryRe(q.term.toLowerCase()).test(exLower)) missingTerms.push(q.term);
            continue;
          }
          // Mixed terms: lexicon words literal, the rest stripped-bounded.
          for (const w of words) {
            const ok = LEXICON.has(stripVN(w))
              ? boundaryRe(w.toLowerCase()).test(exLower)
              : boundaryRe(stripVN(w)).test(exNorm);
            if (!ok) { missingTerms.push(`${q.term} (${w})`); break; }
          }
        }
        if (typeof ex !== 'string' || ex.length < 8 || ex.length > 480 ||
            ex === row.explanation_vi || !VN_MARK.test(ex) || missingTerms.length) {
          if (ex === row.explanation_vi) unchanged++;
          else { failed++; if (missingTerms.length) console.log(`  drop ${row.id}: lost terms ${missingTerms.join(',')}`); }
          continue;
        }
        edits.push({ id: row.id, before: row.explanation_vi, proposed: ex.slice(0, 500) });
        proposed++;
      }
    } catch (e) {
      failed += batch.length;
      console.log(`  batch fail: ${String(e.message ?? e).slice(0, 120)}`);
    }
    done++;
    console.log(`  ${done}/${queue.length + done} batches | proposed=${proposed} unchanged=${unchanged} failed=${failed}`);
  }
}));
await channel.close();
const artifact = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'qa', `polish-edits-${Date.now()}.jsonl`);
writeFileSync(artifact, edits.map((e) => JSON.stringify(e)).join('\n') + '\n');
console.log(`DONE: ${proposed} proposed, ${unchanged} unchanged, ${failed} failed (codex=${channel.counts.codex} gemini=${channel.counts.gemini})`);
console.log(`artifact: ${artifact} - review, then: node scripts/polish-explanations.mjs --apply ${artifact}`);
