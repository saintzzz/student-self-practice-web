// Convert normalized IOE harvest (docs/research/ioe/normalized-g4.json)
// into an authored data bank for the app: src/data/ioeRealBank.ts
//
//   mcq     -> GrammarBankItem-compatible rows (text-only; media rows skipped)
//   reorder -> sentence strings for the word-order bank
//   masked  -> solved MissingLetter rows (solved via dictionary match)
//   tf      -> reading True/False rows (answer inferred + confidence flag)
//
// Usage: node scripts/ioe-convert.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const NORM = path.join(ROOT, 'docs/research/ioe/normalized-g4.json');
const OUT = path.join(ROOT, 'src/data/ioeRealBank.ts');

// ---------- dictionary ----------
// Build the candidate word list: curriculum vocab (ipaMap keys are the
// 1141 words we already pronounce) + the frequency list + proper nouns
// mined from the harvest itself (months, countries, subjects...).
const ipaSrc = fs.readFileSync(path.join(ROOT, 'src/data/ipaMap.ts'), 'utf8');
const ipaWords = [...ipaSrc.matchAll(/"([a-z][a-z' -]*)":/g)].map((m) => m[1]);

const commonSrc = fs.readFileSync(path.join(ROOT, 'src/data/commonEnglishWords.ts'), 'utf8');
const commonWords = [...commonSrc.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);

const norm = JSON.parse(fs.readFileSync(NORM, 'utf8'));
const harvestedWords = new Set();
for (const q of norm) {
  const texts = [q.prompt, q.sentence, q.passage, q.statement, ...(q.options || [])].filter(Boolean);
  for (const t of texts) for (const w of t.toLowerCase().match(/[a-z']+/g) || []) harvestedWords.add(w.replace(/^'+|'+$/g, ''));
}

const PROPER = ['january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'australia', 'england', 'america', 'vietnam', 'singapore', 'malaysia', 'thailand', 'china', 'japan', 'korea', 'france', 'britain', 'london', 'hanoi',
  'christmas', 'halloween', 'tet', 'mid-autumn', 'festival', "children's", "women's", "teacher's", 'independence'];

// rank: curriculum/proper words first, then frequency list order.
const freq = new Map();
[...ipaWords, ...PROPER, ...harvestedWords, ...commonWords].forEach((w, i) => {
  const k = w.toLowerCase();
  if (/^[a-z][a-z' -]*$/.test(k) && !freq.has(k)) freq.set(k, i);
});
const dict = [...freq.keys()];

const anagramKey = (w) => [...w.toLowerCase()].sort().join('');

function solveMasked(sentence, maskLen) {
  // find the token containing * or _
  const m = sentence.match(/\S*[*_]\S*/);
  if (!m) return null;
  const tok = m[0];
  const star = tok.match(/[*_]+/);
  const prefix = tok.slice(0, star.index).replace(/[^a-zA-Z'-]/g, '');
  const suffix = tok.slice(star.index + star[0].length).replace(/[^a-zA-Z'-]/g, '');
  const n = maskLen || star[0].length;
  if (n <= 0 || n > 8) return null;
  // Only solve masks that keep at least one visible letter - whole-word
  // masks ("*** lunch") are pure-context guesses and too risky to ship.
  if (prefix.length + suffix.length === 0) return null;

  // "Unscramble this word: NEEIRTTH --> TH******" - the answer is an
  // anagram of the scramble, which pins it exactly.
  const scr = sentence.match(/[Uu]nscramble\s+(?:this|the)?\s*word:?\s*([A-Za-z]+)/);
  let cands;
  if (scr) {
    const key = anagramKey(scr[1]);
    // exclude the scramble itself - "NEEIRTTH" sorts to the same key
    cands = dict.filter((w) => anagramKey(w) === key && w !== scr[1].toLowerCase() && !w.includes(' ') && !w.includes('-'));
  } else {
    const re = new RegExp(`^${prefix.toLowerCase()}[a-z']{${n}}${suffix.toLowerCase()}$`, 'i');
    cands = dict.filter((w) => re.test(w) && !w.includes(' ') && !w.includes('-'));
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => freq.get(a) - freq.get(b));
  const top = cands[0];
  const curriculumTop = ipaWords.includes(top) || PROPER.includes(top) || harvestedWords.has(top);
  const ambiguous = cands.length > 1 && !(curriculumTop && cands.length <= 4);

  // Preserve the mask's letter case: all-caps visible letters mean the
  // answer is shown uppercase ("P**IL" -> "PUPIL"); otherwise normal
  // casing with the displayed prefix.
  const allCaps = /^[A-Z' -]+$/.test(prefix + suffix) && (prefix + suffix).length > 0;
  const word = allCaps ? top.toUpperCase() : prefix + top.slice(prefix.length, top.length - suffix.length) + suffix;
  const missing = word.slice(prefix.length, word.length - suffix.length);
  return { word, missing, candidates: cands.length, ambiguous };
}

// Hand-checked answers for the masked-word questions, solved from
// sentence context 2026-10-01. Keyed by ioe question id -> full word.
const OVERRIDES = new Map(Object.entries({
  1274129: 'for', 1531357: 'August', 1274286: 'in', 1390029: 'Are',
  1530743: 'eight', 1560585: 'Lake', 1406770: 'in', 1463606: 'Saturday',
  1218995: 'hobby', 1528368: 'badminton', 1406357: 'thirtieth',
  1607307: 'are', 1390039: 'is', 1274269: 'job', 1609234: 'not',
  1528344: 'on', 1274291: 'starts', 1406385: 'with', 1462657: 'under',
  1530728: 'eat', 1463556: 'to', 1530736: 'BEDROOM', 1274140: 'Friday',
  1406784: 'pupils', 1406393: 'yellow', 1530428: 'Because',
  1463538: 'Monday', 1530739: 'cinema', 1406405: 'exercise',
  1530440: 'foot', 1406600: 'classmate', 1617028: 'GAVE',
  1274658: 'friends', 1556509: 'Happy', 1419201: 'in', 1627111: 'walks',
  1640885: 'housework', 1640858: 'as', 1556526: 'ten', 1627076: 'When',
  1485033: 'second', 1627672: 'on', 1485015: 'cheap', 1640838: 'There',
  1556499: 'for', 1640613: 'windy', 1627955: 'clean', 1556547: 'cinema',
  1419203: 'four', 1485012: 'dentist', 1627949: 'sports',
  1485025: 'Fool', 1628020: 'postcards', 1627061: 'worker',
  1627667: 'past', 1560660: 'odd', 1419258: 'pool', 1485016: 'bamboo',
  1640850: 'before', 1419253: 'wearing', 1628279: 'wore',
  1556288: 'sailing', 1628046: 'practise', 1627078: 'many',
  1650335: 'red', 1627660: 'gift', 1556512: 'did', 1419237: 'weekend',
  1628043: 'amusement', 1628290: 'four', 1627960: 'baker',
  1640879: 'five', 1419274: 'having', 1419269: 'off', 1627068: 'SHORT',
  1419267: 'from', 1640852: 'pull', 1419268: 'dangerous',
  1627069: 'quiet', 1627097: 'baseball', 1485028: 'nineteen',
  1485030: 'fourteen', 1556524: 'feeds', 1278052: 'lucky',
  1627648: 'Wednesday', 1412143: 'sing', 1278771: 'When',
  1627988: 'singer', 1470951: 'strong', 1474341: 'nationality',
  1412106: 'cooks', 1279356: 'zebra', 1627107: 'cake',
  1628244: 'short', 1470963: 'food', 1412370: 'football',
  1471070: 'evening', 1650187: 'campsite', 1628271: 'has',
  1474363: 'rice', 1544252: 'WROTE', 1628304: 'flowers',
  1560619: 'snow', 1412056: 'MOMMY', 1624398: 'village',
  1470091: 'winter', 1470086: 'Sundays', 1278776: 'the',
  1412165: 'lot', 1624586: 'painting', 1544856: 'nursing',
  1474387: 'dictionary', 1474202: 'turtle', 1627744: 'apartment',
  1471085: 'ten', 1223620: 'often', 1278088: 'Where',
  1471007: 'eleventh', 1474358: 'Maths', 1627681: 'MET',
  1628268: 'SHORT', 1219786: 'stayed', 1411938: 'coming',
  1471037: 'pie', 1544267: 'visit', 1412210: 'larger',
  1471041: 'starts', 1650205: 'traffic', 1594540: 'horse',
  1314889: 'playing', 1517031: 'ride', 1381093: 'Nice',
  1446221: 'of', 1516811: 'Wednesdays', 1446810: 'like',
  1517059: 'dog', 1315115: 'from', 1447762: 'puppets',
  1517036: 'How', 1270945: 'the', 1511536: 'Where',
  1319228: 'zoo', 1271107: 'April', 1446601: 'PAPER',
  1517988: 'basketball', 1517095: 'teeth', 1594181: 'after',
  1593473: 'timetable', 1380703: 'the', 1381140: 'between',
  1381000: 'central', 1517355: 'city', 1446258: 'Who',
}));

// masked sentences whose true answer cannot be verified confidently
const DROP_IDS = new Set([
  1222186, 1228435, 1528371, 1463701, 1390096, 1406412, 1463747,
  1406209, 1626834, 1627439, 1628019, 1627720, 1627721, 1419260,
  1556297, 1627719, 1627453, 1446562, 1271285, 1514385, 1447175,
  1447474, 1517684, 1270979, 1517396, 1271272, 1412029, 1380981,
]);

// Hand-solved True/False answers (image-passage items are dropped
// below - we cannot reproduce the picture). Verified 2026-10-01.
const TF_ANSWERS = new Map(Object.entries({
  1692590: true, 1692588: true, 1692715: true, 1690105: true,
  1690123: true,
  1692610: false, 1692600: false, 1692829: false, 1692825: false,
  1692841: false, 1692844: false, 1692709: false, 1692723: false,
  1692722: false, 1690102: false,
}));

// ---------- convert ----------
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const outMcq = [];
const outReorder = [];
const outMasked = [];
const outTf = [];
const skipped = { media: 0, noAnswer: 0, ambiguousMasked: 0, badOpt: 0 };

for (const q of norm) {
  if (q.kind === 'mcq') {
    if (q.image || q.audio || (q.optionImages || []).some(Boolean)) { skipped.media++; continue; }
    let prompt = q.prompt.replace(/^Choose the correct answer for the following question:?\s*/i, '').trim();
    const opts = q.options.filter((o) => o && !/^https?:/.test(o));
    if (opts.length !== 4 || !opts[q.correctIndex]) { skipped.badOpt++; continue; }
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) { skipped.badOpt++; continue; }
    const correct = opts[q.correctIndex];
    outMcq.push({ id: q.id, prompt, options: opts, answer: q.correctIndex, explanationVi: `Đáp án đúng: "${correct}".` });
  } else if (q.kind === 'reorder') {
    if (q.sentence && q.sentence.split(' ').length >= 4) outReorder.push(q.sentence);
  } else if (q.kind === 'masked') {
    if (DROP_IDS.has(q.id)) { skipped.noAnswer++; continue; }
    let word;
    if (OVERRIDES.has(String(q.id))) {
      word = OVERRIDES.get(String(q.id));
      // sanity: visible prefix/suffix must match the override word
      const tok = q.sentence.match(/\S*[*_]+\S*/)[0];
      const star = tok.match(/[*_]+/);
      const pre = tok.slice(0, star.index).replace(/[^a-zA-Z'-]/g, '').toLowerCase();
      const suf = tok.slice(star.index + star[0].length).replace(/[^a-zA-Z'-]/g, '').toLowerCase();
      const w = word.toLowerCase();
      if (pre && !w.startsWith(pre)) { skipped.noAnswer++; continue; }
      if (suf && !w.endsWith(suf)) { skipped.noAnswer++; continue; }
      if (w.length !== pre.length + suf.length + (q.missingCount || star[0].length)) { skipped.noAnswer++; continue; }
    } else {
      const solved = solveMasked(q.sentence, q.missingCount);
      if (!solved) { skipped.noAnswer++; continue; }
      if (solved.ambiguous) { skipped.ambiguousMasked++; continue; }
      word = solved.word;
    }
    // missing = the middle run: word minus visible prefix/suffix
    const tok2 = q.sentence.match(/\S*[*_]+\S*/)[0];
    const star2 = tok2.match(/[*_]+/);
    const preLen = tok2.slice(0, star2.index).replace(/[^a-zA-Z'-]/g, '').length;
    const sufLen = tok2.slice(star2.index + star2[0].length).replace(/[^a-zA-Z'-]/g, '').length;
    const missing = word.slice(preLen, word.length - sufLen);
    const full = q.sentence.replace(/\S*[*_]+\S*/, word);
    const maskedDisplay = q.sentence.replace(/[*_]+/, (mm) => '_ '.repeat(mm.length).trim());
    outMasked.push({ id: q.id, word, missing, sentence: full, displaySentence: maskedDisplay });
  } else if (q.kind === 'tf') {
    // drop image passages - we cannot reproduce the picture
    if (/^https?:/.test(q.passage)) { skipped.media++; continue; }
    const answer = TF_ANSWERS.get(String(q.id));
    if (answer === undefined) { skipped.noAnswer++; continue; }
    outTf.push({ id: q.id, passage: q.passage, statement: q.statement, answer });
  }
}

// de-dupe by text
const dedup = (arr, key) => { const s = new Set(); return arr.filter((x) => { const k = key(x).toLowerCase(); if (s.has(k)) return false; s.add(k); return true; }); };
const mcq = dedup(outMcq, (x) => x.prompt);
const reorder = dedup(outReorder, (x) => x);
const masked = dedup(outMasked, (x) => x.displaySentence);
const tf = dedup(outTf, (x) => x.statement);

const ts = `/**
 * Generated from a real IOE G4 Thi thử harvest (docs/research/ioe/).
 * Source: ioe.vn authorized-session research, 2026-10. Provenance kept
 * via the ioe-<id> ids - review licensing before shipping verbatim.
 * Do not hand-edit; regenerate with scripts/ioe-convert.mjs.
 */
import type { GrammarBankItem } from './grammarBank';

export interface IoeMaskedItem {
  word: string;
  /** The hidden letter run the student must type. */
  missing: string;
  sentence: string;
  displaySentence: string;
}

export interface IoeTfItem {
  passage: string;
  statement: string;
  answer: boolean;
}

export const IOE_MCQ_G4: readonly GrammarBankItem[] = [
${mcq.map((x) => `  { prompt: '${esc(x.prompt)}', options: ['${x.options.map(esc).join("', '")}'], answer: ${x.answer}, explanationVi: '${esc(x.explanationVi)}' },`).join('\n')}
];

export const IOE_REORDER_G4: readonly string[] = [
${reorder.map((s) => `  '${esc(s)}',`).join('\n')}
];

export const IOE_MASKED_G4: readonly IoeMaskedItem[] = [
${masked.map((x) => `  { word: '${esc(x.word)}', missing: '${esc(x.missing)}', sentence: '${esc(x.sentence)}', displaySentence: '${esc(x.displaySentence)}' },`).join('\n')}
];

export const IOE_TF_G4: readonly IoeTfItem[] = [
${tf.map((x) => `  { passage: '${esc(x.passage)}', statement: '${esc(x.statement)}', answer: ${x.answer} },`).join('\n')}
];
`;

fs.writeFileSync(OUT, ts);
console.log({ mcq: mcq.length, reorder: reorder.length, masked: masked.length, tf: tf.length, skipped });
