// CR-111: restore Vietnamese diacritics + natural grammar in explanation_vi
// for the rows the audit flags (explanation-not-vietnamese). Explanations
// were template-generated undiacritized Vietnamese with machine-translation
// artifacts ("make lam chia thanh made") - kids deserve teacher-quality text.
// Uses the shared LLM channel (codex CLI primary, gemini-web fallback) -
// bulk content generation runs on subscription automation, never API keys.
// Usage: node scripts/polish-explanations.mjs [--dry] [--limit N] [--workers 3]
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createLlmChannel, parseJsonArray } from './llm-channel.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const LIMIT = Number(arg('--limit', '0'));
const WORKERS = Number(arg('--workers', '3'));
const BATCH = Number(arg('--batch', '30'));

const KEYS = JSON.parse(readFileSync(join(homedir(), '.config', 'devin', 'secrets', 'supabase_new_keys.json'), 'utf8'));
const URL = KEYS.url, SVC = KEYS.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice' };
const HW = { ...H, 'Content-Profile': 'practice', 'Content-Type': 'application/json' };

const VN_MARK = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵĐ]/i;

async function fetchTargets() {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const res = await fetch(
      `${URL}/rest/v1/qb_questions?select=id,grade,question_type,prompt_text,answer,explanation_vi` +
      `&explanation_vi=not.is.null&order=id&offset=${off}&limit=1000`,
      { headers: H, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('fetch ' + res.status);
    const chunk = await res.json();
    rows.push(...chunk.filter((r) => r.explanation_vi && !VN_MARK.test(r.explanation_vi)));
    if (chunk.length < 1000) break;
  }
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

function promptFor(items) {
  return `You are a senior Vietnamese primary-school English teacher rewriting student-facing explanations.
Each input item: {"i":id,"g":grade,"q":English prompt,"a":correct answer,"ex":current explanation - Vietnamese stripped of diacritics, with machine-translation artifacts}.

For EVERY item output {"i":"<same id>","ex":"<rewritten explanation>"}.

RULES:
- Write NATURAL Vietnamese with FULL diacritics, at the vocabulary level of a grade-<g> Vietnamese pupil. Short sentences.
- Explain WHY the answer is correct (and briefly why a tempting wrong choice fails, if the original did).
- Keep EVERY English word/phrase being taught EXACTLY as in the input (answers, quoted options, grammar terms like "Past Simple" stay in English). Never translate the tested vocabulary.
- Fix broken artifacts: "make lam chia thanh made" -> "động từ 'make' chia ở thì quá khứ thành 'made'".
- Same meaning as the original - no new facts, no removed corrections.
- Hyphen '-' only, never em-dash or en-dash.
- Max 240 characters.
- Output ONLY a raw JSON array, same order as input.

ITEMS:
${JSON.stringify(items.map((r) => ({ i: r.id, g: r.grade, q: String(r.prompt_text ?? '').slice(0, 160), a: r.answer, ex: r.explanation_vi })), null, 0)}`;
}

const channel = createLlmChannel({ workers: WORKERS, codexModel: 'gpt-6.1-sol', codexEffort: 'high' });

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
let done = 0, polished = 0, failed = 0, unchanged = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (queue.length) {
    const batch = queue.shift();
    try {
      const out = parseJsonArray((await channel.call(promptFor(batch))).text);
      const byId = new Map(out.map((o) => [o.i, o.ex]));
      for (const row of batch) {
        const ex = byId.get(row.id);
        // validation: present, sane length, actually Vietnamese now
        if (typeof ex !== 'string' || ex.length < 8 || ex.length > 480 ||
            ex === row.explanation_vi || !VN_MARK.test(ex)) {
          if (ex === row.explanation_vi) unchanged++; else failed++;
          continue;
        }
        const res = await fetch(`${URL}/rest/v1/qb_questions?id=eq.${row.id}`, {
          method: 'PATCH', headers: HW,
          body: JSON.stringify({ explanation_vi: ex.slice(0, 500) }),
        });
        res.ok ? polished++ : failed++;
      }
    } catch (e) {
      failed += batch.length;
      console.log(`  batch fail: ${String(e.message ?? e).slice(0, 120)}`);
    }
    done++;
    console.log(`  ${done}/${queue.length + done} batches | polished=${polished} unchanged=${unchanged} failed=${failed}`);
  }
}));
await channel.close();
console.log(`DONE: ${polished} polished, ${unchanged} unchanged, ${failed} failed (codex=${channel.counts.codex} gemini=${channel.counts.gemini})`);
