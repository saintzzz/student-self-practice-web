// Convert the full multi-grade IOE harvest (docs/research/ioe/all-raw.json)
// into the app bank src/data/ioeRealBank.ts.
//
// Answer provenance per type:
//   type 10 (mcq)      -> hand-solved answers in mcq-answers.json (text-only
//                         items; media-dependent items are dropped)
//   type 5  (reorder)  -> tiles sorted by `orderTrue` (verified ground truth)
//   type 25 (makeword) -> hand-solved chunk-subset answers below
//   type 2  (masked)   -> OVERRIDES (hand-checked) + dictionary solver
//   type 1  (t/f)      -> TF_ANSWERS for text-passage items only
//   type 12/13 (listen)-> transcript kept for TTS-backed listening items
//   type 7  (matching) -> dropped (right side is a copyrighted image)
//
// Usage: node scripts/ioe-convert-all.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const RAW = path.join(ROOT, 'docs/research/ioe/all-raw.json');
const MCQ_KEY = path.join(ROOT, 'docs/research/ioe/mcq-answers.json');
const OUT = path.join(ROOT, 'src/data/ioeRealBank.ts');

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const mcqKey = JSON.parse(fs.readFileSync(MCQ_KEY, 'utf8'));

// ---------- dictionary ----------
const ipaSrc = fs.readFileSync(path.join(ROOT, 'src/data/ipaMap.ts'), 'utf8');
const ipaWords = [...ipaSrc.matchAll(/"([a-z][a-z' -]*)":/g)].map((m) => m[1]);
const commonSrc = fs.readFileSync(path.join(ROOT, 'src/data/commonEnglishWords.ts'), 'utf8');
const commonWords = [...commonSrc.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);

const harvestedWords = new Set();
for (const g of Object.keys(raw)) {
  for (const q of raw[g]) {
    const texts = [q.Description?.content, q.content?.content, ...(q.ans || []).map((a) => a.content)].filter(Boolean);
    for (const t of texts) {
      if (/^https?:/.test(t)) continue;
      for (const w of t.toLowerCase().match(/[a-z']+/g) || []) harvestedWords.add(w.replace(/^'+|'+$/g, ''));
    }
  }
}

const PROPER = ['january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'australia', 'england', 'america', 'vietnam', 'singapore', 'malaysia', 'thailand', 'china', 'japan', 'korea', 'france', 'britain', 'london', 'hanoi',
  'christmas', 'halloween', 'tet', 'mid-autumn', 'festival', "children's", "women's", "teacher's", 'independence'];

const freq = new Map();
[...ipaWords, ...PROPER, ...harvestedWords, ...commonWords].forEach((w, i) => {
  const k = w.toLowerCase();
  if (/^[a-z][a-z' -]*$/.test(k) && !freq.has(k)) freq.set(k, i);
});
const dict = [...freq.keys()];
const anagramKey = (w) => [...w.toLowerCase()].sort().join('');

function solveMasked(sentence, maskLen) {
  const m = sentence.match(/\S*[*_]\S*/);
  if (!m) return null;
  const tok = m[0];
  const star = tok.match(/[*_]+/);
  const prefix = tok.slice(0, star.index).replace(/[^a-zA-Z'-]/g, '');
  const suffix = tok.slice(star.index + star[0].length).replace(/[^a-zA-Z'-]/g, '');
  const n = maskLen || star[0].length;
  if (n <= 0 || n > 10) return null;
  if (prefix.length + suffix.length === 0) return null;

  const scr = sentence.match(/[Uu]nscramble\s+(?:this|the)?\s*(?:following)?\s*word:?[\s']*([A-Za-z]+)/);
  let cands;
  if (scr) {
    const key = anagramKey(scr[1]);
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
  const allCaps = /^[A-Z' -]+$/.test(prefix + suffix) && (prefix + suffix).length > 0;
  const word = allCaps ? top.toUpperCase() : prefix + top.slice(prefix.length, top.length - suffix.length) + suffix;
  const missing = word.slice(prefix.length, word.length - suffix.length);
  return { word, missing, candidates: cands.length, ambiguous };
}

// Hand-checked masked-word answers keyed by ioe question id.
// G4 set verified 2026-10-01; G1 + newly harvested G4 rows solved
// 2026-10-02 from sentence context.
const OVERRIDES = new Map(Object.entries({
  // --- grade 1 ---
  1675253: 'ball', 1675256: 'ball', 1675254: 'bike', 1675257: 'bike',
  1675255: 'book', 1675258: 'One', 1675260: 'Bye', 1675261: 'Hi',
  1675259: 'Two', 1675262: 'school',
  // --- grade 4 (hand-checked full set) ---
  1431533: 'with', 1431539: 'is', 62587: 'old', 1429507: 'morning',
  1681419: 'are', 54978: 'long', 1431551: 'See', 55628: 'His',
  1569814: 'Canada', 54986: 'milk', 54967: 'room', 54973: 'BOOK',
  1429505: 'Hello', 55621: 'He', 55615: 'are', 55625: 'an',
  54976: 'RULER', 1681425: 'bananas', 1431543: 'meet', 62581: 'What',
  1617045: 'Australia', 1390034: 'PUPIL', 1463478: 'THIRTEEN',
  1617048: 'three', 1463535: 'BLANKET', 1463531: 'KITCHEN',
  1463515: 'HOMEWORK', 1616721: 'food', 1530452: 'green',
  1531336: 'BRITAIN', 1463738: 'doctor', 1463579: 'water',
  1274644: 'Tuesday', 1274290: 'any', 1616720: 'after',
  1617055: 'leaves', 1628253: 'presents', 1627097: 'FOOTBALL',
  1627644: 'round', 1412131: 'HOSPITAL', 1544592: 'sofa',
  1627950: 'plays', 1544254: 'nationality', 1627092: 'star',
  1544300: 'baker', 1471035: 'yellow', 1543967: 'feeds',
  1411870: 'breakfast', 1593158: 'Doctor', 1517677: 'grapes',
  1594467: 'Swing', 1381087: 'behind', 1381342: 'snowy',
  1271119: 'Class', 1314886: 'studies', 1594249: 'History',
  1319262: 'second', 1593515: 'drinking', 1315094: 'English',
  1314907: 'Friday', 1447727: 'boat', 1594767: 'Summer',
  1514328: 'from', 1315108: 'to', 1517644: 'OCTOBER',
  1517046: 'THIRTY', 1594775: 'chat', 1380992: 'painting',
  1518265: 'Vietnamese', 1447177: 'after', 1446842: 'SKATE',
  1381007: 'picture',
  // --- grade 4 carry-over set (verified 2026-10-01) ---
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
  1627069: 'quiet', 1485028: 'nineteen',
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

// masked items whose true answer cannot be verified confidently
const DROP_IDS = new Set([
  1222186, 1228435, 1528371, 1463701, 1390096, 1406412, 1463747,
  1406209, 1626834, 1627439, 1628019, 1627720, 1627721, 1419260,
  1556297, 1627719, 1627453, 1446562, 1271285, 1514385, 1447175,
  1447474, 1517684, 1270979, 1517396, 1271272, 1412029, 1380981,
]);

// Hand-solved True/False (image/audio-passage items are dropped).
const TF_ANSWERS = new Map(Object.entries({
  1692590: true, 1692588: true, 1692715: true, 1690105: true,
  1690123: true,
  1692610: false, 1692600: false, 1692829: false, 1692825: false,
  1692841: false, 1692844: false, 1692709: false, 1692723: false,
  1692722: false, 1690102: false,
}));

// Type-25 "make the correct word" answers - chunks sorted/selected by hand.
const MAKEWORD = new Map(Object.entries({
  1675239: 'BOOK', 1675240: 'BIKE', 1675237: 'BALL', 1675238: 'BILL',
  1675241: 'SAY', 1675243: 'HELLO', 1675245: 'LOOK', 1675244: 'BYE',
  1675242: 'HI', 1675246: 'SCHOOL',
  1675331: 'LOOK', 1675333: 'DRINK', 1675329: 'LIKE', 1675330: 'SING',
  1675332: 'LISTEN', 1675335: 'PASTA', 1675336: 'POPCORN',
  1675337: 'YUMMY', 1675334: 'PARTY', 1675338: 'BIRTHDAY',
}));

const isMedia = (s) => !!s && (/^https?:/.test(s) || /^\[media\]/.test(s));

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\n/g, ' ').replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').replace(/'/g, "\\'").trim();

const GRADE_KEY = { g1: 'grade-1', g2: 'grade-2', g3: 'grade-3', g4: 'grade-4', g5: 'grade-5' };

const out = {};
const stats = {};
const seenIds = new Set();

for (const [g, questions] of Object.entries(raw)) {
  const bank = { mcq: [], reorder: [], masked: [], makeWord: [], listen: [], tf: [] };
  const skipped = { media: 0, noAnswer: 0, ambiguousMasked: 0, dup: 0 };
  for (const q of questions) {
    if (seenIds.has(q.id)) { skipped.dup++; continue; }
    seenIds.add(q.id);
    const desc = q.Description?.content || '';
    const content = q.content?.content || '';

    if (q.type === 10) {
      const opts = (q.ans || []).map((a) => a.content);
      const media = isMedia(desc) || /^https?:/.test(content) || opts.some((o) => /^https?:/.test(o));
      if (media) { skipped.media++; continue; }
      const key = mcqKey[String(q.id)];
      if (!key || opts.length !== 4 || !opts[key.idx]) { skipped.noAnswer++; continue; }
      if (new Set(opts.map((o) => o.trim().toLowerCase())).size !== 4) { skipped.noAnswer++; continue; }
      const prompt = (desc && !/^Choose the/i.test(desc) ? desc + ' ' : '') + content;
      bank.mcq.push({ prompt: prompt.replace(/^Choose the correct answer for the following question:?\s*/i, '').trim(), options: opts, answer: key.idx });
    } else if (q.type === 5) {
      const tiles = [...(q.ans || [])].sort((a, b) => a.orderTrue - b.orderTrue).map((a) => a.content.trim());
      if (tiles.length < 3) continue;
      const sentence = tiles.join(' ').replace(/\s+([.,?!;'])/g, '$1').replace(/\s+'s\b/g, "'s").trim();
      bank.reorder.push(sentence);
    } else if (q.type === 25) {
      const word = MAKEWORD.get(String(q.id));
      if (!word) { skipped.noAnswer++; continue; }
      const chunks = (q.ans || []).map((a) => a.content);
      bank.makeWord.push({ word, chunks });
    } else if (q.type === 2) {
      const sentence = content;
      if (!sentence || !sentence.match(/[*_]/)) continue;
      if (DROP_IDS.has(q.id)) { skipped.noAnswer++; continue; }
      const tok = sentence.match(/\S*[*_]+\S*/);
      const star = tok[0].match(/[*_]+/);
      const preLen = tok[0].slice(0, star.index).replace(/[^a-zA-Z'-]/g, '').length;
      const sufLen = tok[0].slice(star.index + star[0].length).replace(/[^a-zA-Z'-]/g, '').length;
      let word;
      if (OVERRIDES.has(String(q.id))) {
        word = OVERRIDES.get(String(q.id));
        const pre = tok[0].slice(0, star.index).replace(/[^a-zA-Z'-]/g, '').toLowerCase();
        const suf = tok[0].slice(star.index + star[0].length).replace(/[^a-zA-Z'-]/g, '').toLowerCase();
        const w = word.toLowerCase();
        if ((pre && !w.startsWith(pre)) || (suf && !w.endsWith(suf)) ||
            w.length !== pre.length + suf.length + (q.numTChar || star[0].length)) { skipped.noAnswer++; continue; }
      } else {
        const solved = solveMasked(sentence, q.numTChar);
        if (!solved) { skipped.noAnswer++; continue; }
        if (solved.ambiguous) { skipped.ambiguousMasked++; continue; }
        word = solved.word;
      }
      const missing = word.slice(preLen, word.length - sufLen);
      const full = sentence.replace(/\S*[*_]+\S*/, word);
      const maskedDisplay = sentence.replace(/[*_]+/, (mm) => '_ '.repeat(mm.length).trim());
      bank.masked.push({ word, missing, sentence: full, displaySentence: maskedDisplay });
    } else if (q.type === 1) {
      if (/^https?:/.test(content)) { skipped.media++; continue; }
      const answer = TF_ANSWERS.get(String(q.id));
      if (answer === undefined) { skipped.noAnswer++; continue; }
      bank.tf.push({ passage: '', statement: content, answer });
    } else if (q.type === 12 || q.type === 13) {
      if (!isMedia(desc) || !content) continue;
      bank.listen.push(content.trim());
    }
  }
  const dedup = (arr, key) => { const s = new Set(); return arr.filter((x) => { const k = key(x).toLowerCase(); if (s.has(k)) return false; s.add(k); return true; }); };
  bank.mcq = dedup(bank.mcq, (x) => x.prompt);
  bank.reorder = dedup(bank.reorder, (x) => x);
  bank.masked = dedup(bank.masked, (x) => x.displaySentence);
  bank.makeWord = dedup(bank.makeWord, (x) => x.word);
  bank.listen = dedup(bank.listen, (x) => x);
  bank.tf = dedup(bank.tf, (x) => x.statement);
  out[GRADE_KEY[g]] = bank;
  stats[g] = {
    mcq: bank.mcq.length, reorder: bank.reorder.length, masked: bank.masked.length,
    makeWord: bank.makeWord.length, listen: bank.listen.length, tf: bank.tf.length, skipped,
  };
}

const renderBank = (b) => `{
  mcq: [
${b.mcq.map((x) => `    { prompt: '${esc(x.prompt)}', options: ['${x.options.map(esc).join("', '")}'], answer: ${x.answer}, explanationVi: '${esc(`Đáp án đúng: "${x.options[x.answer]}".`)}' },`).join('\n')}
  ],
  reorder: [
${b.reorder.map((s) => `    '${esc(s)}',`).join('\n')}
  ],
  masked: [
${b.masked.map((x) => `    { word: '${esc(x.word)}', missing: '${esc(x.missing)}', sentence: '${esc(x.sentence)}', displaySentence: '${esc(x.displaySentence)}' },`).join('\n')}
  ],
  makeWord: [
${b.makeWord.map((x) => `    { word: '${esc(x.word)}', chunks: ['${x.chunks.map(esc).join("', '")}'] },`).join('\n')}
  ],
  listen: [
${b.listen.map((s) => `    '${esc(s)}',`).join('\n')}
  ],
  tf: [
${b.tf.map((x) => `    { passage: '${esc(x.passage)}', statement: '${esc(x.statement)}', answer: ${x.answer} },`).join('\n')}
  ],
}`;

const ts = `/**
 * Generated from real IOE harvests (docs/research/ioe/) covering
 * Thi thu grade 4 and Tu luyen grades 1-5, 2026-10.
 * Answer provenance: MCQ answers are hand-solved (mcq-answers.json);
 * reorder/makeWord order is ground truth from payload ordering;
 * masked/tf answers are hand-verified overrides + dictionary match.
 * Media-dependent items (images, listening audio we cannot transcribe)
 * are excluded. Review licensing before shipping verbatim.
 * Do not hand-edit; regenerate with scripts/ioe-convert-all.mjs.
 */
import type { GrammarBankItem } from './grammarBank';

export interface IoeMaskedItem {
  word: string;
  /** The hidden letter run the student must type. */
  missing: string;
  sentence: string;
  displaySentence: string;
}

export interface IoeMakeWordItem {
  word: string;
  chunks: string[];
}

export interface IoeTfItem {
  passage: string;
  statement: string;
  answer: boolean;
}

export interface IoeGradeBank {
  mcq: readonly GrammarBankItem[];
  reorder: readonly string[];
  masked: readonly IoeMaskedItem[];
  makeWord: readonly IoeMakeWordItem[];
  /** Transcripts of listening items - the app generates its own audio. */
  listen: readonly string[];
  tf: readonly IoeTfItem[];
}

export const IOE_BANK: Record<string, IoeGradeBank> = {
${Object.entries(out).map(([g, b]) => `  '${g}': ${renderBank(b)},`).join('\n')}
};

export function ioeBankForGrade(gradeId: string): IoeGradeBank | undefined {
  return IOE_BANK[gradeId];
}
`;

fs.writeFileSync(OUT, ts);
console.log(JSON.stringify(stats, null, 1));
