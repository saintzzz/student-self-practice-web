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
import crypto from 'node:crypto';
import { pagedAll } from './lib/paged.mjs';
import {
  ANIMALS, ATTR_HAS, ATTR_BORDERLINE, ANIMAL_PLACE, OFFSPRING, AN_WORDS,
  NON_COVERING, VALID_HABITATS,
} from './lib/animal-knowledge.mjs';

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

async function fetchTable(table, cols, order = 'id') {
  return pagedAll(
    `${SUPA_URL}/rest/v1/${table}?select=${cols}`,
    { headers: HEADERS, order },
  );
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
// /i makes the class case-insensitive for letters, but precomposed
// Vietnamese capitals are distinct code points - list both cases so an
// all-caps or sentence-initial diacritic still counts as Vietnamese.
const VN_MARK = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵĂÂĐÊÔƠƯÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ]/;
const TEMPLATE_RESIDUE = [
  /đáp án phù hợp với ngữ cảnh/i,
  /chọn câu (trả lời )?phù hợp/i,
  /thông tin phù hợp với kiến thức/i,
  /^có nhiều đáp án đúng/i,
  /đáp án đúng:?$/i,
];
const AMBIGUOUS_NAMES = new Set(['Bosnia', 'Congo', 'Korea', 'America']);

const questions = await fetchTable('qb_questions',
  'id,grade,subject,question_type,prompt_text,transcript,passage,statement,tokens,choices,answer,explanation_vi,publication_policy,review_status,variant_group_id');
const links = await fetchTable('qb_question_assets', 'question_id', 'question_id');
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
  'Listening item has no transcript/audio - unanswerable',
  // Gate on skill='listen' - prompts that merely *mention* listening
  // ("You wear ___ to listen to music") are grammar/vocab items, not
  // audio-dependent questions. (r64: all 16 prior flags were FP.)
  questions.filter((q) => eligible(q) && (q.skill === 'listen' || q.skill === 'listening') && SERVED_TYPES.has(q.question_type) && !q.transcript));

check('read-no-passage', 'P0',
  'Prompt references a passage/text but none stored and none embedded in '
  + 'the prompt itself - unanswerable',
  questions.filter((q) => {
    if (!eligible(q) || !READ_PROMPT.test(q.prompt_text ?? '') || q.passage || q.transcript) return false;
    // many G5 items embed the passage inline after the "Read the ..." lead-in;
    // only flag when the rest of the prompt is too short to contain a passage
    const rest = (q.prompt_text ?? '').replace(READ_PROMPT, '');
    return rest.length < 150;
  }));

check('visual-no-assets', 'P0',
  'Image question type with no linked assets',
  questions.filter((q) => eligible(q) && VISUAL_TYPES.has(q.question_type) && !assetCount.get(q.id)));

/* ---------- B. answer integrity ---------- */

check('answer-out-of-range', 'P0',
  'answer.index points outside choices array',
  questions.filter((q) => Array.isArray(q.choices) && q.answer?.index !== undefined && (q.answer.index < 0 || q.answer.index >= q.choices.length)));

// r130 follow-up: grading resolves answer.index, so when it disagrees with
// answer.text the served row silently scores the right pick wrong. Found
// live on 3 served rows; repaired by migration 0065.
check('answer-index-text-mismatch', 'P0',
  'answer.index points at a different choice than answer.text - grading would mark the correct pick wrong',
  questions.filter((q) => {
    if (!Array.isArray(q.choices) || q.answer?.index === undefined || !q.answer?.text) return false;
    const atIdx = String(q.choices[q.answer.index] ?? '').trim().toLowerCase();
    const aTxt = String(q.answer.text).trim().toLowerCase();
    return atIdx && aTxt && atIdx !== aTxt;
  }));

check('choices-too-few', 'P0',
  'MCQ-type with fewer than 3 choices',
  questions.filter((q) => eligible(q) && q.question_type?.endsWith('mcq') && Array.isArray(q.choices) && q.choices.length < 3));

check('option-placeholder', 'P0',
  'A choice is a literal generator placeholder like "option-4"',
  questions.filter((q) => eligible(q) && Array.isArray(q.choices) && q.choices.some((c) => typeof c === 'string' && /^option[\s_-]?\d+$/i.test(c))));

check('duplicate-choices', 'P1',
  'Two identical choices in one question',
  questions.filter((q) => {
    if (!eligible(q) || !Array.isArray(q.choices)) return false;
    const labels = q.choices.map((c) => choiceLabel(c).toLowerCase());
    return new Set(labels).size !== labels.length;
  }));

/* --- academic spot-check defect classes (docs/qa/spot-check-*.json),
     repaired by scripts/repair-template-defects.mjs - these checks keep
     the classes permanently closed --- */

const AN_WORD_RE = new RegExp(`\\b(a|A)\\s+(${AN_WORDS.join('|')})\\b`);
const teachesAn = (q) => {
  const cs = (Array.isArray(q.choices) ? q.choices : []).map((c) => choiceLabel(c));
  return cs.some((c) => /\ban\s+[aeiou]/i.test(c)) && cs.some((c) => /\b(a|A)\s+[aeiou]/.test(c));
};
check('article-a-before-vowel', 'P1',
  '"a" before a vowel-sound word (must be "an") - grammar-teaching rows exempt',
  questions.filter((q) => {
    if (!eligible(q) || q.review_status === 'rejected' || teachesAn(q)) return false;
    const texts = [q.prompt_text, q.answer?.text,
      ...(Array.isArray(q.choices) ? q.choices.filter((c) => typeof c === 'string') : [])];
    return texts.some((t) => t && AN_WORD_RE.test(t));
  }));

const SEES_AUDIT = /sees an? animal with (.+?) (?:at|in) (?:a|the) [a-z ]+\.?\s*Which animal could it be/i;
check('sees-animal-ambiguous', 'P0',
  '"sees an animal with A" distractor also has A - more than one defensible answer',
  questions.filter((q) => {
    if (!eligible(q) || q.review_status === 'rejected') return false;
    const m = (q.prompt_text ?? '').match(SEES_AUDIT);
    if (!m || !ATTR_HAS[m[1]] || !Array.isArray(q.choices)) return false;
    const bad = new Set([...ATTR_HAS[m[1]], ...ATTR_BORDERLINE[m[1]]]);
    const ans = q.answer?.text;
    return q.choices.some((c) => typeof c === 'string' && c !== ans && bad.has(c));
  }));

check('finds-habitat-mismatch', 'P1',
  '"finds a X at P" where P is not X\'s habitat (e.g. whale at a garden)',
  questions.filter((q) => {
    if (!eligible(q) || q.review_status === 'rejected') return false;
    const m = (q.prompt_text ?? '').match(/finds an? ([a-z]+) (?:at|in) (?:a|the) ([a-z ]+?)\. It has/i);
    if (!m || !ANIMAL_PLACE[m[1]]) return false;
    const want = ANIMAL_PLACE[m[1]].replace(/^(at|in)\s+(a|the)\s+/, '');
    return m[2] !== want;
  }));

check('came-from-nonsense', 'P0',
  '"It came from ___" baby-animal template - produces nonsense like "came from babies from eggs"',
  questions.filter((q) => eligible(q) && q.review_status !== 'rejected' && /came from ___/.test(q.prompt_text ?? '') && /finds a baby/i.test(q.prompt_text ?? '')));

check('reorder-no-tokens', 'P1',
  'reorder item has no stored word bank (tokens) - mapper must fall back to answer split',
  questions.filter((q) => eligible(q) && q.review_status !== 'rejected' && q.question_type === 'reorder' && (!Array.isArray(q.tokens) || q.tokens.length < 2)));

// --- academic spot-check round-2 families (CR-111) ----------------------
check('blank-double-article', 'P0',
  'prompt has "a/an ___" while EVERY choice carries its own article - filling produces "a an X"',
  questions.filter((q) => eligible(q) && q.review_status !== 'rejected'
    && /\b(a|an)\s+_{2,}/i.test(q.prompt_text ?? '')
    && Array.isArray(q.choices) && q.choices.length > 0
    && q.choices.every((c) => /^an?\s/i.test(typeof c === 'string' ? c : ''))));

check('covering-appendage-answer', 'P0',
  '"Which covering does X have?" keyed on an appendage/body answer (wings, legs, arms) - prompt must say "feature"',
  questions.filter((q) => eligible(q) && q.review_status !== 'rejected'
    && /^Which covering does (?:a|an) [a-z]+ have\?$/i.test(q.prompt_text ?? '')
    && NON_COVERING.has((q.answer?.text ?? '').toLowerCase())));

check('habitat-ambiguous-distractor', 'P1',
  '"Where does X live?" lists a distractor that is a genuinely valid habitat for X (e.g. whale + cold polar regions)',
  questions.filter((q) => {
    if (!eligible(q) || q.review_status === 'rejected' || !Array.isArray(q.choices)) return false;
    const m = (q.prompt_text ?? '').match(/^Where does (?:a|an) ([a-z]+) live\?$/);
    if (!m) return false;
    const valid = new Set(VALID_HABITATS[m[1]] || []);
    if (!valid.size) return false;
    const ans = (q.answer?.text ?? '').toLowerCase();
    const ansIdx = q.answer?.index ?? q.choices.findIndex((c) => typeof c === 'string' && c.toLowerCase() === ans);
    return q.choices.some((c, i) => i !== ansIdx && typeof c === 'string' && valid.has(c.toLowerCase()));
  }));

check('poster-idea-unspecified', 'P1',
  '"poster for this idea" row still served - the idea is never stated so no unique answer exists',
  questions.filter((q) => eligible(q) && q.review_status !== 'rejected'
    && /poster for this idea/i.test(q.prompt_text ?? '') && q.question_type === 'text-answer'));

// Open-ended prompts ("What about you?", "your favorite X?", "Do you like X?")
// where more than one well-formed choice is a plausible TRUE answer are open
// clozes - the keyed answer is not uniquely correct (user-reported class,
// batch quarantined Oct-18). Flag for review, not auto-reject.
const OPEN_PROMPT =
  /\bwhat about you\b|\bhow about you\b|\byour favorite\b|\bwhat do you like\b|\bwhat do you want\b|\bdo you like doing\b/i;
const BROKEN_CHOICE =
  /\blike (cook|watch|read|brush|play|ride|swim|sing|dance?|eat|draw|jump|shop|sleep|drive?|fly|walk|run|listen)\b(?!ing)|\bi am\b|\bi not\b|\bi like\b\.?$/i;
const IS_EN = (l) => /^[a-zA-Z'’.,!\s-]+$/.test(l);

// CR-111: dispositions from manual PO triage (2026-10-24). Each row was
// read in full and confirmed semantically valid - the flags were heuristic
// false positives. Dispositions are scoped PER CHECK and keyed to a
// content fingerprint (sha1 of prompt|choices|answer|explanation captured
// at review time): if the row's content changes, the exemption lapses and
// the row resurfaces for re-review (r130#3).
const REVIEWED = {
  // all single-answer grammar/semantic drills (morphology, category-
  // mismatched distractors, context-constrained prompts)
  'ambiguous-open-prompt': {
    'g2-english-gemini-1ad0a4b3433f': '170c90e1d22a',
    'g2-english-gemini-4477dccc41a3': '35d50598cb75',
    'g3-english-gemini-2efce0bae44e': '77e6783313b3',
    'g3-english-gemini-2fb60bc35b98': '902fb24da060',
    'g3-english-gemini-4b8ba1bd2293': '58141ddabbbb',
    'g3-english-gemini-7294417e066e': '3de7bf62442e',
    'g3-english-gemini-80b715f44e20': '60e254e89b8f',
    'g3-english-gemini-8403820c188f': '2f8e46c7d05c',
    'g3-english-gemini-9518849baeb9': '6156803f0398',
    'g3-english-gemini-ad53a2632cea': 'a605f975e575',
    'g3-english-gemini-ca2467f170c2': '6237ff4fdc39',
    'g3-english-gemini-d0c9a716de2b': '855fce5bf84e',
    'g4-english-gemini-29a7a51f8a0e': '32d229c66c2e',
    'g4-english-gemini-6ecb9a1e950b': '16357142d479',
    'g4-english-gemini-c4a31f67149b': '80b65b4ca54c',
    'g4-english-gemini-c9a21a3e65af': '37c3e75b6723',
    'g4-english-gemini-ce898e842294': 'd3ce8dd16205',
    'g4-english-gemini-cffc31b9eacc': 'a63d155a22bb',
    'g5-english-gemini-2f14967b8770': 'd80e3d1c65c4',
    'g5-english-gemini-9f740ba80c8e': 'f300f2642056',
    'g5-english-gemini-badfe9ce8162': '420811fcc6b8',
    // post-fix re-triage: 'in the library' makes 'reading books' unique
    'g3-english-gemini-648481753a02': '1f930411b9a8',
  },
  // distractor-contrast pedagogy: quoting the distractor to explain why
  // it is wrong is correct teaching, not a mismatch
  'explanation-mentions-other-answer': {
    // explanation quotes the correct answer itself - humans can't fly
    'g2-english-codex-be6681310387': '23d101c21b10',
    'g2-english-codex-3a86869fe60e': 'ad99e1030c0c',
    'g2-english-codex-53e070ec3d7c': '25cf437ca04c',
    'g2-english-codex-599a48e0e9b8': 'beca170a3751',
    'g2-english-codex-5fa252d74adb': '2c02ecfa3020',
    'g2-english-codex-819d4d790750': '282987765e67',
    'g2-english-codex-c985cd404a2e': '6d6e9d1a56eb',
    'g2-english-gemini-c3137438d2d2': '5224a66f6fe0',
    'g4-english-gemini-133992b04cbe': 'b11734f318e0',
    'g4-english-gemini-1d5130338b12': '68c385869077',
    'g5-english-gemini-df2a7033dd75': '9b06d6f11175',
  },
  // prompts already self-disambiguate the country term
  'ambiguous-country-name': {
    'g5-english-bulk-icon-e1fb2c353573': '1de1d82be55c',
    'g5-english-bulk-icon-e3e21ed4b84d': '682257b2604e',
  },
  // post-repair triage (CR-111 spot-check): every row read in full.
  // Either the stated clue makes the keyed answer unique among the
  // choices ("It has wings" -> bird when distractors are fish/cat/dog)
  // or the prompt is self-contained (spelled-out word, parenthetical
  // context, definition). 12 genuinely defective siblings were fixed in
  // migration 0067 instead of being exempted here.
  'prompt-this-no-asset': {
    'g1-english-bulk-2c41b1b70b91': '889294f199b9',
    'g1-english-bulk-3531c7ffbc5a': 'e9f5175fbff5',
    'g1-english-bulk-4cdbaa369ee8': '94bdaeb113f7',
    'g1-english-bulk-5506ad8de912': '594a1de0a440',
    'g1-english-bulk-6e19353f46e2': '208e01b257e6',
    'g1-english-bulk-e08bfdeeac92': '803a480a1585',
    'g1-mat-v4-time-basic-fdd73cc946': 'f445849a4093',
    'g2-english-bulk-701885d190ee': '2a13eaa0f8f0',
    'g2-english-bulk-773fda62829e': 'd8ee49182660',
    'g2-english-bulk-8d18062b021c': '501cca28578e',
    'g2-english-bulk-a14ec23e2c32': 'e478e7fce084',
    'g2-english-bulk-ad9d6317e7a8': '322ebc757be5',
    'g2-english-bulk-ae99021cae54': '9e9c169a7888',
    'g2-english-bulk-bdf1050eac0d': '32adfb89c747',
    'g2-english-bulk-cf0669c0dd08': '3eeabe019894',
    'g2-english-bulk-f2979781ff6d': '87423bea876d',
    'g2-english-bulk-f6e89bb79ce1': 'ee03185ac221',
    'g2-english-gemini-4dcd7a3de9a7': '24fb7f7c9fc5',
    'g3-english-bulk-544c5658d244': '31851b9b5a2d',
    'g3-english-bulk-8bbed6a4dafb': 'fb30ba01792f',
    'g3-english-bulk-f96da1dcf317': '79fb76c39e59',
    'g3-english-gemini-4476e0c1f06f': '42a4ed6fffdf',
    'g4-english-bulk-1bd7fd830fcc': '02af8f5cb4c1',
    'g5-english-bulk-cd15eda913a3': 'c01c30282f91',
    // rewritten in 0067 - self-contained and unique among choices
    'g1-english-bulk-61a047deafef': 'f3675d298fa3',
    'g1-english-bulk-b28a4b457059': '6b5f2face52c',
  },
};
const contentFp = (q) =>
  crypto.createHash('sha1')
    .update([q.prompt_text, JSON.stringify(q.choices), JSON.stringify(q.answer), q.explanation_vi].join('|'))
    .digest('hex').slice(0, 12);
const reviewed = (checkName, q) => REVIEWED[checkName]?.[q.id] === contentFp(q);
check('prompt-this-no-asset', 'P1',
  'Prompt references "this"/"the picture" but no image asset is linked',
  questions.filter((q) => eligible(q) && q.review_status !== 'rejected' && !reviewed('prompt-this-no-asset', q)
    && !VISUAL_TYPES.has(q.question_type) && !assetCount.get(q.id)
    && /\b(what|which)\b.{0,60}\b(is this|this picture|the picture|the image|the photo)\b/i.test(q.prompt_text ?? '')));
check('ambiguous-open-prompt', 'P1',
  'Open-ended prompt where more than one choice is a plausible true answer - review for quarantine',
  questions.filter((q) => {
    if (!eligible(q) || q.question_type !== 'mcq' || !Array.isArray(q.choices)) return false;
    if (reviewed('ambiguous-open-prompt', q)) return false;
    const p = q.prompt_text ?? '';
    const labels = q.choices.map((c) => choiceLabel(c));
    const ok = labels.filter((l) => IS_EN(l) && !BROKEN_CHOICE.test(l));
    if (ok.length < 2) return false;
    const yesNoPrompt = /^(is|are|do|does|can|did|will|would|have|has)\b/i.test(p.trim());
    // 'Do you like X?' where a well-formed Yes AND a well-formed No both
    // appear: either is a true answer, so the key is not unique. A "No"
    // only counts when it is coherent - "don't/do not" forms, or a real
    // deflection (like <gerund-phrase different from the asked one>);
    // "No, I like brushing" asked about brushing is self-contradictory.
    if (/\bdo you like\b/i.test(p)) {
      const promptGerund = (p.match(/like\s+(\w+ing\b[^?.]*)/i)?.[1] ?? '').toLowerCase();
      const goodYes = ok.some((l) => /^yes\b/i.test(l) && /\b(do|like \w+ing)\b/i.test(l));
      const goodNo = ok.some((l) => {
        if (!/^no\b/i.test(l)) return false;
        if (/don't|do not/i.test(l) && !/\bi like\b/i.test(l)) return true;
        const om = l.match(/like\s+(\w+ing\b[^.]*)/i);
        return !!om && !promptGerund.startsWith(om[1].toLowerCase().trim());
      });
      if (goodYes && goodNo) return true;
    }
    if (yesNoPrompt || !OPEN_PROMPT.test(p)) return false;
    const frame = (l) => l.toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/).slice(0, 2).join(' ');
    const ansFrame = frame(correctLabel(q));
    const sameFrame = ok.filter((l) => frame(l) === ansFrame);
    const allShort = ok.length === labels.length && ok.length >= 3
      && ok.every((l) => l.trim().split(/\s+/).length <= 3 && !/^(yes|no)\b/i.test(l));
    return (ansFrame && sameFrame.length >= 2) || allShort;
  }));

// Echo-response genre ("Someone says 'X' - what do you say back?") quotes
// the stimulus utterance, not the answer: choosing the correct echo IS the
// exercised skill, so these prompts do not leak.
const ECHO_ASK = /(say back|đáp lại|what do you say|how do we answer|to say back|reply|response)/i;
check('prompt-answer-leak', 'P0',
  'Prompt literally contains the quoted correct answer (guessable without skill)',
  questions.filter((q) => {
    if (!eligible(q) || q.question_type === 'word-to-image-mcq' || q.question_type === 'image-to-word-mcq') return false;
    if (ECHO_ASK.test(q.prompt_text ?? '')) return false;
    const ans = correctLabel(q);
    if (!ans || ans.length < 3 || /^(True|False)$/i.test(ans)) return false;
    const m = (q.prompt_text ?? '').match(QUOTED);
    return m && m[1].trim().toLowerCase() === ans.trim().toLowerCase();
  }));

// Oct-18 user reports: the answer printed inside the prompt WITHOUT quotes -
// "Which is number 4?" -> "4" (english bank). For ENGLISH items a bare-digit
// answer reprinted in the prompt exercises no English skill; math/science
// select-compare-compute prompts legitimately contain operands, and
// digit->word exercises ("What is '8' in English?" -> "eight") do not leak
// the word - so this check is scoped to the english subject only.
check('prompt-answer-leak-unquoted', 'P0',
  'English item whose bare-digit correct answer is reprinted inside the prompt',
  questions.filter((q) => {
    if (!eligible(q) || q.subject !== 'english' || q.question_type !== 'mcq' || !Array.isArray(q.choices)) return false;
    const ans = correctLabel(q).trim();
    if (!/^\d+$/.test(ans)) return false;
    // when the prompt contains OTHER digits too, the answer digit is
    // contextual (counting sequence "1, 2, 3, 4", clock face "points to 8"),
    // not a lone reprinted answer - only a sole-digit prompt leaks.
    const digits = (q.prompt_text ?? '').match(/\d+/g) ?? [];
    if (digits.length > 1) return false;
    return new RegExp(`\\b${ans}\\b`).test(q.prompt_text ?? '');
  }));

const IMG_PLACEHOLDER = /[([]\s*(image|picture)(?:\s*:\s*|\s+of\b)/i;
check('prompt-image-placeholder', 'P0',
  'Prompt describes an image in text "(Image of X)" - no real asset and the description leaks the answer',
  questions.filter((q) => eligible(q) && IMG_PLACEHOLDER.test(q.prompt_text ?? '')));

// Oct-18: statement prompts ("There is a banana.") served with yes/no
// agreement options - no question asked and nothing to verify against.
const YESNO_OPT = /^(yes|no)\b[.!]?\s*$|^(yes|no)\b.*\b(is|are|do|does|can|am|don'?t|isn'?t|aren'?t|can'?t)\b/i;
const GREETING_ONLY = /^(goodbye|bye|hello|hi|good (morning|afternoon|evening|night|luck)|thank(s| you)|sorry|yes|no|ok(ay)?|please|wow|hurray|hooray|see you|welcome|great|nice|wonderful|congratulations|excuse me|come on|look out|careful|help|stop|go|sit down|stand up|listen|look|hurry up|quiet|attention|cheers|bless you|good job|well done|oh no|ouch|yum|yuck|here you are|after you|never mind|of course|sure|maybe|perhaps|really|indeed)[\s!.,'’]*$/i;
check('statement-as-question', 'P1',
  'Declarative statement prompt (no question/blank) with yes-no agreement options - unanswerable without a scene or passage',
  questions.filter((q) => {
    if (!eligible(q) || q.question_type !== 'mcq' || !Array.isArray(q.choices)) return false;
    const p = (q.prompt_text ?? '').trim();
    if (q.passage || q.transcript || assetCount.get(q.id)) return false;
    // Exclamations that are pure greetings/commands/interjections
    // ("Goodbye!", "Sit down!") are not assertions; an exclaimed clause
    // ("She eats apples!") still flags. Whitelist, not a verb check -
    // lexical verbs evade a denylist (r70/r71).
    if (/!$/.test(p) && GREETING_ONLY.test(p)) return false;
    if (/[?_…]|\.{3}|\bchoose\b|\bchọn\b|\btranslate\b|\bsay\b|\bcomplete\b/i.test(p)) return false;
    const labels = q.choices.map((c) => choiceLabel(c));
    return labels.some((l) => YESNO_OPT.test(l));
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

check('explanation-mentions-other-answer', 'P2',
  'Explanation quotes a DIFFERENT choice than the correct answer - review '
  + 'queue heuristic, NOT a defect count: quoting distractors to explain '
  + 'why they are wrong or to gloss all options is correct pedagogy',
  questions.filter((q) => {
    if (!eligible(q) || !Array.isArray(q.choices) || q.answer?.index === undefined) return false;
    if (reviewed('explanation-mentions-other-answer', q)) return false;
    const m = (q.explanation_vi ?? '').match(QUOTED);
    if (!m) return false;
    const expl = q.explanation_vi ?? '';
    // contrasting distractors on purpose is good pedagogy, not a mismatch
    if (/không (phù hợp|đúng|phải)|còn lại|các (từ|lựa chọn|đáp án) khác|là sai|nhiễu|bẫy|khác hẳn|nhầm/i.test(expl)) return false;
    // glossing several choices ("'run' là chạy, 'cook' là nấu ăn") teaches
    // vocabulary across the option set - also legit
    if ((expl.match(/["'“‘][^"'”’]+["'”’]/g) ?? []).length >= 2) return false;
    const quoted = m[1].trim().toLowerCase();
    const labels = q.choices.map((c) => choiceLabel(c).toLowerCase());
    const correct = correctLabel(q).toLowerCase();
    return labels.includes(quoted) && quoted !== correct;
  }));

check('explanation-not-vietnamese', 'P1',
  'Explanation has no Vietnamese characters (untranslated?)',
  questions.filter((q) => eligible(q) && q.explanation_vi && q.explanation_vi.length > 15 && !VN_MARK.test(q.explanation_vi)));

// Bare restatement explanations teach nothing: "X phù hợp với chủ đề Y." with
// no reason, gloss, or contrast. A teaching explanation must say WHY.
check('explanation-tautology', 'P1',
  'Explanation only restates "answer fits the theme" without a reason or contrast',
  questions.filter((q) => {
    if (!eligible(q)) return false;
    const e = (q.explanation_vi ?? '').trim();
    if (!e) return false;
    // "X" phù hợp với chủ đề "Y". (one sentence, nothing else)
    return /^[“"']?.{1,40}[”"']?\s*(là|phù hợp với|thuộc) (chủ đề|đúng chủ đề)[^.]{0,40}\.?\s*$/i.test(e)
      && !/vì|nên|nghĩa là|còn lại|khác|không|trong khi|\(/.test(e);
  }));

/* ---------- B2. deterministic answer verification ---------- */

// Evaluate simple arithmetic/comparison prompts and check the marked
// answer actually is correct - catches wrong-answer generator bugs.
// Left-assoc with * / precedence for multi-operand chains (7 + 3 + 5,
// 100 - 45 - 20, 6 x 7 + 8) that the two-operand regexes below miss.
// English number words used by early-grade banks ("six", "twenty one").
const NUMWORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};
function toNum(label) {
  const s = String(label).replace(/,/g, '').trim().toLowerCase();
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  const parts = s.replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  if (!parts.length || parts.some((w) => !(w in NUMWORDS))) return NaN;
  let total = 0, cur = 0;
  for (const w of parts) {
    const v = NUMWORDS[w];
    if (v >= 100) cur = (cur || 1) * v;
    else cur += v;
  }
  return total + cur;
}

function evalChain(expr) {
  const toks = String(expr).match(/\d+\.?\d*|[+\-×x*÷/]/g);
  if (!toks || toks.length < 3) return undefined;
  const out = [+toks[0]];
  const ops = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i];
    const n = +toks[i + 1];
    if (!Number.isFinite(n)) return undefined;
    if (op === '+' || op === '-') { ops.push(op); out.push(n); }
    else {
      const a = out.pop();
      out.push(op === '÷' || op === '/' ? a / n : a * n);
    }
  }
  let r = out[0];
  ops.forEach((op, i) => { r = op === '+' ? r + out[i + 1] : r - out[i + 1]; });
  return Number.isFinite(r) ? r : undefined;
}

function expectedMath(prompt) {
  const p = prompt.replace(/,/g, '');
  let m;
  // Missing-addend equations: "A + B = ___ + C" / "___ + C = A + B" etc.
  // These must run BEFORE the simple "A op B = _" patterns, which would
  // otherwise match the "= ___" fragment and mis-score the blank.
  if ((m = p.match(/(\d+\.?\d*)\s*([+\-×x*÷])\s*(\d+\.?\d*)\s*=\s*_+\s*([+\-])\s*(\d+\.?\d*)/))) {
    const left = evalChain(`${m[1]}${m[2]}${m[3]}`);
    if (left !== undefined) return m[4] === '+' ? left - +m[5] : left + +m[5];
  }
  if ((m = p.match(/_+\s*([+\-])\s*(\d+\.?\d*)\s*=\s*(\d+\.?\d*)\s*([+\-×x*÷])\s*(\d+\.?\d*)/))) {
    const right = evalChain(`${m[3]}${m[4]}${m[5]}`);
    if (right !== undefined) return m[1] === '+' ? right - +m[2] : right + +m[2];
  }
  // Multi-operand chains first - the two-operand patterns below would
  // otherwise match only the first pair and report a false wrong answer.
  if ((m = p.match(/What is ([\d.\s+\-×x*÷]+?)\s*[?=]/i)) ||
      (m = p.match(/What is ((?:\d+\.?\d*\s*[+\-×x*÷]\s*){2,}\d+\.?\d*)/i))) {
    const v = evalChain(m[1]);
    if (v !== undefined) return v;
  }
  if ((m = p.match(/Solve[^?\d]*((?:\d+\.?\d*\s*[+\-×x*÷]\s*){2,}\d+\.?\d*)/i))) {
    const v = evalChain(m[1]);
    if (v !== undefined) return v;
  }
  if ((m = p.match(/What is (\d+\.?\d*)\s*plus\s*(\d+\.?\d*)/i))) return +m[1] + +m[2];
  if ((m = p.match(/What is (\d+\.?\d*)\s*minus\s*(\d+\.?\d*)/i))) return +m[1] - +m[2];
  if ((m = p.match(/What is (\d+\.?\d*)\s*(?:times|multiplied by)\s*(\d+\.?\d*)/i))) return +m[1] * +m[2];
  if ((m = p.match(/What is (\d+\.?\d*)\s*divided by\s*(\d+\.?\d*)/i))) return +m[1] / +m[2];
  if ((m = p.match(/What is (\d+\.?\d*)\s*[+]\s*(\d+\.?\d*)/i))) return +m[1] + +m[2];
  if ((m = p.match(/What is (\d+\.?\d*)\s*-\s*(\d+\.?\d*)/i))) return +m[1] - +m[2];
  if ((m = p.match(/What is (\d+\.?\d*)\s*[×x*]\s*(\d+\.?\d*)/i))) return +m[1] * +m[2];
  if ((m = p.match(/What is (\d+\.?\d*)\s*÷\s*(\d+\.?\d*)/i))) return +m[1] / +m[2];
  if ((m = p.match(/Compute (\d+\.?\d*)\s*÷\s*(\d+\.?\d*)/i))) return +m[1] / +m[2];
  if ((m = p.match(/Compute (\d+\.?\d*)\s*[×x*]\s*(\d+\.?\d*)/i))) return +m[1] * +m[2];
  if ((m = p.match(/Solve[^\d]*(\d+\.?\d*)\s*[+]\s*(\d+\.?\d*)/i))) return +m[1] + +m[2];
  if ((m = p.match(/Solve[^\d]*(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/i))) return +m[1] - +m[2];
  if ((m = p.match(/Solve[^\d]*(\d+\.?\d*)\s*[×x*]\s*(\d+\.?\d*)/i))) return +m[1] * +m[2];
  if ((m = p.match(/Solve[^\d]*(\d+\.?\d*)\s*÷\s*(\d+\.?\d*)/i))) return +m[1] / +m[2];
  if ((m = p.match(/(\d+\.?\d*)\s*[+]\s*(\d+\.?\d*)\s*=\s*[_?]/))) return +m[1] + +m[2];
  if ((m = p.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*=\s*[_?]/))) return +m[1] - +m[2];
  if ((m = p.match(/(\d+\.?\d*)\s*[×x]\s*(\d+\.?\d*)\s*=\s*[_?]/))) return +m[1] * +m[2];
  if ((m = p.match(/(\d+\.?\d*)\s*÷\s*(\d+\.?\d*)\s*=\s*[_?]/))) return +m[1] / +m[2];
  if ((m = p.match(/one more than (\d+)/i))) return +m[1] + 1;
  if ((m = p.match(/one less than (\d+)/i))) return +m[1] - 1;
  if ((m = p.match(/comes immediately after (\d+)/i))) return +m[1] + 1;
  if ((m = p.match(/comes immediately before (\d+)/i))) return +m[1] - 1;
  if ((m = p.match(/Which number is the greatest:? ([\d, ]+)/i))) return Math.max(...m[1].split(/[,\s]+/).map(Number).filter(Number.isFinite));
  if ((m = p.match(/Which number is the (?:smallest|least):? ([\d, ]+)/i))) return Math.min(...m[1].split(/[,\s]+/).map(Number).filter(Number.isFinite));
  if ((m = p.match(/(\d+)% of (\d+)/i))) return (+m[1] / 100) * +m[2];
  if ((m = p.match(/Continue the pattern:? ((?:\d+[,\s]+){2,}\d+)[,\s]*_+/i))) {
    const seq = m[1].split(/[,\s]+/).map(Number).filter(Number.isFinite);
    if (seq.length >= 2 && seq.every((v, i) => i === 0 || v - seq[i - 1] === seq[1] - seq[0])) return seq[seq.length - 1] + (seq[1] - seq[0]);
  }
  return undefined;
}

check('wrong-answer-math', 'P0',
  'Marked answer contradicts the computed value of the prompt',
  questions.filter((q) => {
    if (!eligible(q)) return false;
    const exp = expectedMath(q.prompt_text ?? '');
    if (exp === undefined || !Number.isFinite(exp)) return false;
    const ans = toNum(correctLabel(q));
    return !Number.isFinite(ans) || Math.abs(ans - exp) > 1e-9;
  }));

check('wrong-comparison-answer', 'P0',
  'Compare X and Y items: marked answer wrong for the numbers',
  questions.filter((q) => {
    if (!eligible(q)) return false;
    const m = (q.prompt_text ?? '').match(/Compare (\d+) and (\d+)\.\s*\d+ is _+ \d+/i);
    if (!m) return false;
    const want = +m[1] > +m[2] ? 'greater than' : +m[1] < +m[2] ? 'less than' : 'equal to';
    return correctLabel(q).toLowerCase() !== want;
  }));

/* ---------- D. content sanity ---------- */

const wordBag = (s) =>
  String(s).toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/).filter(Boolean).sort().join(' ');

check('reorder-bank-mismatch', 'P0',
  'Reorder prompt word bank is not a permutation of the answer sentence',
  questions.filter((q) => {
    if (!eligible(q) || q.question_type !== 'reorder') return false;
    const ans = q.answer?.text;
    if (!ans) return false;
    // word bank can live in `tokens` or inside the prompt "order: a / b / c."
    const m = (q.prompt_text ?? '').match(/order:?\s*(.+\/.+)$/i);
    const bank = Array.isArray(q.tokens) && q.tokens.length >= 2
      ? q.tokens.join(' ')
      : m ? m[1].split('/').map((w) => w.trim()).join(' ') : null;
    if (!bank) return false;
    return wordBag(bank) !== wordBag(ans);
  }));

check('reorder-trivial', 'P1',
  'Reorder answer is a single word - nothing to arrange',
  questions.filter((q) => eligible(q) && q.question_type === 'reorder'
    && String(q.answer?.text ?? '').trim().split(/\s+/).length < 2));

check('text-answer-empty', 'P0',
  'text-answer item has no usable answer text or accepted list',
  questions.filter((q) => {
    if (!eligible(q) || q.question_type !== 'text-answer') return false;
    const a = q.answer ?? {};
    if (String(a.text ?? '').trim()) return false;
    return !(Array.isArray(a.accepted) && a.accepted.some((s) => String(s).trim()));
  }));

check('heard-word-not-in-transcript', 'P1',
  '"Which word did you hear" answer is not spoken in the transcript',
  questions.filter((q) => {
    if (!eligible(q) || !/word did you hear/i.test(q.prompt_text ?? '') || !q.transcript) return false;
    const heard = correctLabel(q).toLowerCase();
    return !new RegExp(`\\b${heard.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q.transcript);
  }));

check('dup-option-assets', 'P0',
  'Two options reference the same image asset (visually identical choices)',
  questions.filter((q) => {
    if (!eligible(q) || !Array.isArray(q.choices)) return false;
    const assets = q.choices.map((c) => c && c.assetId).filter(Boolean);
    return assets.length > 1 && new Set(assets).size !== assets.length;
  }));

check('prompt-placeholder', 'P0',
  'Prompt contains placeholder tokens (undefined/null/TODO)',
  questions.filter((q) => /\b(undefined|null|TODO|FIXME|lorem)\b/i.test(q.prompt_text ?? '')));

check('dup-prompt-same-grade', 'P2',
  'Identical prompt+answer that can co-appear in one exam (no shared variant_group_id)',
  (() => {
    const byKey = new Map();
    for (const q of questions) {
      if (!eligible(q)) continue;
      const discriminating = ((q.prompt_text ?? '') + '|' + (q.statement ?? '') + '|' + (q.transcript ?? '') + '|' + (q.passage ?? '')).trim().toLowerCase();
      const k = `${q.grade}|${q.subject}|${q.question_type}|${discriminating}|${correctLabel(q).toLowerCase()}`;
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
    if (!eligible(q) || reviewed('ambiguous-country-name', q)) return false;
    const term = (q.prompt_text ?? '').match(/Which picture shows: (.+)\?/)?.[1]
      ?? (q.prompt_text ?? '').match(/The picture shows [“"](.+?)[”"]\./)?.[1]
      ?? correctLabel(q);
    return [...AMBIGUOUS_NAMES].some((n) => n.toLowerCase() === String(term).trim().toLowerCase());
  }));

check('accented-text', 'P2',
  'Foreign accent marks (never legal in Vietnamese) in served prompt or choices',
  questions.filter((q) => {
    if (!eligible(q)) return false;
    const t = (q.prompt_text ?? '') + JSON.stringify(q.choices ?? []);
    // ã/õ/é/í are legitimate Vietnamese diacritics (ngã/sắc tones); only flag
    // characters that cannot appear in Vietnamese OR ASCII English text.
    return /[ñçåüî]/i.test(t);
  }));

/* ---------- E. exam-form bundle integrity ---------- */

const forms = await fetchTable('qb_exam_forms', 'id,grade,subject,kind,mode,blueprint_id,payload');
const qById = new Map(questions.map((q) => [q.id, q]));

check('form-missing-question', 'P0',
  'Form references a question id that does not exist',
  forms.flatMap((f) =>
    (f.payload?.questionIds ?? [])
      .filter((id) => !qById.has(id))
      .map((id) => ({ id: `${f.id} -> ${id}`, prompt_text: `missing from form ${f.id}` }))));

check('form-ineligible-question', 'P0',
  'Form includes a quarantined question (review_status rejected/draft). '
  + 'Pool-eligibility flags do not apply to form membership - approved '
  + 'rubric items (speaking/writing) are legal members of teacher forms.',
  forms.flatMap((f) =>
    (f.payload?.questionIds ?? [])
      .filter((id) => { const q = qById.get(id); return q && (q.review_status === 'rejected' || q.review_status === 'draft'); })
      .map((id) => ({ id: `${f.id} -> ${id}`, prompt_text: qById.get(id)?.prompt_text ?? '' }))));

check('form-missing-answerkey', 'P0',
  'Form question has no entry in answerKey',
  forms.flatMap((f) =>
    (f.payload?.questionIds ?? [])
      .filter((id) => !(f.payload?.answerKey ?? {})[id])
      .map((id) => ({ id: `${f.id} -> ${id}`, prompt_text: qById.get(id)?.prompt_text ?? '' }))));

check('form-answerkey-mismatch', 'P0',
  'Form answerKey disagrees with the question stored answer',
  forms.flatMap((f) => {
    const key = f.payload?.answerKey ?? {};
    return (f.payload?.questionIds ?? [])
      .filter((id) => {
        const q = qById.get(id);
        const k = key[id];
        if (!q || !k) return false;
        const stored = correctLabel(q).toLowerCase();
        const kt = String(k.text ?? '').toLowerCase();
        if (kt && stored && kt !== stored) return true;
        if (k.index !== undefined && q.answer?.index !== undefined && k.index !== q.answer.index) return true;
        return false;
      })
      .map((id) => ({ id: `${f.id} -> ${id}`, prompt_text: qById.get(id)?.prompt_text ?? '' }));
  }));

check('form-duplicate-variant', 'P0',
  'Two questions in the same form share a variant group or identical content',
  forms.flatMap((f) => {
    const ids = f.payload?.questionIds ?? [];
    const seen = new Map();
    const bad = [];
    for (const id of ids) {
      const q = qById.get(id);
      if (!q) continue;
      // fallback must discriminate by content, not just prompt: T/F items
      // share the generic "Read the passage. True or False?" prompt and
      // have no text answer, so include statement+passage in the key.
      const k = q.variant_group_id
        ?? `${(q.prompt_text ?? '').toLowerCase()}|${(q.statement ?? '').toLowerCase()}|${(q.passage ?? '').toLowerCase()}|${correctLabel(q).toLowerCase()}|${String(q.answer?.boolean ?? '')}`;
      if (seen.has(k)) bad.push({ id: `${f.id} -> ${id}`, prompt_text: `dup of ${seen.get(k)}` });
      else seen.set(k, id);
    }
    return bad;
  }));

const NORM_NAMES = /\b(Peter|Mai|Lan|Nam|Hoa|Lucy|Anna|Tom|Minh|Linh|Hung|Phong|Linda|Mary|John|David|Amy|Jack|Ben|Sue|Bill|Nick|Tony|Alice|Jane|Kate|Mike|Sam|Sarah|Emma|Leo|Max|Nina|Alex|Vy|Trang|Dung|Long|Ha|Binh|Anh|Quan|Tuan|Nga|Thu|Thao|Hieu|Khanh|Bao|Chi|Duy|Giang|Huong|Khoa|Lam|My|Ngoc|Oanh|Phuong|Quynh|Son|Thanh|Trinh|Uyen|Viet|Xuan|Yen)\b/gi;
const normText = (s) =>
  String(s ?? '').toLowerCase().replace(NORM_NAMES, 'x')
    .replace(/\d+/g, '#')
    .replace(/[^a-z#]+/g, ' ').replace(/\s+/g, ' ').trim();
const nearDupKey = (q) => {
  // reorder items: same word bank / same target sentence = same question even
  // when the presented bank order differs.
  if (/order|reorder|sentence-build/i.test(q.question_type ?? '') || /put the words in order/i.test(q.prompt_text ?? '')) {
    const bank = (q.prompt_text ?? '').split(':').slice(1).join(' ');
    const t = normText(bank.length > 5 ? bank : (q.answer?.text ?? ''));
    return 'ro:' + t.split(' ').sort().join(' ');
  }
  // context-bearing items (passage/statement/transcript) dup when the shared
  // context is identical modulo names/numbers - regardless of the question asked.
  const ctx = normText((q.passage ?? '') + ' ' + (q.statement ?? '') + ' ' + (q.transcript ?? ''));
  if (ctx.length >= 15) return 'ctx:' + ctx;
  // context-free items dup when prompt + option set match modulo names/numbers.
  // The correct answer is NOT part of the key: template items that only swap
  // numbers ("lesson starts at 7:30" vs "6:30") have different answers by
  // construction, but they are still the same question. A short context
  // (e.g. a one-word transcript) is kept in the key so genuinely different
  // items sharing a generic prompt do not collide. Short normalized prompts
  // (<6 tokens, e.g. "what is # x #") are pure drill formats - repetition of
  // arithmetic is normal, so they are not flagged.
  const p = normText(q.prompt_text);
  if (p.split(' ').length < 6) return 'short:' + q.id;
  const ch = Array.isArray(q.choices)
    ? q.choices.map((c) => normText(typeof c === 'string' ? c : c?.assetId ?? c?.label ?? c?.text ?? '')).sort().join('|')
    : '';
  return 'qa:' + p + '|' + ctx + '|' + ch;
};

check('form-near-dup-content', 'P1',
  'Same form contains two questions identical modulo names/numbers (same template)',
  forms.flatMap((f) => {
    const seen = new Map();
    const bad = [];
    for (const id of f.payload?.questionIds ?? []) {
      const q = qById.get(id);
      if (!q) continue;
      const k = nearDupKey(q);
      if (k.length < 20) continue;
      if (seen.has(k)) bad.push({ id: `${f.id} -> ${id}`, prompt_text: `near-dup of ${seen.get(k)}` });
      else seen.set(k, id);
    }
    return bad;
  }));

check('form-grade-subject-mismatch', 'P1',
  'Question grade/subject differs from its form',
  forms.flatMap((f) =>
    (f.payload?.questionIds ?? [])
      .filter((id) => {
        const q = qById.get(id);
        return q && (q.grade !== f.grade || q.subject !== f.subject);
      })
      .map((id) => ({ id: `${f.id} -> ${id}`, prompt_text: qById.get(id)?.prompt_text ?? '' }))));

/* blueprint conformance - each form should match its blueprint's target size */
let blueprints = [];
try {
  blueprints = await fetchTable('qb_exam_blueprints', 'id,payload');
} catch { /* table may not exist in older snapshots */ }
const bpById = new Map(blueprints.map((b) => [b.id, b.payload ?? {}]));
// forms link to blueprints by naming convention: '<blueprintId>-form-NN'
const formBlueprintId = (f) =>
  f.blueprint_id ?? f.payload?.blueprintId ?? f.id.replace(/-form-\d+$/, '');

check('form-blueprint-size', 'P1',
  'Form question count differs from blueprint targetQuestions',
  forms.filter((f) => {
    const bp = bpById.get(formBlueprintId(f));
    const target = bp?.targetQuestions;
    if (!target) return false;
    return (f.payload?.questionIds ?? []).length !== target;
  }).map((f) => ({ id: f.id, prompt_text: `${(f.payload?.questionIds ?? []).length} questions vs blueprint target ${bpById.get(formBlueprintId(f))?.targetQuestions}` })));

check('form-blueprint-missing', 'P1',
  'Form references a blueprint that does not exist',
  forms.filter((f) => {
    // only forms that actually claim a blueprint: explicit column/payload
    // ref, or the '<blueprintId>-form-NN' naming convention. Minted
    // assignment forms (asg-*) carry neither - blueprint_id is NULL by
    // design - and must not be flagged.
    const ref = f.blueprint_id ?? f.payload?.blueprintId
      ?? (/-form-\d+$/.test(f.id) ? f.id.replace(/-form-\d+$/, '') : null);
    return ref && !bpById.has(ref);
  }).map((f) => ({ id: f.id, prompt_text: `blueprint ${formBlueprintId(f)} not found` })));

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
