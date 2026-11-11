#!/usr/bin/env node
/**
 * CR-128 M1 pilot - deterministic Vietnamese-math template generator.
 * Vietnamese prompt frames x number ranges x contexts -> unique items,
 * zero API cost. Same row shape + content-hash upsert semantics as
 * gen-template-math-sci.mjs; subject='math-vi' keeps the track separate
 * from 'math' (math-in-English).
 *
 *   node scripts/gen-template-mathvi.mjs --grade 3 [--dry]
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { puzzleCells, puzzleSlot, puzzleAssetId, puzzleOptionLabel } from './lib-puzzle.mjs';

const ARGS = process.argv.slice(2);
const arg = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; };
const GRADE = Number(arg('--grade', 0));
const DRY = ARGS.includes('--dry');
if (!GRADE) { console.error('need --grade 1..5'); process.exit(1); }

const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url, SVC = keys.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', 'Accept-Profile': 'practice', 'Content-Profile': 'practice', Prefer: 'resolution=ignore-duplicates,return=minimal,count=exact' };

const seedNum = Number(createHash('sha1').update(`mathvi:${GRADE}:tpl-v1`).digest('hex').slice(0, 8), 16);
let rngState = seedNum >>> 0;
const rng = () => {
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rnd = (n) => Math.floor(rng() * n);
const rr = (lo, hi) => lo + rnd(hi - lo + 1);
const pick = (arr) => arr[rnd(arr.length)];
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };

const NAMES = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Huy', 'Lan', 'Mai', 'Nam', 'Phúc', 'Quân', 'Thu'];
// [full form with classifier, short noun]. Prompts ALWAYS use the full
// form ("5 quyển vở") - bare nouns ("5 vở") read as broken Vietnamese.
const ITEMS = [['quả cam', 'cam'], ['cái kẹo', 'kẹo'], ['quyển vở', 'vở'], ['hòn bi', 'bi'], ['cây bút', 'bút'], ['quyển sách', 'sách'], ['cái nhãn vở', 'nhãn vở'], ['bông hoa', 'hoa'], ['quả táo', 'táo'], ['quả xoài', 'xoài'], ['quả ổi', 'ổi']];
// "hái" collocates only with flowers and fruit - never stationery/marbles.
const HARVEST_ITEMS = [['quả cam', 'cam'], ['quả táo', 'táo'], ['quả xoài', 'xoài'], ['quả ổi', 'ổi'], ['quả mận', 'mận'], ['bông hoa', 'hoa']];
// Containers that plausibly hold each item ("xếp sách vào lọ" is wrong).
const CONTAINERS = {
  cam: ['túi', 'rổ', 'hộp'], táo: ['túi', 'rổ', 'hộp'], xoài: ['túi', 'rổ', 'hộp'], 'ổi': ['túi', 'rổ', 'hộp'],
  kẹo: ['túi', 'hộp', 'lọ'], vở: ['hộp', 'kệ', 'túi'], bi: ['hộp', 'lọ', 'túi', 'rổ'],
  bút: ['hộp', 'lọ', 'túi'], sách: ['kệ', 'hộp', 'túi'], 'nhãn vở': ['hộp', 'túi', 'lọ'], hoa: ['rổ', 'túi'],
};

const items = [];
const seen = new Set();
const num = (n) => n.toLocaleString('vi-VN');

/** push a mcq item; distractors are plausible-wrong strings, deduped.
 *  feedback (optional): { distractorValue: "tại sao sai" } - misconception
 *  hints shown when the student picks that wrong option. */
function push(skill, domain, difficulty, prompt, answer, distractors, expl, feedback) {
  const key = prompt;
  if (seen.has(key)) return;
  seen.add(key);
  const wrong = [...new Set(distractors.map(String))].filter((d) => d !== String(answer)).slice(0, 3);
  if (wrong.length < 3) return;
  const choices = shuffle([String(answer), ...wrong]);
  items.push({
    id: `g${GRADE}-mathvi-tpl-${createHash('sha1').update(key).digest('hex').slice(0, 12)}`,
    grade: GRADE, subject: 'math-vi', domain, skill, question_type: 'mcq', difficulty,
    prompt_text: prompt,
    choices, answer: { text: String(answer), index: choices.indexOf(String(answer)), ...(feedback ? { distractor_feedback: feedback } : {}) },
    explanation_vi: expl, canonical: true, tags: ['vi'],
    rights_status: 'owned-original-generated',
    curriculum_alignment: { grade: GRADE, coreTopic: skill, moetSubject: 'Mathematics', alignmentLevel: 'topic-skill', curriculumRole: 'core', primaryFramework: 'MOET-2018' },
    source: { kind: 'generated-v6', method: 'cr128-mathvi-template', provenance: 'Deterministic Vietnamese template generation; original, not copied.' },
    review_status: 'approved',
    publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: false, requiresHumanApprovalForCommercialRelease: false },
    content_hash: createHash('sha1').update(`${GRADE}|mathvi|${key}`).digest('hex').slice(0, 12),
  });
}

// ---------- per-grade Vietnamese math frames (MOET/SGK ranges) ----------

if (GRADE === 1) { // G1: số đến 20/100, cộng trừ trong 10-20, so sánh, hình, giờ đúng
  for (let i = 0; i < 24; i++) {
    const a = rr(2, 9), b = rr(1, 9), s = a + b;
    push('arithmetic', 'numbers', 1, `Tính: ${a} + ${b} = ?`, s, [s + 1, s - 1, s + 2, s + 10], `${a} + ${b} = ${s}.`);
    const c = rr(5, 18), d = rr(1, c - 1), t = c - d;
    push('arithmetic', 'numbers', 1, `Tính: ${c} - ${d} = ?`, t, [t + 1, t - 1, t + 2, d], `${c} - ${d} = ${t}.`);
    const ten = rr(11, 19), u = rr(1, 9);
    push('arithmetic', 'numbers', 2, `Tính: ${ten} - ${u} = ?`, ten - u, [ten - u + 1, ten - u - 1, ten - u + 10], `${ten} - ${u} = ${ten - u}.`);
  }
  for (let i = 0; i < 20; i++) {
    const a = rr(1, 20), b = rr(1, 20);
    if (a !== b) push('number-sense', 'numbers', 1, `Số nào LỚN HƠN: ${a} hay ${b}?`, Math.max(a, b), [Math.min(a, b), Math.max(a, b) + 1, Math.max(a, b) + 10], `${Math.max(a, b)} lớn hơn ${Math.min(a, b)}.`);
    const n = rr(2, 19);
    push('number-sense', 'numbers', 1, `Số liền sau của số ${n} là số nào?`, n + 1, [n - 1, n + 2, n + 10], `Số liền sau của ${n} là ${n + 1}.`);
    push('number-sense', 'numbers', 1, `Số liền trước của số ${n + 1} là số nào?`, n, [n + 1, n + 2, n - 1], `Số liền trước của ${n + 1} là ${n}.`);
    const [obj] = pick(ITEMS), x = rr(2, 8), y = rr(1, 9), nm = pick(NAMES);
    push('word-problem', 'numbers', 2, `Bạn ${nm} có ${x} ${obj}. Mẹ cho ${nm} thêm ${y} ${obj}. Hỏi ${nm} có tất cả bao nhiêu ${obj}?`, x + y, [x + y + 1, x + y - 1, Math.abs(x - y)], `${x} + ${y} = ${x + y}.`);
    const k = pick([1, 2]), st = rr(1, 10), terms = [st, st + k, st + 2 * k, st + 3 * k];
    push('patterns', 'numbers', 2, `Điền số vào chỗ trống: ${terms.slice(0, 3).join(', ')}, ___`, terms[3], [terms[3] + 1, terms[3] - 1, terms[3] + k + 1], `Dãy đếm thêm ${k}: ${terms[2]} + ${k} = ${terms[3]}.`);
  }
  for (let i = 0; i < 10; i++) {
    const h = rr(1, 12);
    push('time', 'measurement', 1, `Lúc ${h} giờ đúng, kim phút chỉ vào số mấy?`, 12, [h, 6, 3], `Giờ đúng: kim phút chỉ số 12.`);
    const geo = pick([
      ['Hình có 3 cạnh gọi là hình gì?', 'tam giác', ['vuông', 'tròn', 'chữ nhật'], 'Hình có 3 cạnh là hình tam giác.'],
      ['Hình có 4 cạnh bằng nhau gọi là hình gì?', 'vuông', ['chữ nhật', 'tam giác', 'tròn'], '4 cạnh bằng nhau là hình vuông.'],
      ['Hình nào KHÔNG có cạnh?', 'tròn', ['vuông', 'tam giác', 'chữ nhật'], 'Hình tròn không có cạnh.'],
    ]);
    push('geometry', 'geometry', 1, geo[0], geo[1], geo[2], geo[3]);
    const w = rr(3, 9), k1 = rr(1, w - 1);
    push('number-sense', 'numbers', 2, `${w} = ${k1} + ?`, w - k1, [w - k1 + 1, w - k1 - 1, k1], `${w} = ${k1} + ${w - k1}.`);
  }
  for (let i = 0; i < 30; i++) { // nâng cao G1: hai bước, tìm số trừ/bị trừ, so sánh chênh lệch, tiền
    const x = rr(6, 12), y = rr(3, 8), z = rr(1, 5), s = x + y - z;
    push('arithmetic', 'numbers', 3, `Tính: ${x} + ${y} - ${z} = ?`, s, [s + 1, s - 1, x + y, x - z], `${x} + ${y} = ${x + y}, rồi ${x + y} - ${z} = ${s}.`);
    const m = rr(10, 20), k2 = rr(2, m - 2);
    push('number-sense', 'numbers', 3, `Số nào trừ đi ${k2} thì bằng ${m - k2}?`, m, [m - k2, m + k2, k2], `Vì ${m} - ${k2} = ${m - k2} nên số cần tìm là ${m}.`);
    const a = rr(8, 19), b = rr(1, a - 2);
    push('number-sense', 'numbers', 3, `Số ${a} lớn hơn số ${b} bao nhiêu đơn vị?`, a - b, [a - b - 1, a - b + 1, a + b], `${a} - ${b} = ${a - b}.`);
    const [obj] = pick(ITEMS), c1 = rr(4, 9), g = rr(2, 6), nm = pick(NAMES);
    push('word-problem', 'numbers', 3, `Bạn ${nm} có ${c1 + g} ${obj}, nhiều hơn em ${g} ${obj}. Hỏi em có bao nhiêu ${obj}?`, c1, [c1 + g + g, c1 + g, g], `Bạn ${nm} có ${c1 + g} ${obj}, nhiều hơn em ${g} ${obj} nên em có ${c1 + g} - ${g} = ${c1} ${obj}.`);
    const vnd = pick([1, 2, 5]);
    push('money', 'numbers', 3, `Nam có 2 tờ ${vnd} nghìn đồng. Hỏi Nam có tất cả bao nhiêu nghìn đồng?`, 2 * vnd, [vnd, 2 * vnd + 1, vnd + 2], `2 tờ ${vnd} nghìn = ${vnd} + ${vnd} = ${2 * vnd} nghìn đồng.`);
  }
}

if (GRADE === 2) { // G2: số đến 1000, cộng trừ có nhớ ≤100, nhân chia 2-5, đo cm/dm/m, lít, giờ
  for (let i = 0; i < 24; i++) {
    const a = rr(15, 88), b = rr(7, 79), s = a + b;
    push('arithmetic', 'numbers', 2, `Tính: ${a} + ${b} = ?`, s, [s + 1, s - 1, s + 10, s - 10], `${a} + ${b} = ${s}.`);
    const c = rr(30, 99), d = rr(8, c - 10), t = c - d;
    push('arithmetic', 'numbers', 2, `Tính: ${c} - ${d} = ?`, t, [t + 1, t - 1, t + 10, t - 10], `${c} - ${d} = ${t}.`);
  }
  for (let i = 0; i < 20; i++) {
    const a = rr(2, 5), b = rr(2, 9), p = a * b;
    push('arithmetic', 'numbers', 2, `${a} × ${b} = ?`, p, [p + a, p - a, p + 1, p + b], `${a} × ${b} = ${p}.`);
    const dv = rr(2, 5), q2 = rr(2, 9), dvd = dv * q2;
    push('arithmetic', 'numbers', 2, `${dvd} : ${dv} = ?`, q2, [q2 + 1, q2 - 1, q2 + 2], `${dvd} : ${dv} = ${q2} vì ${dv} × ${q2} = ${dvd}.`);
  }
  for (let i = 0; i < 20; i++) {
    const a = rr(100, 999), b = rr(100, 999);
    if (a !== b) push('number-sense', 'numbers', 1, `Số nào BÉ HƠN: ${a} hay ${b}?`, Math.min(a, b), [Math.max(a, b), Math.min(a, b) - 1, Math.min(a, b) + 10], `${Math.min(a, b)} bé hơn ${Math.max(a, b)}.`);
    const n = rr(101, 998);
    push('number-sense', 'numbers', 1, `Số liền sau của số ${n} là số nào?`, n + 1, [n - 1, n + 10, n + 2], `Số liền sau của ${n} là ${n + 1}.`);
    const [obj] = pick(ITEMS), x = rr(12, 60), y = rr(8, 40);
    push('word-problem', 'numbers', 2, `Lớp 2A có ${x} ${obj}. Lớp 2B có ${y} ${obj}. Hỏi cả hai lớp có bao nhiêu ${obj}?`, x + y, [x + y + 1, x + y - 1, Math.abs(x - y) + x], `${x} + ${y} = ${x + y}.`);
    const dm = rr(2, 9);
    push('measurement', 'measurement', 2, `${dm} dm = ? cm`, dm * 10, [dm * 100, dm + 10, dm], `1 dm = 10 cm nên ${dm} dm = ${dm * 10} cm.`);
    const lit = rr(2, 15);
    push('measurement', 'measurement', 2, `Can to đựng ${lit + 5} lít, can bé đựng ${lit} lít. Hỏi cả hai can đựng bao nhiêu lít?`, 2 * lit + 5, [2 * lit + 4, 2 * lit + 6, lit + 5], `${lit + 5} + ${lit} = ${2 * lit + 5} lít.`);
  }
  for (let i = 0; i < 8; i++) {
    const h = rr(1, 11);
    push('time', 'measurement', 2, `${h} giờ rưỡi tức là ${h} giờ bao nhiêu phút?`, 30, [15, 45, 60], `${h} giờ rưỡi = ${h} giờ 30 phút.`);
    const geo = pick([
      ['Hình tứ giác có mấy cạnh?', '4', ['3', '5', '6'], 'Hình tứ giác có 4 cạnh.'],
      ['Đoạn thẳng AB dài 5 cm, đoạn BC dài 4 cm. Đường gấp khúc ABC dài bao nhiêu cm?', '9', ['8', '10', '20'], '5 + 4 = 9 cm.'],
      ['Hình chữ nhật có mấy góc vuông?', '4', ['2', '3', '1'], 'Hình chữ nhật có 4 góc vuông.'],
    ]);
    push('geometry', 'geometry', 1, geo[0], geo[1], geo[2], geo[3]);
  }
  for (let i = 0; i < 30; i++) { // nâng cao G2: hai bước, thừa số/số bị chia ẩn, chu vi, tiền lẻ
    const a = rr(3, 9), b = rr(3, 9), p = a * b;
    push('arithmetic', 'numbers', 3, `? × ${b} = ${p}`, a, [a + 1, a - 1, p - b], `Vì ${a} × ${b} = ${p} nên số cần tìm là ${a}.`);
    const dv = rr(2, 5), q2 = rr(3, 9), dvd = dv * q2;
    push('arithmetic', 'numbers', 3, `${dvd} : ? = ${q2}`, dv, [dv + 1, dv - 1, q2], `Vì ${dvd} : ${dv} = ${q2} nên số cần tìm là ${dv}.`);
    const [obj] = pick(HARVEST_ITEMS), c2 = rr(8, 30), c1 = c2 + rr(2, 25), nm = pick(NAMES);
    push('word-problem', 'numbers', 3, `${nm} hái được ${c1} ${obj}, em hái được ${c2} ${obj}. Hỏi ${nm} hái nhiều hơn em bao nhiêu ${obj}?`, c1 - c2, [c1 + c2, c1 - c2 + 1, c1 - c2 - 1], `${c1} - ${c2} = ${c1 - c2}.`);
    const s = rr(3, 9);
    push('geometry', 'geometry', 3, `Hình vuông có cạnh ${s} cm. Chu vi hình vuông là bao nhiêu cm?`, 4 * s, [3 * s, 4 * s + 1, s * s], `Chu vi hình vuông = cạnh × 4 = ${s} × 4 = ${4 * s} cm.`);
    const m = rr(60, 95), n = rr(10, m - 10);
    push('arithmetic', 'numbers', 3, `${m} - ? = ${m - n}`, n, [n + 1, n - 1, m - n - 1], `Vì ${m} - ${n} = ${m - n} nên số cần tìm là ${n}.`);
    const vnd = pick([2, 5]), cnt = rr(2, 4);
    push('money', 'numbers', 3, `Mai có ${cnt} tờ ${vnd} nghìn đồng. Hỏi Mai có tất cả bao nhiêu nghìn đồng?`, cnt * vnd, [cnt * vnd - vnd, cnt * vnd + vnd, vnd], `${cnt} × ${vnd} = ${cnt * vnd} nghìn đồng.`);
  }
}

if (GRADE === 3) { // G3: số đến 1000/10000, nhân chia trong bảng, đo lường, hình, phần số
for (let i = 0; i < 30; i++) { // addition/subtraction within 1000 (có nhớ)
  const a = rr(120, 940), b = rr(45, 880), s = a + b;
  push('arithmetic', 'numbers', 2, `Tính: ${num(a)} + ${num(b)} = ?`, s, [s + 10, s - 10, s + 1, s + 100], `${num(a)} + ${num(b)} = ${num(s)}.`);
  const c = rr(200, 999), d = rr(60, c - 50), t = c - d;
  push('arithmetic', 'numbers', 2, `Tính: ${num(c)} - ${num(d)} = ?`, t, [t + 10, t - 10, t + 1, t - 100], `${num(c)} - ${num(d)} = ${num(t)}.`);
}
for (let i = 0; i < 24; i++) { // multiplication/division tables
  const a = rr(2, 9), b = rr(3, 9), p = a * b;
  push('arithmetic', 'numbers', 2, `${a} × ${b} = ?`, p, [p + a, p - a, p + 1, p + b], `${a} × ${b} = ${p}.`);
  const divisor = rr(2, 9), quot = rr(3, 9), dvd = divisor * quot;
  push('arithmetic', 'numbers', 3, `${dvd} : ${divisor} = ?`, quot, [quot + 1, quot - 1, quot + 2, quot + 10], `${dvd} : ${divisor} = ${quot} vì ${divisor} × ${quot} = ${dvd}.`);
}
for (let i = 0; i < 24; i++) { // word problems - VN contexts
  const [obj, short] = pick(ITEMS), n = rr(2, 8), per = rr(3, 9), total = n * per;
  const place = pick(CONTAINERS[short]);
  push('word-problem', 'numbers', 3, `${pick(NAMES)} xếp ${total} ${obj} vào ${n} ${place} đều nhau. Hỏi mỗi ${place} có bao nhiêu ${obj}?`, per, [per + 1, per - 1, n, total - n], `${total} : ${n} = ${per}.`);
  const a1 = rr(15, 60), a2 = rr(8, 45), nm3 = pick(NAMES);
  push('word-problem', 'numbers', 3, `Bạn ${nm3} có ${a1} ${obj}. Mẹ cho ${nm3} thêm ${a2} ${obj} nữa. Hỏi ${nm3} có tất cả bao nhiêu ${obj}?`, a1 + a2, [a1 + a2 + 1, a1 + a2 - 1, a1 - a2, a1 + a2 + 10], `${a1} + ${a2} = ${a1 + a2}.`);
  const c = rr(50, 200), sold = rr(10, c - 10);
  push('word-problem', 'numbers', 3, `Cửa hàng có ${c} ${obj}. Đã bán ${sold} ${obj}. Hỏi cửa hàng còn lại bao nhiêu ${obj}?`, c - sold, [c - sold + 1, c - sold - 1, sold - c + 200, c - sold + 10], `${c} - ${sold} = ${c - sold}.`);
}
for (let i = 0; i < 22; i++) { // comparison, ordering, place value
  const a = rr(100, 999), b = rr(100, 999);
  if (a !== b) push('number-sense', 'numbers', 1, `Số nào LỚN HƠN: ${a} hay ${b}?`, Math.max(a, b), [Math.min(a, b), Math.max(a, b) + 1, Math.max(a, b) - 10], `So sánh ${a} và ${b}: ${Math.max(a, b)} lớn hơn.`);
  const n3 = rr(100, 999);
  const hund = Math.floor(n3 / 100), ten = Math.floor((n3 % 100) / 10), one = n3 % 10;
  const pos = pick([['trăm', hund], ['chục', ten], ['đơn vị', one]]);
  push('number-sense', 'numbers', 2, `Chữ số hàng ${pos[0]} của số ${n3} là chữ số nào?`, pos[1], [(pos[1] + 1) % 10, (pos[1] + 9) % 10, (pos[1] + 2) % 10], `Số ${n3} có hàng trăm là ${hund}, hàng chục là ${ten}, hàng đơn vị là ${one}.`);
  const k = rr(2, 9), start = rr(3, 40), terms = [start, start + k, start + 2 * k, start + 3 * k];
  push('patterns', 'numbers', 3, `Điền số thích hợp vào chỗ trống: ${terms.slice(0, 3).join(', ')}, ___`, terms[3], [terms[3] + 1, terms[3] - 1, terms[3] + k, terms[2] + 1], `Dãy tăng đều thêm ${k} mỗi số: ${terms[2]} + ${k} = ${terms[3]}.`);
  push('number-sense', 'numbers', 1, `Số liền sau của số ${n3} là số nào?`, n3 + 1, [n3 - 1, n3 + 10, n3 + 2], `Số liền sau của ${n3} là ${n3 + 1}.`);
}
for (let i = 0; i < 20; i++) { // measurement + geometry
  const m = rr(2, 9);
  push('measurement', 'measurement', 2, `${m} m = ? cm`, m * 100, [m * 10, m * 1000, m + 100], `1 m = 100 cm nên ${m} m = ${m * 100} cm.`);
  const kg = rr(2, 8);
  push('measurement', 'measurement', 2, `${kg} kg = ? g`, kg * 1000, [kg * 100, kg * 10, kg + 1000], `1 kg = 1000 g nên ${kg} kg = ${kg * 1000} g.`);
  const w = rr(2, 8), l = w + rr(1, 6), per = 2 * (w + l);
  push('geometry', 'measurement', 3, `Hình chữ nhật có chiều dài ${l} cm, chiều rộng ${w} cm. Chu vi hình chữ nhật là bao nhiêu cm?`, per, [w + l, per / 2 + w, per + 10, w * l], `Chu vi = (dài + rộng) × 2 = (${l} + ${w}) × 2 = ${per} cm.`);
  const s = rr(2, 9), ps = 4 * s;
  push('geometry', 'measurement', 2, `Hình vuông có cạnh ${s} cm. Chu vi hình vuông là bao nhiêu cm?`, ps, [s * s, 2 * s, ps + 4, ps - 4], `Chu vi hình vuông = cạnh × 4 = ${s} × 4 = ${ps} cm.`);
  const geo = pick([
    ['Hình tam giác có mấy cạnh?', '3', ['2', '4', '5'], 'Hình tam giác có 3 cạnh và 3 đỉnh.'],
    ['Hình vuông có mấy góc?', '4', ['3', '5', '2'], 'Hình vuông có 4 góc vuông.'],
    ['Hình chữ nhật có mấy đỉnh?', '4', ['2', '3', '5'], 'Hình chữ nhật có 4 đỉnh.'],
    ['Hình tròn có mấy cạnh?', '0', ['1', '2', '4'], 'Hình tròn không có cạnh - chỉ có đường cong.'],
    ['Số đo góc vuông là bao nhiêu độ?', '90', ['45', '60', '180'], 'Góc vuông luôn bằng 90 độ.'],
  ]);
  push('geometry', 'geometry', 1, geo[0], geo[1], geo[2], geo[3]);
}
for (let i = 0; i < 8; i++) { // fractions + time + money
  const den = pick([2, 3, 4, 5, 6]);
  push('fractions', 'numbers', 2, `Chia một cái bánh thành ${den} phần bằng nhau rồi lấy 1 phần. Phần lấy là mấy phần của cái bánh?`, `1/${den}`,
    [[2, 3, 4].filter((x) => x !== den).map((x) => `1/${x}`), [`${den}/1`, `2/${den}`]].flat().slice(0, 3),
    `Chia ${den} phần bằng nhau, lấy 1 phần được 1/${den} cái bánh.`);
  const h = rr(1, 11), half = pick([['', 60], ['rưỡi', 30]]);
  if (half[0]) push('time', 'measurement', 2, `Lúc ${h} giờ rưỡi, kim phút chỉ vào số mấy?`, 6, [3, 12, h], `${h} giờ rưỡi: kim phút chỉ số 6 (30 phút).`);
  const vnd = pick([2000, 5000, 10000, 20000]), cnt = rr(2, 4);
  push('money', 'numbers', 2, `${pick(NAMES)} có ${cnt} tờ ${num(vnd)} đồng. Hỏi bạn có tất cả bao nhiêu đồng?`, num(vnd * cnt) + ' đồng',
    [num(vnd * cnt + vnd) + ' đồng', num(vnd * cnt - vnd) + ' đồng', num(vnd + cnt) + ' đồng'],
    `${cnt} × ${num(vnd)} = ${num(vnd * cnt)} đồng.`);
  push('time', 'measurement', 2, `1 giờ = ? phút`, 60, [30, 100, 12], `1 giờ luôn bằng 60 phút.`);
}
} // end GRADE === 3

if (GRADE === 4) { // G4: số đến 99999/lớp nghìn, nhân chia nhiều chữ số, TBC, phân số, tạ/tấn, góc, diện tích HCN
  for (let i = 0; i < 22; i++) {
    const a = rr(1200, 98900), b = rr(450, 88000), s = a + b;
    push('arithmetic', 'numbers', 2, `Tính: ${num(a)} + ${num(b)} = ?`, num(s), [num(s + 10), num(s - 10), num(s + 1000)], `${num(a)} + ${num(b)} = ${num(s)}.`);
    const c = rr(5000, 99999), d = rr(400, c - 500), t = c - d;
    push('arithmetic', 'numbers', 2, `Tính: ${num(c)} - ${num(d)} = ?`, num(t), [num(t + 10), num(t - 10), num(t + 1000)], `${num(c)} - ${num(d)} = ${num(t)}.`);
    const m1 = rr(120, 999), m2 = rr(2, 9), p = m1 * m2;
    push('arithmetic', 'numbers', 3, `Tính: ${num(m1)} × ${m2} = ?`, num(p), [num(p + m2), num(p - m2), num(p + m1)], `${num(m1)} × ${m2} = ${num(p)}.`);
    const dv = rr(2, 9), q2 = rr(120, 999), dvd = dv * q2;
    push('arithmetic', 'numbers', 3, `Tính: ${num(dvd)} : ${dv} = ?`, num(q2), [num(q2 + 1), num(q2 - 1), num(q2 + 10)], `${num(dvd)} : ${dv} = ${num(q2)} vì ${dv} × ${num(q2)} = ${num(dvd)}.`);
  }
  for (let i = 0; i < 18; i++) {
    const nums = [rr(10, 90), rr(10, 90), rr(10, 90)], avg = nums.reduce((x, y) => x + y, 0);
    if (avg % 3 === 0) push('arithmetic', 'numbers', 3, `Trung bình cộng của ${nums.join(', ')} là bao nhiêu?`, avg / 3, [avg / 3 + 1, avg / 3 - 1, avg / 3 + 3], `(${nums.join(' + ')}) : 3 = ${avg / 3}.`);
    const n5 = rr(10000, 99999);
    const d10 = Math.floor(n5 / 10);
    push('number-sense', 'numbers', 2, `${num(n5)} : 10 = ?`, num(d10), [num(d10 + 1), num(d10 - 1), num(n5 * 10)], `Chia cho 10: bỏ bớt 1 chữ số 0 tận cùng. ${num(n5)} : 10 = ${num(d10)}.`);
    const base = pick([10, 20, 30, 40, 50]), n2 = rr(3, 9), n3 = rr(3, 9);
    push('fractions', 'numbers', 3, `Phân số ${n2}/${n2 * 3} rút gọn bằng phân số nào?`, '1/3', [`${n2}/3`, `3/${n2}`, '2/3'], `Chia cả tử và mẫu cho ${n2}: ${n2}/${n2 * 3} = 1/3.`);
    const tan = rr(2, 9);
    push('measurement', 'measurement', 2, `${tan} tấn = ? kg`, num(tan * 1000), [num(tan * 100), num(tan * 10000), num(tan + 1000)], `1 tấn = 1000 kg nên ${tan} tấn = ${num(tan * 1000)} kg.`);
    const cen = rr(2, 20);
    push('time', 'measurement', 2, `${cen} thế kỉ = ? năm`, cen * 100, [cen * 10, cen * 1000, cen + 100], `1 thế kỉ = 100 năm nên ${cen} thế kỉ = ${cen * 100} năm.`);
  }
  for (let i = 0; i < 16; i++) {
    const w = rr(3, 15), l = w + rr(2, 20);
    push('geometry', 'measurement', 3, `Hình chữ nhật có chiều dài ${l} m, chiều rộng ${w} m. Diện tích là bao nhiêu m²?`, w * l, [2 * (w + l), w * l + l, w * l - w, w + l], `Diện tích HCN = dài × rộng = ${l} × ${w} = ${w * l} m².`);
    const [obj] = pick(ITEMS), x = rr(120, 900), price = rr(2, 9);
    push('word-problem', 'numbers', 3, `Mỗi ${obj} giá ${num(price * 1000)} đồng. Mua ${price} ${obj} hết bao nhiêu đồng?`, num(price * price * 1000) + ' đồng', [num(price * 1000 + price) + ' đồng', num(price * price * 100) + ' đồng', num(price * 1000) + ' đồng'], `${price} × ${num(price * 1000)} = ${num(price * price * 1000)} đồng.`);
    const geo = pick([
      ['Góc bé hơn góc vuông gọi là góc gì?', 'góc nhọn', ['góc tù', 'góc bẹt', 'góc vuông'], 'Góc nhọn < 90 độ.'],
      ['Góc lớn hơn góc vuông nhưng bé hơn góc bẹt gọi là gì?', 'góc tù', ['góc nhọn', 'góc vuông', 'góc bẹt'], '90 độ < góc tù < 180 độ.'],
      ['Góc bẹt bằng bao nhiêu độ?', '180', ['90', '360', '45'], 'Góc bẹt = 180 độ.'],
      ['Hai đường thẳng không bao giờ cắt nhau gọi là gì?', 'song song', ['vuông góc', 'trùng nhau', 'góc'], 'Đường thẳng song song không cắt nhau.'],
    ]);
    push('geometry', 'geometry', 2, geo[0], geo[1], geo[2], geo[3]);
  }
}

if (GRADE === 5) { // G5: số thập phân, %, tỉ số, diện tích tam giác/thang, thể tích, v-t-s
  for (let i = 0; i < 20; i++) {
    const a = rr(10, 990) / 10, b = rr(5, 480) / 10;
    const s = Math.round((a + b) * 10) / 10;
    push('arithmetic', 'numbers', 3, `Tính: ${num(a)} + ${num(b)} = ?`, num(s), [num(Math.round((s + 0.1) * 10) / 10), num(Math.round((s - 0.1) * 10) / 10), num(s + 1)], `${num(a)} + ${num(b)} = ${num(s)}.`);
    const dec = rr(1, 99) / 10;
    push('arithmetic', 'numbers', 2, `${num(dec)} × 10 = ?`, num(dec * 10), [num(dec * 100), num(dec / 10), num(dec + 10)], `Nhân số thập phân với 10: dời dấu phẩy sang phải 1 chữ số. ${num(dec)} × 10 = ${num(dec * 10)}.`);
    const pct = pick([10, 20, 25, 50]), base = pick([40, 60, 80, 120, 200, 300]);
    push('percent', 'numbers', 3, `${pct}% của ${base} là bao nhiêu?`, pct * base / 100, [pct * base / 100 + pct, pct * base / 100 - pct, base - pct], `${pct}% của ${base} = ${base} × ${pct} : 100 = ${pct * base / 100}.`);
  }
  for (let i = 0; i < 18; i++) {
    const h = rr(2, 12), a2 = rr(4, 20) * 2;
    const area = (a2 * h) / 2;
    push('geometry', 'measurement', 3, `Hình tam giác có đáy ${a2} cm, chiều cao ${h} cm. Diện tích là bao nhiêu cm²?`, area, [a2 * h, a2 + h, area + a2], `Diện tích tam giác = đáy × cao : 2 = ${a2} × ${h} : 2 = ${area} cm².`);
    const l = rr(2, 8), w = rr(2, 8), hh = rr(2, 6);
    push('geometry', 'measurement', 3, `Hình hộp chữ nhật dài ${l} dm, rộng ${w} dm, cao ${hh} dm. Thể tích là bao nhiêu dm³?`, l * w * hh, [l * w, l + w + hh, l * w * hh + l], `Thể tích = dài × rộng × cao = ${l} × ${w} × ${hh} = ${l * w * hh} dm³.`);
    const v = pick([30, 40, 45, 50, 60]), t2 = rr(2, 4);
    push('word-problem', 'numbers', 3, `Một ô tô đi với vận tốc ${v} km/giờ trong ${t2} giờ. Quãng đường đi được là bao nhiêu km?`, v * t2, [v + t2, v * t2 + v, v / t2], `Quãng đường = vận tốc × thời gian = ${v} × ${t2} = ${v * t2} km.`);
    const ha = rr(2, 20);
    push('measurement', 'measurement', 2, `${ha} ha = ? m²`, num(ha * 10000), [num(ha * 1000), num(ha * 100), num(ha * 100000)], `1 ha = 10.000 m² nên ${ha} ha = ${num(ha * 10000)} m².`);
  }
  for (let i = 0; i < 12; i++) {
    const den = pick([2, 4, 5, 10, 20, 25, 50]), numr = rr(1, den - 1);
    const dec = numr / den;
    push('fractions', 'numbers', 3, `Phân số ${numr}/${den} viết thành số thập phân là?`, num(dec), [num(dec + 1), num(dec / 10), `${numr},${den}`], `${numr}/${den} = ${numr} : ${den} = ${num(dec)}.`);
    const [obj] = pick(ITEMS), total2 = rr(4, 9) * 20, ratio = pick([2, 3, 4]);
    const part = total2 / (ratio + 1);
    if (Number.isInteger(part)) push('word-problem', 'numbers', 3, `Hai thùng chứa tất cả ${total2} ${obj}, thùng lớn gấp ${ratio} lần thùng bé. Hỏi thùng bé chứa bao nhiêu ${obj}?`, part, [part + 1, part - 1, total2 - part], `Thùng bé = ${total2} : (${ratio} + 1) = ${part}.`);
    const frac = pick([[1, 2, '50'], [1, 4, '25'], [3, 4, '75'], [1, 5, '20'], [2, 5, '40']]);
    push('fractions', 'numbers', 2, `${frac[0]}/${frac[1]} = ? %`, frac[2], ['10', '60', `${frac[0]}${frac[1]}`], `${frac[0]}/${frac[1]} = ${frac[2]}%.`);
  }
}

// ---------- CR-140: higher-order + diverse frames ----------
// The bank was ~45% bare "Tính: a op b" drill - kids see the same skeleton
// with shuffled numbers. These families test REASONING (which operation,
// find-the-error, multi-step, inverse, estimation) and widen surface
// contexts (money, time, age, measure, patterns). Each family stays small
// on purpose: diversity beats volume per shape.
{
  const n2 = GRADE <= 2 ? 50 : 500;
  const mult = GRADE <= 2 ? [2, 3, 4, 5] : [3, 4, 6, 7, 8, 9];

  // F1 find-the-error: student judges a shown computation.
  for (let i = 0; i < 6; i++) {
    const a = pick(mult), b = pick(mult), p = a * b;
    const shownRight = i % 5 === 4;
    const shown = shownRight ? p : p + pick([1, -1, a, 2]);
    const name = pick(NAMES);
    push('reasoning', 'arithmetic', 3,
      `Bạn ${name} tính: ${a} × ${b} = ${shown}. Bạn ấy tính đúng hay sai?`,
      shownRight ? 'Đúng' : `Sai - đáp án đúng là ${p}`,
      [`Đúng`, `Sai - đáp án đúng là ${p + 1}`, `Sai - đáp án đúng là ${p + a}`, `Sai - đáp án đúng là ${p - 1}`].filter((c) => c !== (shownRight ? 'Đúng' : `Sai - đáp án đúng là ${p}`)),
      `${a} × ${b} = ${p}, nên ${shownRight ? 'bạn ấy tính đúng' : `kết quả ${shown} là sai`}.`);
  }

  // F2 which-expression: pick the operation, don't compute.
  for (let i = 0; i < 6; i++) {
    const [full, short] = pick(ITEMS);
    const k = rr(2, 6), m = pick(mult);
    const name = pick(NAMES);
    push('reasoning', 'word-problem', 3,
      `${name} xếp ${k} túi, mỗi túi có ${m} ${full}. Phép tính nào tính được tổng số ${short}?`,
      `${k} × ${m}`, [`${k} + ${m}`, `${k} - ${m}`, `${k} : ${m}`],
      `${k} túi, mỗi túi ${m} - tổng là phép nhân ${k} × ${m}.`);
    const t = k * m;
    push('reasoning', 'word-problem', 3,
      `Có ${t} ${full} xếp đều vào ${k} hộp. Phép tính nào tính số ${short} ở mỗi hộp?`,
      `${t} : ${k}`, [`${t} × ${k}`, `${t} - ${k}`, `${t} + ${k}`],
      `Chia đều ${t} cho ${k} hộp - phép chia ${t} : ${k}.`);
  }

  // F3 two-step word problems.
  for (let i = 0; i < 6; i++) {
    const [full, short] = pick(ITEMS);
    const k = rr(2, 5), m = pick(mult), a = rr(1, k * m - 2);
    push('word-problem', 'arithmetic', 3,
      `Mẹ mua ${k} túi, mỗi túi có ${m} ${full}. Cả nhà dùng hết ${a} ${full}. Hỏi còn lại bao nhiêu ${short}?`,
      k * m - a, [k * m + a, k * m - a + 1, k * m],
      `Tổng ${k} × ${m} = ${k * m} ${full}; còn lại ${k * m} - ${a} = ${k * m - a}.`);
    const have = rr(3, 30);
    push('word-problem', 'arithmetic', 3,
      `Em có ${have} ${full}, mua thêm ${k} túi mỗi túi ${m} ${full}. Hỏi em có tất cả bao nhiêu ${short}?`,
      have + k * m, [have + k + m, (have + k) * m, k * m - have],
      `Thêm ${k} × ${m} = ${k * m} ${full}; tất cả ${have} + ${k * m} = ${have + k * m}.`);
  }

  // F4 compare two expressions: >, <, = .
  for (let i = 0; i < 6; i++) {
    const a = pick(mult), b = pick(mult), c = pick(mult), d = pick(mult);
    const l = a * b, r = c * d;
    const ans = l === r ? '=' : l > r ? '>' : '<';
    push('reasoning', 'arithmetic', 2,
      `Điền dấu thích hợp: ${a} × ${b} ... ${c} × ${d}`,
      ans, [ans === '>' ? '<' : '>', ans === '<' ? '>' : '<', ans === '=' ? '<' : '='],
      `${a} × ${b} = ${l}, ${c} × ${d} = ${r} - nên ${l} ${ans} ${r}.`);
  }

  // F5 estimation (G3+): round a sum/difference to the nearest ten.
  if (GRADE >= 3) {
    for (let i = 0; i < 5; i++) {
      const a = rr(21, 99), b = rr(11, 99), s = a + b;
      const t = Math.round(s / 10) * 10;
      push('reasoning', 'numbers', 2,
        `Tổng ${a} + ${b} gần bằng số tròn chục nào nhất?`,
        t, [s, t + 10, t - 10],
        `${a} + ${b} = ${s}, ${s} gần nhất với ${t}.`);
    }
  }

  // F6 divisibility / odd-one-out.
  for (let i = 0; i < 5; i++) {
    const k = pick([2, 5, 10]);
    const yes = k * rr(2, 12);
    const nos = new Set();
    while (nos.size < 3) { const c = rr(11, n2); if (c % k !== 0) nos.add(c); }
    push('reasoning', 'numbers', 2,
      `Số nào sau đây chia hết cho ${k}?`,
      yes, [...nos],
      `${yes} : ${k} = ${yes / k} - chia hết.`);
  }

  // F7 inverse relationship.
  for (let i = 0; i < 5; i++) {
    const k = pick(mult), m = pick(mult), t = k * m;
    const [full, short] = pick(ITEMS);
    const nA = pick(NAMES); let nB = pick(NAMES); while (nB === nA) nB = pick(NAMES);
    push('word-problem', 'arithmetic', 3,
      `${nA} có ${t} ${full}, gấp ${k} lần số ${short} của ${nB}. Hỏi ${nB} có bao nhiêu ${short}?`,
      m, [t - k, k, t + k],
      `Gấp ${k} lần nghĩa là ${t} = ${k} × số của bạn - số của bạn là ${t} : ${k} = ${m}.`);
  }

  // F8 elapsed time.
  for (let i = 0; i < 5; i++) {
    const h = rr(6, 20), mins = pick([15, 30, 45]);
    push('time', 'measurement', 2,
      `Em bắt đầu học lúc ${h} giờ, học trong ${mins} phút. Hỏi mấy giờ em xong?`,
      `${h} giờ ${mins} phút`, [`${h} giờ`, `${h + 1} giờ`, `${mins} giờ`],
      `${h} giờ + ${mins} phút = ${h} giờ ${mins} phút.`);
  }

  // F9 money change.
  for (let i = 0; i < 5; i++) {
    const price = rr(2, 45) * 1000, paid = price + pick([1000, 2000, 5000, 10000]);
    const [full, short] = pick(ITEMS);
    push('word-problem', 'measurement', 2,
      `Em mua 1 ${full} giá ${num(price)} đồng, đưa cô bán ${num(paid)} đồng. Hỏi cô trả lại bao nhiêu đồng?`,
      num(paid - price), [num(price), num(paid), num(paid - price + 1000)],
      `Trả lại ${num(paid)} - ${num(price)} = ${num(paid - price)} đồng.`);
  }

  // F10 unit conversion.
  for (let i = 0; i < 5; i++) {
    const kind = pick(['dm-cm', 'm-dm', 'gio-phut', 'kg-g']);
    if (kind === 'dm-cm') { const n = rr(2, 20); push('measurement', 'measurement', 1, `${n} dm = bao nhiêu cm?`, n * 10, [n + 10, n * 100, n], `1 dm = 10 cm nên ${n} dm = ${n * 10} cm.`); }
    else if (kind === 'm-dm') { const n = rr(2, 20); push('measurement', 'measurement', 1, `${n} m = bao nhiêu dm?`, n * 10, [n + 10, n * 100, n], `1 m = 10 dm nên ${n} m = ${n * 10} dm.`); }
    else if (kind === 'kg-g') { if (GRADE >= 3) { const n = rr(2, 9); push('measurement', 'measurement', 2, `${n} kg = bao nhiêu gam?`, num(n * 1000), [num(n * 100), num(n * 10), n], `1 kg = 1000 g nên ${n} kg = ${num(n * 1000)} g.`); } else { const n = rr(2, 9); push('measurement', 'measurement', 1, `${n} dm = bao nhiêu cm?`, n * 10, [n + 10, n * 100, n], `1 dm = 10 cm nên ${n} dm = ${n * 10} cm.`); } }
    else { const n = rr(1, 3); push('time', 'measurement', 2, `${n} giờ = bao nhiêu phút?`, n * 60, [n * 10, n * 100, 60 + n], `1 giờ = 60 phút nên ${n} giờ = ${n * 60} phút.`); }
  }

  // F11 fraction of a number (G3+).
  if (GRADE >= 3) {
    for (let i = 0; i < 5; i++) {
      const den = pick([2, 3, 4, 5]);
      const q = rr(2, 15), n = den * q;
      push('fractions', 'fractions', 2,
        `1/${den} của ${n} là bao nhiêu?`,
        q, [n - den, den, n / 2 === q ? q + 1 : Math.floor(n / 2)],
        `1/${den} của ${n} = ${n} : ${den} = ${q}.`);
    }
  }

  // F12 place-value reasoning.
  for (let i = 0; i < 5; i++) {
    if (GRADE <= 2) {
      const c = rr(1, 9), u = rr(0, 9);
      push('numbers', 'numbers', 1,
        `Số gồm ${c} chục và ${u} đơn vị là số nào?`,
        c * 10 + u, [c + u, u * 10 + c, c * 10],
        `${c} chục = ${c * 10}, cộng ${u} đơn vị được ${c * 10 + u}.`);
    } else {
      const h = rr(1, 9), c = rr(0, 9), u = rr(0, 9);
      push('numbers', 'numbers', 1,
        `Số gồm ${h} trăm, ${c} chục và ${u} đơn vị là số nào?`,
        h * 100 + c * 10 + u, [h * 100 + u * 10 + c, h + c + u, h * 100 + c * 10],
        `${h} trăm = ${h * 100}, ${c} chục = ${c * 10}, ${u} đơn vị - tổng ${h * 100 + c * 10 + u}.`);
    }
  }

  // F13 age relationships.
  for (let i = 0; i < 5; i++) {
    const a = rr(7, 15), k = rr(1, a - 5);
    const n1m = pick(NAMES); let n2m = pick(NAMES); while (n2m === n1m) n2m = pick(NAMES);
    push('word-problem', 'numbers', 2,
      `${n1m} năm nay ${a} tuổi, ${n2m} kém ${n1m} ${k} tuổi. Hỏi ${n2m} bao nhiêu tuổi?`,
      a - k, [a + k, k, a],
      `${n2m} kém ${k} tuổi nên ${a} - ${k} = ${a - k} tuổi.`);
  }
}

// ---------- CR-136: visual-puzzle questions (ST Math-style) ----------
// Prompt asks which of 4 labeled models shows an expression; the asset
// (built by publish-mathvi-assets.mjs) renders the 4 candidate models.
// Correct slot is derived from the prompt hash so both sides agree.
function pushPuzzle(difficulty, a, op, b) {
  const opTxt = { '+': 'cộng', '-': 'trừ', '×': 'nhân', ':': 'chia' }[op];
  const prompt = `Hình nào thể hiện phép tính ${a} ${op} ${b}?`;
  if (seen.has(prompt)) return;
  seen.add(prompt);
  const cells = puzzleCells(prompt);
  const slot = puzzleSlot(prompt);
  // word-to-image-mcq: each option is a real image choice. The publisher
  // renders one full-size SVG per candidate under the same asset ids.
  const choices = cells.map((cell, i) => ({
    assetId: puzzleAssetId(cell, 'ABCD'[i]),
    label: puzzleOptionLabel(prompt, i),
  }));
  items.push({
    id: `g${GRADE}-mathvi-tpl-${createHash('sha1').update(prompt).digest('hex').slice(0, 12)}`,
    grade: GRADE, subject: 'math-vi', domain: 'visual-puzzle', skill: 'model-recognition',
    question_type: 'word-to-image-mcq', difficulty,
    prompt_text: prompt,
    choices, answer: { text: choices[slot].label, index: slot },
    explanation_vi: `Hình ${'ABCD'[slot]} vẽ đúng sơ đồ của phép ${opTxt} ${a} ${op} ${b}.`,
    canonical: true, tags: ['vi', 'visual-puzzle'],
    rights_status: 'owned-original-generated',
    curriculum_alignment: { grade: GRADE, coreTopic: 'model-recognition', moetSubject: 'Mathematics', alignmentLevel: 'topic-skill', curriculumRole: 'core', primaryFramework: 'MOET-2018' },
    source: { kind: 'generated-v6', method: 'cr136-visual-puzzle', provenance: 'Deterministic Vietnamese template generation; original, not copied.' },
    review_status: 'approved',
    publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: false, requiresHumanApprovalForCommercialRelease: false },
    content_hash: createHash('sha1').update(`${GRADE}|mathvi|${prompt}`).digest('hex').slice(0, 12),
  });
}
// grade-scaled operand ranges; ~16 puzzles per grade
{
  const lo = GRADE <= 2 ? 4 : 12, hi = GRADE <= 2 ? 18 : GRADE === 3 ? 60 : 120;
  for (let i = 0; i < 8; i++) {
    const a = rr(lo, hi), b = rr(2, Math.min(a - 1, hi));
    pushPuzzle(GRADE <= 2 ? 2 : 3, a, '+', b);
    pushPuzzle(GRADE <= 2 ? 2 : 3, a, '-', b);
  }
}

// ---------- CR-137: misconception feedback on arithmetic distractors ----------
// Auto-derive "tại sao sai" for every 'Tính:' item from the distractor's
// relationship to the operands - covers all grades without per-site edits.
for (const r of items) {
  const m = /^Tính: (\d+) ([+\-×:]) (\d+) = \?$/.exec(r.prompt_text);
  if (!m) continue;
  const [, x, op, y] = m; const a = +x, b = +y;
  const fb = {};
  for (const c of r.choices) {
    const v = +c;
    if (Number.isNaN(v) || c === r.answer.text) continue;
    if (op === '+' && v === a - b) fb[c] = 'Bạn đã trừ nhầm thay vì cộng.';
    else if (op === '+' && v === a + b + 10) fb[c] = 'Bạn cộng nhầm thêm 1 chục.';
    else if (op === '+' && v === b - a) fb[c] = 'Bạn đã trừ nhầm thay vì cộng.';
    else if (op === '-' && v === a + b) fb[c] = 'Bạn đã cộng nhầm thay vì trừ.';
    else if (op === '-' && v === b - a) fb[c] = 'Bạn trừ ngược - phải lấy số lớn trừ số bé.';
    else if (op === '×' && v === a + b) fb[c] = 'Bạn đã cộng nhầm thay vì nhân.';
    else if (op === '×' && (v === a * (b + 1) || v === a * (b - 1))) fb[c] = 'Bạn nhân sai 1 lần - kiểm tra lại bảng nhân.';
    else if (op === ':' && v === b) fb[c] = 'Bạn lấy nhầm số chia làm kết quả.';
    else if (op === ':' && v === a - b) fb[c] = 'Bạn đã trừ nhầm thay vì chia.';
    else if (v === +r.answer.text + 1 || v === +r.answer.text - 1) fb[c] = 'Bạn tính sai 1 đơn vị - thử đếm lại.';
    else if (v === +r.answer.text + 10 || v === +r.answer.text - 10) fb[c] = 'Bạn sai 1 chục - kiểm tra hàng chục.';
  }
  if (Object.keys(fb).length) r.answer.distractor_feedback = fb;
}

// ---------- semantic guard ----------
// Fail generation on non-idiomatic Vietnamese - a wrong-collocation
// question teaches kids the wrong language. Extend as new bad patterns
// are found in review.
const BARE_NOUNS = 'cam|kẹo|vở|bi|bút|sách|hoa|nhãn vở|táo|xoài|ổi|mận|gà';
const SEMANTIC_RULES = [
  // 'hái' only collocates with the exact harvest forms ("hái được 5 quả
  // vở" must not pass just because it starts with 'quả').
  [new RegExp(`hái được \\d+ (?!${HARVEST_ITEMS.map(i => `${i[0]}(?=[,.?!]|$)`).join('|')})`), '"hái" chỉ đi với các mục trong HARVEST_ITEMS'],
  // Bare noun after a number = missing classifier ("5 vở" -> "5 quyển vở").
  [new RegExp(`\\d+ (${BARE_NOUNS})(?=[^a-zà-ỹ]|$)`), 'thiếu lượng từ trước danh từ đếm được'],
  [/mỗi chỗ/, '"mỗi chỗ" - phải dùng đúng tên chỗ chứa (mỗi túi/hộp/...)'],
  [/chỉ phút chỉ|Đồng hồ chỉ phút/, 'lỗi chính tả: "kim phút chỉ"'],
  [/giờ rưỡi là/, 'thiếu "tức là" trong câu giờ rưỡi'],
];
const bad = [];
for (const r of items) {
  for (const [rx, why] of SEMANTIC_RULES) {
    if (rx.test(r.prompt_text) || rx.test(r.explanation_vi ?? '')) bad.push(`${r.prompt_text}  <- ${why}`);
  }
  // distractors for "chữ số" questions must themselves be digits 0-9
  if (/là chữ số nào/.test(r.prompt_text) && r.choices.some(c => !/^\d$/.test(c))) bad.push(`${r.prompt_text}  <- distractor không phải chữ số`);
}
if (bad.length) { console.error(`SEMANTIC GUARD FAILED (${bad.length}):\n` + bad.slice(0, 30).join('\n')); process.exit(1); }

// ---------- upsert ----------
const rows = items;
console.log(`generated ${rows.length} math-vi items for grade ${GRADE}`);
if (DRY) { if (process.env.DUMP) rows.forEach(r => console.log(`${r.prompt_text}  |  đáp án: ${r.answer.text}  |  ${r.explanation_vi}`)); else console.log(rows.slice(0, 3)); process.exit(0); }
// merge-duplicates (not ignore): same deterministic id must pick up new
// fields like answer.distractor_feedback; quarantined rows have different
// ids so their rejected state is untouched.
const res = await fetch(`${SUPA}/rest/v1/qb_questions`, { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal,count=exact' }, body: JSON.stringify(rows) });
const body = await res.text();
if (!res.ok) throw new Error(`upsert failed ${res.status}: ${body.slice(0, 300)}`);
console.log('upsert status', res.status, res.statusText, body.slice(0, 300));
