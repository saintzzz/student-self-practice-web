#!/usr/bin/env node
/**
 * CR-67 follow-up - deterministic template generator for Math + Science
 * gap fill (all grades -> 5000/subject). Combinatorial frames x number
 * ranges x context tables -> unique validated items, zero API cost.
 *
 *   node scripts/gen-template-math-sci.mjs --subject math --grade 3 [--dry]
 *   node scripts/gen-template-math-sci.mjs --subject science --grade 5
 *
 * Seeded per (subject,grade) so reruns produce the same items (idempotent
 * upsert via content-hash ids - no duplicates on repeat runs).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const arg = (n, d) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; };
const SUBJECT = arg('--subject', 'math');
const GRADE = Number(arg('--grade', 0));
const DRY = ARGS.includes('--dry');
const TARGET = Number(arg('--target', 0));
if (!GRADE || !['math', 'science'].includes(SUBJECT)) {
  console.error('need --subject math|science --grade 1..5');
  process.exit(1);
}

const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url, SVC = keys.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', 'Accept-Profile': 'practice', 'Content-Profile': 'practice', Prefer: 'resolution=ignore-duplicates,return=minimal' };

// ---------- seeded PRNG (mulberry32) - deterministic per subject+grade ----------
const seedNum = Number(createHash('sha1').update(`${SUBJECT}:${GRADE}:tpl-v1`).digest('hex').slice(0, 8), 16);
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
const pickN = (arr, n, exclude) => {
  const pool = shuffle(arr.filter((x) => x !== exclude));
  const out = [];
  for (const c of pool) { if (out.length >= n) break; if (!out.includes(c)) out.push(c); }
  return out;
};

const items = [];
const seen = new Set();
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
function push(it) {
  const qKey = norm(it.q ?? it.statement ?? it.text ?? '');
  // duplicate = same prompt + same choice SET (order-insensitive) or same bool
  const cKey = it.c ? JSON.stringify([...it.c].map(norm).sort()) : JSON.stringify(it.bool ?? it.answer ?? '');
  const key = qKey + '|' + cKey;
  if (seen.has(key)) return;
  seen.add(key);
  items.push(it);
}
const mcq = (q, correct, wrongs, o) => {
  const bad = [];
  for (const w of wrongs) if (w !== correct && String(w) !== String(correct) && !bad.includes(w)) bad.push(w);
  if (bad.length < 3) return;
  const c = shuffle([correct, ...bad.slice(0, 3)]);
  push({ q, c, a: c.indexOf(correct), ...o });
};
const tf = (passage, statement, bool, o) => push({ tf: true, passage, statement, bool, ...o });

// =====================================================================
// MATH
// =====================================================================
const NAMES = ['Nam', 'Lan', 'Mai', 'Huy', 'An', 'Linh', 'Minh', 'Hoa', 'Duc', 'Trang', 'Binh', 'Chi', 'Tuan', 'Nga', 'Khoa', 'Van'];
const THINGS = [
  ['stickers', 'nhãn dán'], ['marbles', 'bi ve'], ['pencils', 'bút chì'], ['candies', 'kẹo'],
  ['books', 'quyển sách'], ['flowers', 'bông hoa'], ['oranges', 'quả cam'], ['crayons', 'bút màu'],
  ['toy cars', 'xe đồ chơi'], ['cookies', 'bánh quy'], ['balloons', 'bóng bay'], ['cards', 'thẻ bài'],
];

function mathGrade(g) {
  // ranges per grade (MOET-ish ceilings)
  const R = {
    1: { add: 20, mul: 0, div: 0, big: 100 },
    2: { add: 100, mul: 5, div: 5, big: 1000 },
    3: { add: 1000, mul: 9, div: 9, big: 10000 },
    4: { add: 10000, mul: 99, div: 99, big: 100000 },
    5: { add: 100000, mul: 999, div: 999, big: 1000000 },
  }[g];

  const exAdd = (a, b, s) => `${a} + ${b} = ${s}. Em cộng hàng đơn vị trước rồi đến hàng chục/hàng trăm.`;
  const exSub = (a, b, s) => `${a} - ${b} = ${s}. Lấy ${a} bớt đi ${b} còn ${s}.`;
  const exMul = (a, b, p) => `${a} × ${b} = ${p}. Đây là ${a} nhóm, mỗi nhóm ${b}.`;
  const exDiv = (a, b, q) => `${a} : ${b} = ${q} vì ${q} × ${b} = ${a}.`;

  // 1. direct arithmetic mcq - biggest unique pool
  const addPairs = Math.min(1200, R.add * R.add);
  for (let i = 0; i < addPairs; i++) {
    const a = rr(2, Math.floor(R.add * 0.9)), b = rr(2, R.add - 1);
    const s = a + b;
    mcq(`${a} + ${b} = ?`, String(s), [String(s + 1), String(s - 1), String(s + 10), String(s + 2)], {
      d: g <= 2 ? 1 : 2, ex: exAdd(a, b, s), lo: `Cộng trong phạm vi ${R.add}.`, top: 'addition', skill: 'arithmetic',
    });
  }
  const subPairs = Math.min(1200, R.add);
  for (let i = 0; i < subPairs; i++) {
    const a = rr(4, R.add), b = rr(1, a - 1);
    const s = a - b;
    mcq(`${a} - ${b} = ?`, String(s), [String(s + 1), String(s - 1), String(s + 10), String(Math.max(0, s - 2))], {
      d: g <= 2 ? 1 : 2, ex: exSub(a, b, s), lo: `Trừ trong phạm vi ${R.add}.`, top: 'subtraction', skill: 'arithmetic',
    });
  }
  if (R.mul) {
    for (let i = 0; i < 900; i++) {
      const a = rr(2, R.mul), b = rr(2, R.mul);
      const p = a * b;
      mcq(`${a} × ${b} = ?`, String(p), [String(p + a), String(p - a), String(p + 1), String(p + b)], {
        d: 2, ex: exMul(a, b, p), lo: `Bảng nhân đến ${R.mul}.`, top: 'multiplication', skill: 'arithmetic',
      });
      const qq = a;
      mcq(`${p} : ${b} = ?`, String(qq), [String(qq + 1), String(qq - 1), String(qq + 2), String(qq * 2)], {
        d: 2, ex: exDiv(p, b, qq), lo: `Bảng chia đến ${R.div}.`, top: 'division', skill: 'arithmetic',
      });
    }
  }

  // 2. missing addend / factor
  for (let i = 0; i < 500; i++) {
    const a = rr(2, Math.floor(R.add / 2)), s = a + rr(1, R.add - a);
    const b = s - a;
    mcq(`${a} + ___ = ${s}. The missing number is:`, String(b), [String(b + 1), String(b - 1), String(b + 10)], {
      d: 2, ex: `Số còn thiếu = ${s} - ${a} = ${b}.`, lo: 'Tìm số hạng còn thiếu.', top: 'missing-number', skill: 'arithmetic',
    });
  }

  // 3. compare numbers
  for (let i = 0; i < 600; i++) {
    const a = rr(2, R.big - 1); let b = rr(2, R.big - 1);
    if (a === b) b += 1;
    mcq(`Compare: ${a} ___ ${b}`, a > b ? '>' : '<', [a > b ? '<' : '>', '='], {
      d: 1, ex: `${a} ${a > b ? 'lớn hơn' : 'nhỏ hơn'} ${b} nên dùng dấu "${a > b ? '>' : '<'}".`, lo: 'So sánh hai số.', top: 'comparison', skill: 'number-sense',
    });
    mcq(`Which number is ${a > b ? 'bigger' : 'smaller'}: ${a} or ${b}?`, String(a > b ? a : b), [String(a > b ? b : a), String(a + b), String(Math.abs(a - b))], {
      d: 1, ex: `${a > b ? a : b} là số ${a > b ? 'lớn hơn' : 'nhỏ hơn'}.`, lo: 'So sánh hai số.', top: 'comparison', skill: 'number-sense',
    });
  }

  // 4. sequences
  const STEPS = g <= 1 ? [1, 2] : g === 2 ? [2, 5, 10] : g === 3 ? [3, 4, 5, 10, 100] : [5, 10, 25, 100, 1000];
  for (const st of STEPS) {
    for (let i = 0; i < 80; i++) {
      const a0 = rr(1, Math.floor(R.big / (st * 6)));
      const seq = [a0, a0 + st, a0 + 2 * st, a0 + 3 * st];
      const pos = rr(1, 3);
      const shown = seq.map((v, j) => (j === pos ? '___' : String(v))).join(', ');
      const correct = seq[pos];
      mcq(`What number is missing? ${shown}, ...`, String(correct), [String(correct + st), String(correct - st), String(correct + 1)], {
        d: 2, ex: `Dãy tăng đều ${st} đơn vị: ...${seq.join(', ')}... nên ô trống là ${correct}.`, lo: `Dãy số cách đều ${st}.`, top: 'sequences', skill: 'number-sense',
      });
    }
  }

  // 5. place value (g2+)
  if (g >= 2) {
    const LVL = [['ones', 'hàng đơn vị'], ['tens', 'hàng chục'], ['hundreds', 'hàng trăm']];
    if (g >= 4) LVL.push(['thousands', 'hàng nghìn']);
    for (let i = 0; i < 300; i++) {
      const n = rr(100, Math.min(9999, R.big - 1));
      const [place, vn] = pick(LVL);
      const div = place === 'ones' ? 1 : place === 'tens' ? 10 : place === 'hundreds' ? 100 : 1000;
      const digit = Math.floor(n / div) % 10;
      mcq(`In the number ${n}, what is the digit in the ${place} place?`, String(digit), pickN(['0','1','2','3','4','5','6','7','8','9'].filter((x) => x !== String(digit)), 3), {
        d: 3, ex: `Số ${n} có chữ số ${vn} là ${digit}.`, lo: `Giá trị vị trí: ${vn}.`, top: 'place-value', skill: 'number-sense',
      });
    }
  }

  // 6. even/odd + rounding (g3+)
  if (g >= 3) {
    for (let i = 0; i < 150; i++) {
      const n = rr(10, R.big - 1);
      const even = n % 2 === 0;
      mcq(`Is ${n} even or odd?`, even ? 'Even' : 'Odd', [even ? 'Odd' : 'Even', 'Zero', 'Prime'], {
        d: 1, ex: `${n} ${even ? 'chia hết cho 2 nên là số chẵn' : 'không chia hết cho 2 nên là số lẻ'}.`, lo: 'Số chẵn/lẻ.', top: 'number-types', skill: 'number-sense',
      });
      const base = g >= 4 ? 100 : 10;
      const rounded = Math.round(n / base) * base;
      mcq(`Round ${n} to the nearest ${base === 10 ? 'ten' : 'hundred'}.`, String(rounded), [String(rounded + base), String(rounded - base), String(n)], {
        d: 3, ex: `${n} gần ${rounded} hơn nên làm tròn thành ${rounded}.`, lo: `Làm tròn đến hàng ${base === 10 ? 'chục' : 'trăm'}.`, top: 'rounding', skill: 'number-sense',
      });
    }
  }

  // 7. word problems - varied contexts
  for (let i = 0; i < 700; i++) {
    const n1 = pick(NAMES), n2 = pick(NAMES.filter((x) => x !== n1));
    const [thing, vn] = pick(THINGS);
    const a = rr(3, Math.floor(R.add * 0.6)), b = rr(2, Math.floor(R.add * 0.3));
    const kind = rnd(4);
    if (kind === 0) {
      mcq(`${n1} has ${a} ${thing}. ${n2} gives ${n1} ${b} more. How many ${thing} does ${n1} have now?`, String(a + b), [String(a - b), String(a + b + 1), String(a + b - 1)], {
        d: 2, ex: `Có ${a} ${vn}, được cho thêm ${b} nên cộng: ${a} + ${b} = ${a + b}.`, lo: 'Bài toán có lời văn: cộng.', top: 'word-problems', skill: 'word-problem',
      });
    } else if (kind === 1 && a > b) {
      mcq(`${n1} had ${a} ${thing}. ${n1} gave away ${b}. How many ${thing} are left?`, String(a - b), [String(a + b), String(a - b + 1), String(b)], {
        d: 2, ex: `Có ${a} ${vn}, cho đi ${b} nên trừ: ${a} - ${b} = ${a - b}.`, lo: 'Bài toán có lời văn: trừ.', top: 'word-problems', skill: 'word-problem',
      });
    } else if (kind === 2 && R.mul) {
      const g2 = rr(2, Math.min(6, R.mul)), per = rr(2, Math.min(9, R.mul));
      mcq(`${n1} puts ${per} ${thing} into each of ${g2} bags. How many ${thing} are there in all?`, String(g2 * per), [String(g2 + per), String(g2 * per + per), String(g2 * per - 1)], {
        d: 3, ex: `${g2} túi, mỗi túi ${per} ${vn}: ${g2} × ${per} = ${g2 * per}.`, lo: 'Bài toán có lời văn: nhân.', top: 'word-problems', skill: 'word-problem',
      });
    } else if (kind === 3 && R.div) {
      const per = rr(2, Math.min(9, R.div)), total = per * rr(2, 9);
      mcq(`${n1} shares ${total} ${thing} equally among ${per} friends. How many ${thing} does each friend get?`, String(total / per), [String(total / per + 1), String(per), String(total - per)], {
        d: 3, ex: `Chia đều ${total} ${vn} cho ${per} bạn: ${total} : ${per} = ${total / per}.`, lo: 'Bài toán có lời văn: chia.', top: 'word-problems', skill: 'word-problem',
      });
    }
  }

  // 7b. number words + before/after + counting (g1-3 focus)
  const NUMWORDS = ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
  const nMax = g <= 1 ? 20 : g === 2 ? 100 : 999;
  for (let i = 0; i < 400; i++) {
    const n = rr(1, Math.min(nMax, 20));
    const w = NUMWORDS[n - 1];
    mcq(`Which number is "${w}"?`, String(n), pickN([String(n + 1), String(n - 1), String(n + 10), String(n + 2), String(Math.max(1, n - 2))].filter((x) => x !== String(n)), 3), {
      d: 1, ex: `"${w}" là số ${n}.`, lo: 'Đọc/viết số bằng chữ.', top: 'number-words', skill: 'number-sense',
    });
    const n2 = rr(1, nMax - 2);
    mcq(`What number comes after ${n2}?`, String(n2 + 1), [String(n2 - 1), String(n2 + 2), String(n2 + 10)], {
      d: 1, ex: `Số liền sau ${n2} là ${n2 + 1}.`, lo: 'Số liền sau.', top: 'number-order', skill: 'number-sense',
    });
    if (n2 > 1) {
      mcq(`What number comes before ${n2}?`, String(n2 - 1), [String(n2 + 1), String(n2 - 2), String(n2)], {
        d: 1, ex: `Số liền trước ${n2} là ${n2 - 1}.`, lo: 'Số liền trước.', top: 'number-order', skill: 'number-sense',
      });
    }
    // number bonds (make 10 / make 20)
    if (n <= (g <= 1 ? 10 : 20)) {
      const bond = g <= 1 ? 10 : 20;
      if (n < bond) {
        mcq(`${n} + ___ = ${bond}. Fill in the blank.`, String(bond - n), [String(bond - n + 1), String(bond - n - 1), String(n)], {
          d: 1, ex: `${bond} - ${n} = ${bond - n} nên số cần điền là ${bond - n}.`, lo: `Bù số đến ${bond}.`, top: 'number-bonds', skill: 'arithmetic',
        });
      }
    }
  }
  // counting with emoji
  const EMOJI = ['🍎', '🐟', '⭐', '🌸', '🐤', '🎈', '🍊', '🐢'];
  for (let i = 0; i < 200; i++) {
    const e = pick(EMOJI);
    const n = rr(3, g <= 1 ? 10 : 20);
    const pic = e.repeat(n);
    mcq(`Count: ${pic}. How many?`, String(n), pickN([String(n - 1), String(n + 1), String(n + 2), String(n - 2)].filter((x) => Number(x) > 0 && x !== String(n)), 3), {
      d: 1, ex: `Đếm từng ${e}: có ${n} cái.`, lo: 'Đếm đồ vật.', top: 'counting', skill: 'number-sense',
    });
  }
  // systematic small-number enumeration (g1-2): all unique combos
  if (g <= 2) {
    const cap = g === 1 ? 20 : 100;
    for (let a = 1; a <= cap; a++) for (let b = 1; b <= cap - a; b++) {
      const s = a + b;
      mcq(`${a} + ${b} = ___`, String(s), [String(s + 1), String(s - 1), String(s + 10)], {
        d: 1, ex: `${a} + ${b} = ${s}.`, lo: `Cộng trong phạm vi ${cap}.`, top: 'addition', skill: 'arithmetic',
      });
      mcq(`${s} - ${b} = ___`, String(a), [String(a + 1), String(Math.max(0, a - 1)), String(a + 10)], {
        d: 1, ex: `${s} - ${b} = ${a}.`, lo: `Trừ trong phạm vi ${cap}.`, top: 'subtraction', skill: 'arithmetic',
      });
      if (b <= a && g === 1) {
        mcq(`${a} - ${b} = ___`, String(a - b), [String(a - b + 1), String(Math.max(0, a - b - 1)), String(a - b + 10)], {
          d: 1, ex: `${a} - ${b} = ${a - b}.`, lo: 'Trừ trong phạm vi 20.', top: 'subtraction', skill: 'arithmetic',
        });
      }
    }
    // mixed two-emoji counting: how many in all
    for (let i = 0; i < 500; i++) {
      const e1 = pick(EMOJI), e2 = pick(EMOJI.filter((x) => x !== e1));
      const a = rr(2, g === 1 ? 9 : 15), b = rr(2, g === 1 ? 9 : 15);
      mcq(`${e1.repeat(a)} and ${e2.repeat(b)}. How many items in all?`, String(a + b), pickN([String(a + b - 1), String(a + b + 1), String(a + b + 2), String(Math.abs(a - b))].filter((x) => x !== String(a + b)), 3), {
        d: 1, ex: `${a} cái ${e1} + ${b} cái ${e2} = ${a + b}.`, lo: 'Đếm và cộng hai nhóm.', top: 'counting', skill: 'arithmetic',
      });
      mcq(`${e1.repeat(a)} and ${e2.repeat(b)}. Which is more, ${e1} or ${e2}?`, a > b ? e1 : e2, [a > b ? e2 : e1, 'They are equal'], {
        d: 1, ex: `${a} ${a > b ? '>' : '<'} ${b} nên ${a > b ? e1 : e2} nhiều hơn.`, lo: 'So sánh số lượng.', top: 'counting', skill: 'number-sense',
      });
    }
    // tens and ones
    for (let n = 11; n <= (g === 1 ? 19 : 99); n++) {
      const t = Math.floor(n / 10), o = n % 10;
      mcq(`${n} = ___ ten(s) and ${o} one(s).`, String(t), [String(t + 1), String(o), String(n)], {
        d: 1, ex: `${n} = ${t} chục và ${o} đơn vị.`, lo: 'Cấu tạo số: chục và đơn vị.', top: 'place-value', skill: 'number-sense',
      });
      mcq(`${n} = ${t} ten(s) and ___ one(s).`, String(o), [String(o + 1), String(t), String(n)], {
        d: 1, ex: `${n} = ${t} chục và ${o} đơn vị.`, lo: 'Cấu tạo số: chục và đơn vị.', top: 'place-value', skill: 'number-sense',
      });
    }
    // pick biggest/smallest of 3
    for (let i = 0; i < 300; i++) {
      const a2 = rr(1, cap), b2 = rr(1, cap), c3 = rr(1, cap);
      if (new Set([a2, b2, c3]).size < 3) continue;
      const big = Math.max(a2, b2, c3), small = Math.min(a2, b2, c3);
      mcq(`Which is the BIGGEST number: ${a2}, ${b2}, ${c3}?`, String(big), pickN([String(small), String([a2, b2, c3].find((x) => x !== big && x !== small)), String(big + 1)].filter((x) => x && x !== String(big)), 3), {
        d: 1, ex: `${big} là số lớn nhất trong ${a2}, ${b2}, ${c3}.`, lo: 'Tìm số lớn nhất.', top: 'comparison', skill: 'number-sense',
      });
      mcq(`Which is the SMALLEST number: ${a2}, ${b2}, ${c3}?`, String(small), pickN([String(big), String([a2, b2, c3].find((x) => x !== big && x !== small)), String(Math.max(0, small - 1))].filter((x) => x !== undefined && x !== String(small)), 3), {
        d: 1, ex: `${small} là số nhỏ nhất trong ${a2}, ${b2}, ${c3}.`, lo: 'Tìm số nhỏ nhất.', top: 'comparison', skill: 'number-sense',
      });
    }
    // which group has more/fewer (emoji compare)
    for (let i = 0; i < 400; i++) {
      const e1 = pick(EMOJI), e2 = pick(EMOJI.filter((x) => x !== e1));
      const n1 = rr(3, 15); let n2 = rr(3, 15); if (n1 === n2) n2 = n2 > 10 ? n2 - 2 : n2 + 2;
      const more = n1 > n2;
      mcq(`Group A: ${e1.repeat(n1)}  Group B: ${e2.repeat(n2)}. Which group has ${more ? 'more' : 'fewer'} items?`, 'Group A', ['Group B', 'They are equal'], {
        d: 1, ex: `Nhóm A có ${n1}, nhóm B có ${n2}. ${n1} ${more ? '>' : '<'} ${n2} nên nhóm A ${more ? 'nhiều hơn' : 'ít hơn'}.`, lo: 'So sánh số lượng hai nhóm.', top: 'counting', skill: 'number-sense',
      });
    }
  }

  // emoji arithmetic (g1-2): visual add/sub
  for (let i = 0; i < 500; i++) {
    const e = pick(EMOJI);
    const a = rr(1, g <= 1 ? 9 : 15), b = rr(1, g <= 1 ? 9 : 15);
    mcq(`${e.repeat(a)} + ${e.repeat(b)} = how many?`, String(a + b), pickN([String(a + b - 1), String(a + b + 1), String(a + b + 2), String(a - b > 0 ? a - b : a + b + 3)].filter((x) => x !== String(a + b)), 3), {
      d: 1, ex: `${a} cái + ${b} cái = ${a + b} cái ${e}.`, lo: 'Cộng bằng hình ảnh.', top: 'counting', skill: 'arithmetic',
    });
    const c2 = rr(1, a);
    mcq(`${e.repeat(a)} take away ${c2} = how many left?`, String(a - c2), pickN([String(a - c2 + 1), String(a - c2 - 1), String(a), String(c2)].filter((x) => Number(x) >= 0 && x !== String(a - c2)), 3), {
      d: 1, ex: `${a} cái bớt ${c2} cái còn ${a - c2} cái ${e}.`, lo: 'Trừ bằng hình ảnh.', top: 'counting', skill: 'arithmetic',
    });
  }
  // equality frames (g2+): 3 + 4 = ___ + 2
  for (let i = 0; i < 400; i++) {
    const a = rr(2, Math.floor(R.add / 3)), b = rr(2, Math.floor(R.add / 3));
    const s = a + b;
    const c2 = rr(1, s - 1);
    const miss = s - c2;
    mcq(`${a} + ${b} = ___ + ${c2}. The missing number is:`, String(miss), [String(miss + 1), String(miss - 1), String(s)], {
      d: 3, ex: `${a} + ${b} = ${s}. Vậy ${s} - ${c2} = ${miss}.`, lo: 'Phép tính cân bằng.', top: 'balance', skill: 'arithmetic',
    });
  }
  // ordinals (g1-2)
  if (g <= 2) {
    const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    for (const [i2, w] of ORD.entries()) {
      const n = pick(NAMES);
      mcq(`${n} finished the race in position ${i2 + 1}. ${n} came in ___.`, w, pickN(ORD, 3, w), {
        d: 1, ex: `Vị trí số ${i2 + 1} đọc là "${w}".`, lo: `Số thứ tự: ${w}.`, top: 'ordinals', skill: 'number-sense',
      });
    }
  }
  // how many more / fewer (comparison word problems)
  for (let i = 0; i < 300; i++) {
    const n1 = pick(NAMES), n2 = pick(NAMES.filter((x) => x !== n1));
    const [thing, vn] = pick(THINGS);
    const a = rr(5, Math.min(50, R.add - 1)), b = rr(1, a - 1);
    mcq(`${n1} has ${a} ${thing}. ${n2} has ${b} ${thing}. How many more ${thing} does ${n1} have than ${n2}?`, String(a - b), [String(a + b), String(a - b + 1), String(b)], {
      d: 2, ex: `${a} - ${b} = ${a - b}. ${n1} có nhiều hơn ${a - b} ${vn}.`, lo: 'So sánh hơn/kém trong bài toán.', top: 'word-problems', skill: 'word-problem',
    });
  }

  // 8. true/false arithmetic
  for (let i = 0; i < 400; i++) {
    const a = rr(2, Math.floor(R.add * 0.7)), b = rr(2, R.add - a);
    const good = rng() < 0.5;
    const shown = good ? a + b : a + b + pick([-2, -1, 1, 2, 10]);
    tf(`Check this calculation.`, `${a} + ${b} = ${shown}`, good, {
      d: 1, ex: `${a} + ${b} = ${a + b} nên khẳng định "${a} + ${b} = ${shown}" là ${good ? 'đúng' : 'sai'}.`, lo: 'Kiểm tra phép cộng.', top: 'addition', skill: 'arithmetic',
    });
  }

  // 9. grade-5 extras: decimals, percent, LCM/GCF
  if (g >= 4) {
    for (let i = 0; i < 300; i++) {
      const a = rr(11, 99) / 10, b = rr(11, 99) / 10;
      const s = Math.round((a + b) * 10) / 10;
      mcq(`${a} + ${b} = ?`, String(s), [String(Math.round((s + 0.1) * 10) / 10), String(Math.round((s - 0.1) * 10) / 10), String(Math.round(s * 10) / 10 + 1)], {
        d: 4, ex: `${a} + ${b} = ${s}. Cộng số thập phân: thẳng hàng dấu phẩy.`, lo: 'Cộng số thập phân.', top: 'decimals', skill: 'arithmetic',
      });
    }
    for (let i = 0; i < 200; i++) {
      const pct = pick([10, 20, 25, 50]);
      const base = rr(2, 40) * (100 / pct >= 2 ? 1 : 1);
      const val = Math.round(base * pct / 100);
      mcq(`What is ${pct}% of ${base}?`, String(val), [String(val + 1), String(Math.round(base * pct / 50)), String(val * 2)].filter((x) => x !== String(val)), {
        d: 4, ex: `${pct}% của ${base} = ${base} × ${pct}/100 = ${val}.`, lo: 'Tính phần trăm.', top: 'percent', skill: 'arithmetic',
      });
    }
  }
  if (g === 5) {
    for (let i = 0; i < 200; i++) {
      const a = rr(2, 12) * pick([2, 3]), b = rr(2, 12) * pick([2, 3]);
      const gcd = (x, y) => (y ? gcd(y, x % y) : x);
      const gc = gcd(a, b), lc = (a * b) / gc;
      mcq(`What is the LCM of ${a} and ${b}?`, String(lc), [String(lc + a), String(gc), String(a * b)], {
        d: 4, ex: `BCNN(${a}, ${b}) = ${lc}. UCLN là ${gc}, BCNN = ${a}×${b}:${gc}.`, lo: 'Bội chung nhỏ nhất.', top: 'lcm-gcf', skill: 'number-sense',
      });
      mcq(`What is the GCF of ${a} and ${b}?`, String(gc), [String(lc), String(gc + 1), String(Math.max(1, gc - 1))], {
        d: 4, ex: `UCLN(${a}, ${b}) = ${gc} - số lớn nhất chia hết cả hai.`, lo: 'Ước chung lớn nhất.', top: 'lcm-gcf', skill: 'number-sense',
      });
    }
  }

  // 10. shapes & measurement (all grades)
  const SHAPES = [
    ['circle', 'hình tròn', 0], ['triangle', 'hình tam giác', 3], ['square', 'hình vuông', 4],
    ['rectangle', 'hình chữ nhật', 4], ['pentagon', 'hình ngũ giác', 5], ['hexagon', 'hình lục giác', 6],
  ];
  for (const [sh, vn, sides] of SHAPES) {
    mcq(`How many sides does a ${sh} have?`, String(sides), pickN(['3', '4', '5', '6', '0', '1'], 3, String(sides)), {
      d: g <= 2 ? 1 : 2, ex: `${vn} có ${sides} cạnh.`, lo: `Hình học: ${sh}.`, top: 'geometry', skill: 'geometry',
    });
    if (sides > 0) {
      mcq(`A shape with ${sides} equal sides could be a ___.`, sh, pickN(SHAPES.filter((s) => s[2] !== sides).map((s) => s[0]), 3), {
        d: 2, ex: `${vn} có ${sides} cạnh.`, lo: `Nhận diện hình theo số cạnh.`, top: 'geometry', skill: 'geometry',
      });
    }
  }
  for (let i = 0; i < 120; i++) {
    const l = rr(2, 9), w = rr(2, 9);
    if (l === w) continue;
    mcq(`A rectangle is ${l} cm long and ${w} cm wide. What is its perimeter?`, String(2 * (l + w)), [String(l * w), String(l + w), String(2 * (l + w) + 2)], {
      d: 3, ex: `Chu vi = (dài + rộng) × 2 = (${l} + ${w}) × 2 = ${2 * (l + w)} cm.`, lo: 'Chu vi hình chữ nhật.', top: 'measurement', skill: 'geometry',
    });
    if (g >= 3) {
      mcq(`A rectangle is ${l} cm long and ${w} cm wide. What is its area?`, String(l * w), [String(2 * (l + w)), String(l * w + 1), String(l + w)], {
        d: 3, ex: `Diện tích = dài × rộng = ${l} × ${w} = ${l * w} cm².`, lo: 'Diện tích hình chữ nhật.', top: 'measurement', skill: 'geometry',
      });
    }
  }

  // 11. time + money
  for (let i = 0; i < 120; i++) {
    const h = rr(1, 12), m = pick(['00', '15', '30', '45']);
    const mins = h * 60 + Number(m);
    mcq(`School starts at ${h}:${m}. ${pick(NAMES)} arrives 30 minutes late. What time is it?`, (() => {
      const t = mins + 30; return `${Math.floor(t / 60) > 12 ? Math.floor(t / 60) - 12 : Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    })(), ['10:00', `${h}:${m}`, `${h + 1}:00`].filter((v, idx, arr) => arr.indexOf(v) === idx).slice(0, 3), {
      d: 3, ex: `${h}:${m} + 30 phút = ${Math.floor((mins + 30) / 60)}:${String((mins + 30) % 60).padStart(2, '0')} (${(mins + 30) / 60 > 12 ? 'trừ 12 cho đồng hồ 12h' : 'giờ trong ngày'}).`, lo: 'Tính giờ cộng thêm phút.', top: 'time', skill: 'measurement',
    });
  }
  const PRICE = [5, 10, 15, 20, 25, 50];
  for (let i = 0; i < 100; i++) {
    const [thing, vn] = pick(THINGS);
    const p1 = pick(PRICE), p2 = pick(PRICE.filter((x) => x !== p1));
    mcq(`One ${thing.slice(0, -1)} costs ${p1} thousand dong. ${pick(NAMES)} buys ${p2 / 5 > 0 ? rr(2, 4) : 2} of them and pays with 100 thousand. How much change?`, (() => {
      const n = rr(2, 4); return String(100 - p1 * n);
    })(), ['50', String(100 - p1), String(p1 * 2)], {
      d: 4, ex: `Tiền ${vn}: tính tổng rồi lấy 100 trừ.`, lo: 'Bài toán tiền tệ.', top: 'money', skill: 'word-problem',
    });
  }
}

// =====================================================================
// SCIENCE
// =====================================================================
function scienceGrade(g) {
  // concept tables: [english, vietnamese, extra]
  const LIVING = ['a dog', 'a cat', 'a tree', 'a bird', 'a fish', 'a butterfly', 'a flower', 'a frog', 'a worm', 'grass'];
  const NONLIVING = ['a rock', 'a pencil', 'a chair', 'a toy car', 'a bottle', 'a cloud of smoke', 'a door', 'a cup', 'a desk', 'a shoe'];
  const SENSES = [['eyes', 'see', 'nhìn'], ['ears', 'hear', 'nghe'], ['nose', 'smell', 'ngửi'], ['tongue', 'taste', 'nếm'], ['skin', 'touch/feel', 'sờ/cảm nhận']];
  const ANIMALS = [
    ['dog', 'mammal', 'fur', 'puppies', 'chó'], ['cat', 'mammal', 'fur', 'kittens', 'mèo'],
    ['cow', 'mammal', 'fur', 'calves', 'bò'], ['elephant', 'mammal', 'thick skin', 'a calf', 'voi'],
    ['whale', 'mammal', 'smooth skin', 'a calf', 'cá voi'], ['bat', 'mammal', 'fur', 'pups', 'dơi'],
    ['horse', 'mammal', 'fur', 'a foal', 'ngựa'], ['rabbit', 'mammal', 'fur', 'kits', 'thỏ'],
    ['tiger', 'mammal', 'fur', 'cubs', 'hổ'], ['monkey', 'mammal', 'fur', 'babies', 'khỉ'],
    ['goat', 'mammal', 'fur', 'kids', 'dê'], ['pig', 'mammal', 'bristly skin', 'piglets', 'lợn'],
    ['dolphin', 'mammal', 'smooth skin', 'a calf', 'cá heo'], ['bear', 'mammal', 'fur', 'cubs', 'gấu'],
    ['chicken', 'bird', 'feathers', 'chicks from eggs', 'gà'], ['duck', 'bird', 'feathers', 'ducklings from eggs', 'vịt'],
    ['penguin', 'bird', 'feathers', 'chicks from eggs', 'chim cánh cụt'], ['eagle', 'bird', 'feathers', 'chicks from eggs', 'đại bàng'],
    ['owl', 'bird', 'feathers', 'chicks from eggs', 'cú'], ['ostrich', 'bird', 'feathers', 'chicks from eggs', 'đà điểu'],
    ['sparrow', 'bird', 'feathers', 'chicks from eggs', 'chim sẻ'], ['parrot', 'bird', 'feathers', 'chicks from eggs', 'vẹt'],
    ['fish', 'fish', 'scales', 'babies from eggs', 'cá'], ['shark', 'fish', 'scales', 'babies from eggs', 'cá mập'],
    ['goldfish', 'fish', 'scales', 'babies from eggs', 'cá vàng'], ['salmon', 'fish', 'scales', 'babies from eggs', 'cá hồi'],
    ['snake', 'reptile', 'scales', 'babies from eggs', 'rắn'], ['lizard', 'reptile', 'scales', 'babies from eggs', 'thằn lằn'],
    ['turtle', 'reptile', 'a shell', 'babies from eggs', 'rùa'], ['crocodile', 'reptile', 'scales', 'babies from eggs', 'cá sấu'],
    ['gecko', 'reptile', 'scales', 'babies from eggs', 'tắc kè'],
    ['frog', 'amphibian', 'wet skin', 'tadpoles from eggs', 'ếch'], ['toad', 'amphibian', 'bumpy skin', 'tadpoles from eggs', 'cóc'],
    ['butterfly', 'insect', 'wings', 'caterpillars from eggs', 'bướm'], ['bee', 'insect', 'wings', 'larvae from eggs', 'ong'],
    ['ant', 'insect', 'six legs', 'larvae from eggs', 'kiến'], ['spider', 'arachnid', 'eight legs', 'babies from eggs', 'nhện'],
    ['mosquito', 'insect', 'wings', 'larvae from eggs', 'muỗi'], ['beetle', 'insect', 'hard wing cases', 'larvae from eggs', 'bọ cánh cứng'],
    ['snail', 'mollusc', 'a soft body and a shell', 'babies from eggs', 'ốc sên'],
    ['octopus', 'mollusc', 'eight arms and no bones', 'babies from eggs', 'bạch tuộc'],
    ['earthworm', 'worm', 'a soft moist body', 'babies from cocoons', 'giun đất'],
    ['jellyfish', 'cnidarian', 'a soft jelly body', 'babies from eggs', 'sứa'],
    ['crab', 'crustacean', 'a hard shell and claws', 'babies from eggs', 'cua'],
    ['shrimp', 'crustacean', 'a hard shell', 'babies from eggs', 'tôm'],
  ];
  const HABITATS = [
    ['fish', 'water', 'nước'], ['duck', 'ponds', 'ao'], ['eagle', 'the sky/nests on cliffs', 'bầu trời'],
    ['bear', 'forests', 'rừng'], ['camel', 'deserts', 'sa mạc'], ['penguin', 'cold polar regions', 'vùng lạnh'],
    ['monkey', 'trees', 'cây'], ['earthworm', 'soil', 'đất'], ['bee', 'hives', 'tổ ong'], ['whale', 'the ocean', 'đại dương'],
    ['frog', 'near water', 'gần nước'], ['snake', 'grasslands and forests', 'đồng cỏ/rừng'],
    ['dolphin', 'the ocean', 'đại dương'], ['octopus', 'the ocean', 'đại dương'], ['crab', 'the seashore', 'bờ biển'],
    ['tiger', 'forests', 'rừng'], ['rabbit', 'fields and burrows', 'đồng/hang'], ['cow', 'farms', 'nông trại'],
    ['goat', 'farms and hills', 'nông trại/đồi'], ['ant', 'nests in the ground', 'tổ dưới đất'],
    ['owl', 'trees at night', 'cây ban đêm'], ['bat', 'caves and trees', 'hang/cây'],
    ['shark', 'the ocean', 'đại dương'], ['goldfish', 'fish tanks and ponds', 'bể cá/ao'],
    ['sparrow', 'trees near houses', 'cây gần nhà'], ['snail', 'damp places', 'nơi ẩm'],
    ['lizard', 'rocks and walls', 'đá/tường'], ['bee', 'hives', 'tổ ong'],
  ];
  const MOVES = [
    ['fish', 'swims', 'bơi'], ['duck', 'swims and walks', 'bơi và đi'], ['eagle', 'flies', 'bay'],
    ['frog', 'jumps and swims', 'nhảy và bơi'], ['snake', 'slithers', 'trườn'], ['rabbit', 'hops', 'nhảy lò cò'],
    ['horse', 'runs', 'chạy'], ['snail', 'crawls slowly', 'bò chậm'], ['ant', 'walks and climbs', 'bò/leo'],
    ['bee', 'flies', 'bay'], ['butterfly', 'flies', 'bay'], ['whale', 'swims', 'bơi'],
    ['monkey', 'climbs and swings', 'trèo/đu'], ['crab', 'walks sideways', 'đi ngang'],
    ['sparrow', 'flies', 'bay'], ['turtle', 'walks slowly and swims', 'bò chậm/bơi'],
    ['earthworm', 'wriggles through soil', 'luồn trong đất'], ['jellyfish', 'drifts in water', 'trôi trong nước'],
    ['penguin', 'waddles and swims', 'đi lạch bạch/bơi'], ['cheetah', 'runs very fast', 'chạy rất nhanh'],
  ];
  const DIET = [
    ['cow', 'herbivore', 'grass', 'bò ăn cỏ'], ['goat', 'herbivore', 'grass and leaves', 'dê ăn cỏ/lá'],
    ['rabbit', 'herbivore', 'carrots and grass', 'thỏ ăn cỏ/cà rốt'], ['elephant', 'herbivore', 'plants and fruit', 'voi ăn cây/trái'],
    ['horse', 'herbivore', 'grass', 'ngựa ăn cỏ'], ['giraffe', 'herbivore', 'leaves from tall trees', 'hươu ăn lá'],
    ['tiger', 'carnivore', 'meat', 'hổ ăn thịt'], ['eagle', 'carnivore', 'small animals', 'đại bàng ăn thịt'],
    ['shark', 'carnivore', 'fish', 'cá mập ăn cá'], ['frog', 'carnivore', 'insects', 'ếch ăn côn trùng'],
    ['spider', 'carnivore', 'insects', 'nhện ăn côn trùng'], ['owl', 'carnivore', 'mice', 'cú ăn chuột'],
    ['chicken', 'omnivore', 'grains and insects', 'gà ăn thóc và sâu'], ['bear', 'omnivore', 'fish, berries and honey', 'gấu ăn nhiều thứ'],
    ['pig', 'omnivore', 'plants and scraps', 'lợn ăn tạp'], ['duck', 'omnivore', 'plants and small fish', 'vịt ăn tạp'],
    ['monkey', 'omnivore', 'fruit and insects', 'khỉ ăn tạp'], ['human', 'omnivore', 'plants and meat', 'người ăn tạp'],
  ];
  const NOCTURNAL = ['owl', 'bat', 'moth'];
  const FOODGROUPS = [
    ['rice', 'grains/carbs - gives energy', 'cơm - nhóm tinh bột'], ['bread', 'grains/carbs - gives energy', 'bánh mì - tinh bột'],
    ['noodles', 'grains/carbs - gives energy', 'mì - tinh bột'], ['potato', 'grains/carbs - gives energy', 'khoai tây - tinh bột'],
    ['chicken', 'protein - helps muscles grow', 'thịt gà - đạm'], ['fish', 'protein - helps muscles grow', 'cá - đạm'],
    ['eggs', 'protein - helps muscles grow', 'trứng - đạm'], ['milk', 'protein and calcium - strong bones', 'sữa - đạm/canxi'],
    ['beef', 'protein - helps muscles grow', 'thịt bò - đạm'], ['beans', 'protein - helps muscles grow', 'đậu - đạm'],
    ['carrot', 'vitamins - helps eyes', 'cà rốt - vitamin A'], ['orange', 'vitamins - vitamin C', 'cam - vitamin C'],
    ['spinach', 'vitamins and iron', 'rau bina - vitamin/sắt'], ['apple', 'vitamins and fiber', 'táo - vitamin/xơ'],
    ['banana', 'vitamins and energy', 'chuối - vitamin/năng lượng'], ['butter', 'fats - use a little', 'bơ - chất béo'],
    ['oil', 'fats - use a little', 'dầu - chất béo'], ['candy', 'sugar - use very little', 'kẹo - đường'],
  ];
  const TOOLS = [
    ['thermometer', 'measures temperature', 'nhiệt kế đo nhiệt độ'], ['ruler', 'measures length', 'thước đo độ dài'],
    ['scale', 'measures mass/weight', 'cân đo khối lượng'], ['clock', 'measures time', 'đồng hồ đo thời gian'],
    ['rain gauge', 'measures rainfall', 'vũ kế đo mưa'], ['telescope', 'helps us see far objects in the sky', 'kính thiên văn'],
    ['microscope', 'helps us see very tiny things', 'kính hiển vi'],
  ];
  const LIGHTSRC = [
    ['the Sun', true, 'mặt trời tự phát sáng'], ['a lamp', true, 'đèn phát sáng'], ['a candle', true, 'nến phát sáng'],
    ['a firefly', true, 'đom đóm phát sáng'], ['a torch', true, 'đèn pin phát sáng'],
    ['the Moon', false, 'trăng chỉ phản chiếu ánh sáng mặt trời'], ['a mirror', false, 'gương phản chiếu, không tự sáng'],
    ['a book', false, 'sách không phát sáng'], ['water', false, 'nước không phát sáng'],
  ];
  const WATERCYCLE = [
    ['The Sun heats water in rivers and seas', 'evaporation - water turns to vapor', 'bốc hơi'],
    ['Water vapor rises and cools high in the sky', 'condensation - vapor forms clouds', 'ngưng tụ'],
    ['Water drops fall from clouds', 'precipitation - rain or snow falls', 'mưa/tuyết'],
    ['Rain water flows back to rivers and seas', 'collection - water gathers again', 'tụ lại'],
  ];
  const SEEDDISP = [
    ['a coconut', 'water - it floats to new places', 'dừa trôi theo nước'],
    ['a dandelion', 'wind - light seeds fly away', 'bồ công anh bay theo gió'],
    ['a burdock burr', 'animals - it sticks to fur', 'ngưu bàng bám vào lông'],
    ['a berry', 'animals - eaten and dropped as seeds', 'quả mọng được ăn rồi thải hạt'],
  ];
  const HYGIENE = [
    ['washing hands before eating', 'removes germs', 'rửa tay diệt khuẩn'],
    ['brushing teeth twice a day', 'prevents cavities', 'đánh răng tránh sâu'],
    ['covering your mouth when coughing', 'stops germs spreading', 'che miệng khi ho'],
    ['wearing a helmet on a motorbike', 'protects your head', 'đội mũ bảo vệ đầu'],
    ['drinking clean boiled water', 'avoids stomach sickness', 'uống nước sạch'],
    ['wearing shoes outside', 'protects your feet', 'mang giày bảo vệ chân'],
  ];
  const EARTH = [
    ['day and night happen because', 'the Earth spins on its axis', 'ngày đêm do Trái Đất tự quay'],
    ['a year is the time for', 'the Earth to go once around the Sun', '1 năm = 1 vòng quanh Mặt Trời'],
    ['the Sun appears to rise in', 'the east', 'mặt trời mọc hướng đông'],
    ['the Sun appears to set in', 'the west', 'mặt trời lặn hướng tây'],
    ['shadows are longest', 'in the morning and afternoon', 'bóng dài nhất sáng chiều'],
    ['the Moon shines because', 'it reflects sunlight', 'trăng phản chiếu ánh sáng'],
  ];
  const ENERGY = [
    ['sunlight', 'renewable', 'năng lượng mặt trời tái tạo được'],
    ['wind', 'renewable', 'gió tái tạo được'],
    ['water in dams', 'renewable', 'thủy điện tái tạo được'],
    ['coal', 'non-renewable', 'than - nhiên liệu hóa thạch'],
    ['oil/petrol', 'non-renewable', 'dầu - nhiên liệu hóa thạch'],
    ['natural gas', 'non-renewable', 'khí đốt - hóa thạch'],
  ];
  const PLANTS_PARTS = [
    ['roots', 'take in water from the soil', 'rễ hút nước từ đất'], ['stem', 'carries water to the leaves', 'thân đưa nước lên lá'],
    ['leaves', 'make food for the plant using sunlight', 'lá quang hợp làm thức ăn'], ['flower', 'makes seeds', 'hoa tạo hạt'],
    ['seeds', 'grow into new plants', 'hạt nảy thành cây mới'],
  ];
  const MATERIALS = [
    ['wood', 'comes from trees; hard and can burn', 'gỗ'], ['plastic', 'light, waterproof, made in factories', 'nhựa'],
    ['metal', 'hard, shiny, conducts heat well', 'kim loại'], ['glass', 'hard, transparent, breaks easily', 'thủy tinh'],
    ['paper', 'thin, made from wood, burns easily', 'giấy'], ['rubber', 'soft, stretchy, waterproof', 'caosu'],
    ['cloth', 'soft, made from fibers, absorbs water', 'vải'], ['stone', 'very hard, comes from the ground', 'đá'],
  ];
  const WEATHER = [
    ['sunny', 'the sun shines', 'nắng'], ['rainy', 'water falls from clouds', 'mưa'], ['cloudy', 'many clouds in the sky', 'nhiều mây'],
    ['windy', 'air moves fast', 'có gió'], ['snowy', 'white snow falls', 'tuyết'], ['stormy', 'strong wind and rain', 'bão'],
    ['foggy', 'hard to see far', 'sương mù'],
  ];
  const SEASONS = [
    ['spring', 'warm; flowers bloom', 'mùa xuân'], ['summer', 'hot; students have holiday', 'mùa hè'],
    ['autumn', 'cool; leaves fall', 'mùa thu'], ['winter', 'cold; sometimes snows', 'mùa đông'],
  ];
  const BODY = [
    ['heart', 'pumps blood around the body', 'tim bơm máu'], ['lungs', 'help us breathe air', 'phổi giúp thở'],
    ['brain', 'helps us think and control the body', 'não điều khiển cơ thể'], ['stomach', 'breaks down food', 'dạ dày tiêu hóa'],
    ['muscles', 'help us move', 'cơ bắp giúp cử động'], ['bones', 'support the body', 'xương nâng đỡ cơ thể'],
    ['teeth', 'bite and chew food', 'răng nhai thức ăn'], ['skin', 'covers and protects the body', 'da bảo vệ cơ thể'],
  ];
  const MATTER = [
    ['ice', 'solid', 'nước đá - thể rắn'], ['water', 'liquid', 'nước - thể lỏng'], ['steam', 'gas', 'hơi nước - thể khí'],
    ['a rock', 'solid', 'đá - rắn'], ['milk', 'liquid', 'sữa - lỏng'], ['air', 'gas', 'không khí - khí'],
    ['juice', 'liquid', 'nước ép - lỏng'], ['a pencil', 'solid', 'bút chì - rắn'], ['oxygen', 'gas', 'oxi - khí'],
  ];
  const FORCES = [
    ['push', 'a door to open it', 'đẩy'], ['pull', 'a drawer to open it', 'kéo'],
    ['gravity', 'makes things fall down', 'trọng lực'], ['friction', 'slows moving things down', 'ma sát'],
    ['a magnet', 'attracts iron and steel', 'nam châm hút sắt'],
  ];
  const ECOSYSTEM = [
    ['grass', 'producer', 'cỏ - sinh vật sản xuất'], ['a rabbit', 'herbivore (eats plants)', 'thỏ - động vật ăn cỏ'],
    ['a tiger', 'carnivore (eats animals)', 'hổ - động vật ăn thịt'], ['a mushroom', 'decomposer', 'nấm - phân giải'],
    ['a tree', 'producer', 'cây - sinh vật sản xuất'], ['a chicken', 'omnivore', 'gà - động vật ăn tạp'],
    ['a cow', 'herbivore (eats plants)', 'bò - ăn cỏ'], ['a human', 'omnivore', 'con người - ăn tạp'],
    ['a worm', 'decomposer', 'giun - phân giải'], ['an eagle', 'carnivore (eats animals)', 'đại bàng - ăn thịt'],
  ];
  const ELECTRIC = [
    ['a metal wire', 'conductor', 'dây kim loại - dẫn điện'], ['a rubber glove', 'insulator', 'găng cao su - cách điện'],
    ['a copper coin', 'conductor', 'đồng xu - dẫn điện'], ['a wooden stick', 'insulator', 'que gỗ - cách điện'],
    ['a steel spoon', 'conductor', 'thìa inox - dẫn điện'], ['a plastic ruler', 'insulator', 'thước nhựa - cách điện'],
    ['a glass cup', 'insulator', 'cốc thủy tinh - cách điện'], ['an iron nail', 'conductor', 'đinh sắt - dẫn điện'],
  ];
  const ENV = [
    ['recycle', 'use things again to make new things', 'tái chế'], ['save water', 'turn off the tap when brushing teeth', 'tiết kiệm nước'],
    ['save energy', 'turn off lights when leaving a room', 'tiết kiệm điện'], ['plant trees', 'make the air cleaner', 'trồng cây'],
    ['not litter', 'keep rivers and seas clean', 'không xả rác'], ['reuse bags', 'use a bag many times', 'tái sử dụng túi'],
  ];
  const HEALTH = [
    ['exercise', 'makes muscles and heart strong', 'tập thể dục'], ['vegetables', 'give us vitamins', 'rau củ'],
    ['sleep', 'helps the body rest and grow', 'ngủ'], ['washing hands', 'keeps germs away', 'rửa tay'],
    ['too much candy', 'is bad for teeth', 'ăn nhiều kẹo hại răng'], ['water', 'keeps the body working', 'uống nước'],
  ];

  // 1. living / non-living (g1-2 focus, light for older)
  const lvN = g <= 2 ? 300 : 100;
  for (let i = 0; i < lvN; i++) {
    const isLiv = rng() < 0.5;
    const thing = isLiv ? pick(LIVING) : pick(NONLIVING);
    mcq(`Is ${thing} a living thing?`, isLiv ? 'Yes, it is living' : 'No, it is non-living',
      [isLiv ? 'No, it is non-living' : 'Yes, it is living', 'It is both', 'We cannot know'], {
      d: 1, ex: `${thing} ${isLiv ? 'là sinh vật sống vì nó lớn lên, cần ăn/thở' : 'là vật không sống - không lớn lên, không cần ăn'}.`, lo: 'Phân biệt sinh vật sống/không sống.', top: 'living-things', skill: 'classification',
    });
  }

  // 2. senses (g1-2)
  if (g <= 2) {
    for (const [organ, verb, vn] of SENSES) {
      for (const obj of ['a flower', 'a song', 'ice cream', 'a soft pillow', 'hot soup']) {
        const match = { see: 'a flower', hear: 'a song', taste: 'ice cream', 'touch/feel': 'a soft pillow', smell: 'hot soup' }[verb] === obj;
        mcq(`Which body part do we use to ${verb} ${obj}?`, organ, pickN(SENSES.map((s) => s[0]), 3, organ), {
          d: 1, ex: `Ta dùng ${organ} để ${verb} - ${vn}.`, lo: `Giác quan: ${organ} -> ${verb}.`, top: 'senses', skill: 'concept',
        });
      }
    }
  }

  // 3. animal classification - big pool
  const groups = [...new Set(ANIMALS.map((a) => a[1]))];
  for (const [name, grp, feat, babies, vn] of ANIMALS) {
    mcq(`A ${name} is a ___.`, `a ${grp}`, pickN(groups.map((x) => `a ${x}`), 3, `a ${grp}`), {
      d: 2, ex: `${name[0].toUpperCase() + name.slice(1)} (${vn}) thuộc nhóm ${grp}.`, lo: `Phân loại động vật: ${name} = ${grp}.`, top: 'animal-groups', skill: 'classification',
    });
    mcq(`Which covering does a ${name} have?`, feat, pickN(['fur', 'feathers', 'scales', 'wings', 'wet skin', 'six legs', 'a shell', 'thick skin'], 3, feat), {
      d: 2, ex: `${name} (${vn}) có ${feat}.`, lo: `Đặc điểm cơ thể: ${name}.`, top: 'animal-features', skill: 'concept',
    });
    if (g >= 3) {
      mcq(`A ${name} has ___.`, babies, pickN(ANIMALS.map((a) => a[3]), 3, babies), {
        d: 3, ex: `${name} sinh ra ${babies}.`, lo: `Sinh sản: ${name}.`, top: 'life-cycles', skill: 'concept',
      });
    }
  }
  // odd-one-out animal group
  for (let i = 0; i < 150; i++) {
    const grp = pick(groups);
    const inGrp = ANIMALS.filter((a) => a[1] === grp);
    const outGrp = ANIMALS.filter((a) => a[1] !== grp);
    if (inGrp.length < 3) continue;
    const three = pickN(inGrp.map((a) => a[0]), 3);
    const odd = pick(outGrp)[0];
    mcq(`Which one is NOT a ${grp}?`, odd, three, {
      d: 3, ex: `${odd} không phải ${grp}, còn ${three.join(', ')} đều là ${grp}.`, lo: `Tìm khác loại trong nhóm ${grp}.`, top: 'animal-groups', skill: 'classification',
    });
  }

  // 4. habitats
  for (const [an, hab, vn] of HABITATS) {
    mcq(`Where does a ${an} live?`, hab, pickN(HABITATS.map((h) => h[1]), 3, hab), {
      d: 2, ex: `${an} sống ở ${hab} (${vn}).`, lo: `Môi trường sống: ${an}.`, top: 'habitats', skill: 'concept',
    });
    mcq(`Which animal lives in ${hab}?`, an, pickN(HABITATS.filter((h) => h[1] !== hab).map((h) => h[0]), 3, an), {
      d: 2, ex: `${an} sống ở ${hab} (${vn}).`, lo: `Môi trường sống: ${an}.`, top: 'habitats', skill: 'classification',
    });
  }

  // 4b. movement
  for (const [an, mv, vn] of MOVES) {
    mcq(`How does a ${an} move?`, `It ${mv}`, pickN(MOVES.filter((m) => m[1] !== mv).map((m) => `It ${m[1]}`), 3), {
      d: 1, ex: `${an} ${vn}.`, lo: `Di chuyển: ${an}.`, top: 'movement', skill: 'concept',
    });
  }

  // 4c. diet classification (g3+)
  if (g >= 3) {
    for (const [an, cls, eats, vn] of DIET) {
      mcq(`A ${an} eats ${eats}. It is a ___.`, cls, pickN(['herbivore', 'carnivore', 'omnivore'], 3, cls), {
        d: 3, ex: `${vn} nên ${an} là ${cls} (ăn ${cls === 'herbivore' ? 'cây cỏ' : cls === 'carnivore' ? 'thịt' : 'tạp'}).`, lo: `Phân loại thức ăn: ${an} = ${cls}.`, top: 'diets', skill: 'classification',
      });
      mcq(`What does a ${an} mainly eat?`, eats, pickN(DIET.map((d) => d[2]), 3, eats), {
        d: 2, ex: `${vn}.`, lo: `Thức ăn: ${an}.`, top: 'diets', skill: 'concept',
      });
    }
  }

  // 4d. nocturnal
  for (const an of NOCTURNAL) {
    mcq(`Which animal is active at night (nocturnal)?`, an, pickN(['chicken', 'cow', 'dog', 'goat', 'duck', 'sparrow'], 3, an), {
      d: 2, ex: `${an} hoạt động về đêm (nocturnal).`, lo: 'Động vật hoạt động ban đêm.', top: 'habitats', skill: 'concept',
    });
  }

  // 5. plants
  for (const [part, job, vn] of PLANTS_PARTS) {
    mcq(`What do the ${part} of a plant do?`, job, pickN(PLANTS_PARTS.map((p) => p[1]), 3, job), {
      d: 2, ex: `${vn}.`, lo: `Bộ phận cây: ${part}.`, top: 'plants', skill: 'concept',
    });
    mcq(`Which part of a plant ${job}?`, part, pickN(PLANTS_PARTS.map((p) => p[0]), 3, part), {
      d: 2, ex: `${vn}.`, lo: `Bộ phận cây: ${part}.`, top: 'plants', skill: 'concept',
    });
  }
  const plantNeeds = ['water', 'sunlight', 'air', 'soil/nutrients'];
  for (const need of plantNeeds) {
    mcq(`What does a plant need to grow?`, `water, sunlight and air`, ['only water', 'only sunlight', 'candy and toys'], {
      d: 1, ex: `Cây cần nước, ánh sáng mặt trời và không khí để quang hợp và lớn lên.`, lo: 'Nhu cầu của cây.', top: 'plants', skill: 'concept',
    });
  }

  // 6. materials
  for (const [mat, prop, vn] of MATERIALS) {
    mcq(`Which material is ${prop.split(';')[0].split(',')[0].trim()}?`, mat, pickN(MATERIALS.map((m) => m[0]), 3, mat), {
      d: 2, ex: `${vn} - ${prop}.`, lo: `Vật liệu: ${mat}.`, top: 'materials', skill: 'concept',
    });
  }
  const MAT_USE = [
    ['a raincoat', 'rubber/plastic (waterproof)', 'áo mưa'], ['a window', 'glass (transparent)', 'cửa sổ'],
    ['a spoon for soup', 'metal (hard, conducts heat)', 'thìa'], ['a book page', 'paper (thin, light)', 'trang sách'],
  ];
  for (const [item_, m, vn] of MAT_USE) {
    mcq(`${item_[0].toUpperCase() + item_.slice(1)} is best made of ___.`, m, pickN(MATERIALS.map((x) => x[0]), 3), {
      d: 2, ex: `${vn} nên làm bằng ${m}.`, lo: `Chọn vật liệu phù hợp.`, top: 'materials', skill: 'application',
    });
  }

  // 7. weather + seasons
  for (const [w, def, vn] of WEATHER) {
    mcq(`It is ___ today - ${def}.`, w, pickN(WEATHER.map((x) => x[0]), 3, w), {
      d: 1, ex: `${def} nên trời đang ${vn}.`, lo: `Thời tiết: ${w}.`, top: 'weather', skill: 'concept',
    });
  }
  for (const [s, def, vn] of SEASONS) {
    mcq(`In ${s}, ${def}. Which season is it?`, s, pickN(SEASONS.map((x) => x[0]), 3, s), {
      d: 1, ex: `${def} đó là ${vn}.`, lo: `Mùa: ${s}.`, top: 'seasons', skill: 'concept',
    });
  }

  // 8. body (g3+)
  if (g >= 3) {
    for (const [org, job, vn] of BODY) {
      mcq(`Which body part ${job}?`, org, pickN(BODY.map((b) => b[0]), 3, org), {
        d: 2, ex: `${vn}.`, lo: `Cơ quan: ${org}.`, top: 'human-body', skill: 'concept',
      });
    }
  }

  // 9. states of matter (g3+)
  if (g >= 3) {
    for (const [thing, st, vn] of MATTER) {
      mcq(`What state of matter is ${thing}?`, `a ${st}`, pickN(['a solid', 'a liquid', 'a gas'], 3, `a ${st}`), {
        d: 3, ex: `${vn}.`, lo: `Thể của chất: ${thing} = ${st}.`, top: 'matter', skill: 'classification',
      });
    }
    const CHANGES = [
      ['Ice left in the sun', 'melts into water', 'đá tan thành nước'],
      ['Water heated in a pot', 'evaporates into steam', 'nước bay hơi thành hơi'],
      ['Water put in a freezer', 'freezes into ice', 'nước đông thành đá'],
      ['Steam touching a cold lid', 'condenses into water drops', 'hơi ngưng tụ thành giọt nước'],
    ];
    for (const [sit, res, vn] of CHANGES) {
      mcq(`${sit} ___.`, res, pickN(CHANGES.map((c) => c[1]), 3, res), {
        d: 3, ex: `${vn}.`, lo: 'Chuyển thể của nước.', top: 'matter-changes', skill: 'concept',
      });
    }
  }

  // 10. forces (g3+)
  if (g >= 3) {
    for (const [f, act, vn] of FORCES) {
      mcq(`To ${act}, we use a ___.`, f === 'a magnet' ? 'magnet' : f, pickN(['push', 'pull', 'gravity', 'friction', 'magnet'], 3, f === 'a magnet' ? 'magnet' : f), {
        d: 3, ex: `${vn}.`, lo: `Lực: ${f}.`, top: 'forces', skill: 'concept',
      });
    }
  }

  // 11. tools + light + earth (g3+ / g4-5)
  if (g >= 2) {
    for (const [tool, job, vn] of TOOLS) {
      mcq(`Which tool ${job}?`, `a ${tool}`, pickN(TOOLS.map((t) => `a ${t[0]}`), 3, `a ${tool}`), {
        d: 2, ex: `${vn}.`, lo: `Dụng cụ đo: ${tool}.`, top: 'tools', skill: 'concept',
      });
    }
  }
  if (g >= 4) {
    for (const [src, emits, vn] of LIGHTSRC) {
      mcq(`Is ${src} a light source (makes its own light)?`, emits ? 'Yes' : 'No - it only reflects light', [emits ? 'No - it only reflects light' : 'Yes', 'It makes light at night only'], {
        d: 3, ex: `${vn}.`, lo: `Nguồn sáng: ${src}.`, top: 'light', skill: 'concept',
      });
    }
    for (const [phen, why, vn] of EARTH) {
      mcq(`${phen[0].toUpperCase() + phen.slice(1)} ___.`, why, pickN(EARTH.map((e) => e[1]), 3, why), {
        d: 4, ex: `${vn}.`, lo: `Trái Đất: ${phen}.`, top: 'earth-space', skill: 'concept',
      });
    }
    for (const [step, name, vn] of WATERCYCLE) {
      mcq(`${step}. This part of the water cycle is called ___.`, name.split(' - ')[0], pickN(['evaporation', 'condensation', 'precipitation', 'collection'], 3, name.split(' - ')[0]), {
        d: 4, ex: `${vn} - ${name}.`, lo: `Vòng tuần hoàn nước: ${name.split(' - ')[0]}.`, top: 'water-cycle', skill: 'concept',
      });
    }
  }
  if (g >= 5) {
    for (const [e, kind, vn] of ENERGY) {
      mcq(`Is ${e} a renewable or non-renewable energy source?`, kind, [kind === 'renewable' ? 'non-renewable' : 'renewable', 'it is not energy'], {
        d: 4, ex: `${vn}.`, lo: `Năng lượng: ${e} = ${kind}.`, top: 'energy', skill: 'classification',
      });
    }
    for (const [seed, how, vn] of SEEDDISP) {
      mcq(`How does ${seed} spread its seeds?`, how, pickN(SEEDDISP.map((s) => s[1]), 3, how), {
        d: 4, ex: `${vn}.`, lo: `Phát tán hạt: ${seed}.`, top: 'plants-reproduction', skill: 'concept',
      });
    }
  }
  for (const [h, why, vn] of HYGIENE) {
    mcq(`Why is ${h} important?`, `It ${why.replace(/^(removes|prevents|stops|protects|avoids)/, '$1')}`, pickN(['It looks nice only', 'It is a rule with no reason', 'It makes you run faster', 'It helps you sleep'], 3), {
      d: 2, ex: `${vn}.`, lo: `Vệ sinh/an toàn: ${h}.`, top: 'hygiene-safety', skill: 'concept',
    });
  }

  // 11b. ecosystem / food chain (g4-5)
  if (g >= 4) {
    for (const [org, role, vn] of ECOSYSTEM) {
      mcq(`In a food chain, ${org} is a ___.`, role.split(' ')[0], pickN(['producer', 'herbivore', 'carnivore', 'omnivore', 'decomposer'], 3, role.split(' ')[0]), {
        d: 4, ex: `${vn}.`, lo: `Chuỗi thức ăn: ${org} = ${role}.`, top: 'ecosystems', skill: 'classification',
      });
    }
    for (const [m, role, vn] of ELECTRIC) {
      mcq(`In a circuit, ${m} is a ___.`, role, [role === 'conductor' ? 'insulator' : 'conductor', 'battery', 'switch'], {
        d: 4, ex: `${vn}.`, lo: `Điện: ${m} = ${role}.`, top: 'electricity', skill: 'classification',
      });
    }
  }

  // 12. environment + health
  for (const [act, why, vn] of ENV) {
    mcq(`To help the environment, we should ___ - this means ${why}.`, act.split(' ')[0] === 'not' ? 'not litter' : act,
      pickN(['litter everywhere', 'waste water', 'cut all trees', 'throw rubbish in the river'], 3), {
      d: 2, ex: `${vn} - ${why}.`, lo: `Bảo vệ môi trường: ${act}.`, top: 'environment', skill: 'concept',
    });
  }
  for (const [h, why, vn] of HEALTH) {
    mcq(`${h[0].toUpperCase() + h.slice(1)} is good for us because ${why}. True or False - the correct action is:`, `keep doing it`, ['avoid it always', 'it harms the body', 'stop it forever'], {
      d: 2, ex: `${vn} - ${why} nên nên duy trì/làm.`, lo: `Sức khỏe: ${h}.`, top: 'health', skill: 'concept',
    });
  }

  // 12b. food groups (g3+)
  if (g >= 3) {
    for (const [food, grp, vn] of FOODGROUPS) {
      const key = grp.split(' ')[0];
      mcq(`${food[0].toUpperCase() + food.slice(1)} belongs to which food group?`, key, pickN(['grains/carbs', 'protein', 'vitamins', 'fats', 'sugar'], 3, key), {
        d: 3, ex: `${vn}.`, lo: `Nhóm thực phẩm: ${food} = ${key}.`, top: 'nutrition', skill: 'classification',
      });
      mcq(`Why is ${food} good (or limited) for us?`, grp.split('- ')[1] ?? grp, pickN(FOODGROUPS.map((f) => f[1].split('- ')[1] ?? f[1]), 3), {
        d: 3, ex: `${vn}.`, lo: `Giá trị dinh dưỡng: ${food}.`, top: 'nutrition', skill: 'concept',
      });
    }
  }

  // 13. TF passages per grade band
  const PASSAGES = [
    [`Plants are living things. They need water, sunlight and air to grow. Roots take water from the soil.`,
     ['Plants need sunlight to grow.', true], ['Plants do not need water.', false]],
    [`A frog starts life as an egg. The egg becomes a tadpole with a tail. Then it grows legs and becomes a frog.`,
     ['A frog starts life as an egg.', true], ['A tadpole has four legs.', false]],
    [`Materials have different properties. Metal is hard and conducts heat. Rubber is soft and stretchy.`,
     ['Metal conducts heat well.', true], ['Rubber is hard like metal.', false]],
    [`The Earth goes around the Sun. It takes one year. The Earth also spins, which makes day and night.`,
     ['The Earth goes around the Sun.', true], ['Day and night come from the Sun moving around Earth.', false]],
    [`In a food chain, grass is a producer. A rabbit eats the grass. An eagle eats the rabbit.`,
     ['Grass makes its own food.', true], ['The rabbit eats the eagle.', false]],
    [`Water can be a solid (ice), a liquid (water), or a gas (steam). Heating ice makes it melt.`,
     ['Ice is water in solid form.', true], ['Heating ice makes it freeze harder.', false]],
    [`Electricity flows through conductors like metal wires. Insulators like rubber stop the flow.`,
     ['Metal is a conductor.', true], ['Rubber lets electricity flow easily.', false]],
    [`We should save water and energy. Turning off lights and taps helps the Earth.`,
     ['We should leave taps running.', false], ['Saving energy helps the Earth.', true]],
  ];
  const pCount = g <= 2 ? 4 : PASSAGES.length;
  for (const [p, s1, s2] of PASSAGES.slice(0, pCount)) {
    for (const [s, b] of [s1, s2]) {
      tf(p, s, b, {
        d: 3, ex: b ? `Bài đọc nói đúng: "${s}"` : `Bài đọc không nói điều này: "${s}"`, lo: 'Đọc hiểu khoa học.', top: 'reading-science', skill: 'reading',
      });
    }
  }

  // 14. apply-to-scenario frames - combinatorial unique pool
  const STUDENTS = ['Mai', 'Nam', 'Lan', 'Huy', 'Linh', 'Minh'];
  const PLACES = ['the zoo', 'the park', 'a farm', 'the beach', 'the forest', 'a garden', 'the market'];
  for (let i = 0; i < 900; i++) {
    const [an, grp, feat, babies, vn] = pick(ANIMALS);
    const st = pick(STUDENTS), pl = pick(PLACES);
    const frames = [
      [`${st} sees an animal with ${feat} at ${pl}. Which animal could it be?`, an, pickN(ANIMALS.map((a) => a[0]), 3, an),
        `Con vật có ${feat} - ${an} (${vn}) có ${feat}.`],
      [`Which animal is a ${grp}?`, an, pickN(ANIMALS.filter((a) => a[1] !== grp).map((a) => a[0]), 3, an),
        `${an} (${vn}) là ${grp}.`],
      [`${st} finds a ${an} at ${pl}. It has ${feat}. What group is it?`, `a ${grp}`, pickN(groups.map((x) => `a ${x}`), 3, `a ${grp}`),
        `${an} (${vn}) có ${feat} nên là ${grp}.`],
      [`Why does a ${an} live well in its home?`, `because its body fits that place`, ['because it has wheels', 'because it reads books', 'because it wears clothes'],
        `Cơ thể ${an} thích nghi với môi trường sống của nó.`],
      [`At ${pl}, ${st} finds a baby ${an}. It came from ___.`, babies, pickN(ANIMALS.map((a) => a[3]), 3, babies),
        `${an} sinh ra ${babies}.`],
    ];
    for (const [q, c, w, ex] of frames) {
      mcq(q, c, Array.isArray(w) ? w : [w], { d: 2, ex, lo: `Ứng dụng kiến thức: ${an}.`, top: 'application', skill: 'application' });
    }
  }

  // 15. "which one can/cannot" application pool
  const CAN_DO = [
    ['Which animal can fly?', ['eagle', 'sparrow', 'parrot', 'bat', 'butterfly', 'bee', 'owl'], ['dog', 'cat', 'fish', 'cow', 'snake', 'frog', 'turtle', 'rabbit']],
    ['Which animal can swim?', ['fish', 'duck', 'frog', 'whale', 'dolphin', 'shark', 'penguin', 'turtle', 'goldfish'], ['cat', 'chicken', 'eagle', 'goat', 'cow']],
    ['Which animal has four legs?', ['dog', 'cat', 'cow', 'horse', 'tiger', 'elephant', 'rabbit', 'lizard'], ['chicken', 'fish', 'snake', 'bird', 'duck', 'sparrow']],
    ['Which animal lays eggs?', ['chicken', 'duck', 'fish', 'frog', 'snake', 'turtle', 'butterfly', 'penguin'], ['dog', 'cat', 'cow', 'whale', 'human', 'bat']],
    ['Which animal gives milk to its babies?', ['cow', 'goat', 'dog', 'cat', 'whale', 'bat'], ['chicken', 'fish', 'frog', 'snake', 'duck']],
    ['Which lives both on land and in water?', ['frog', 'toad', 'turtle', 'crocodile', 'duck'], ['eagle', 'rabbit', 'horse', 'worm', 'ant']],
  ];
  for (let i = 0; i < 600; i++) {
    const [q, yes, no] = pick(CAN_DO);
    const correct = pick(yes);
    mcq(q, `a ${correct}`, pickN(no.map((x) => `a ${x}`), 3), {
      d: 1, ex: `${correct} đúng với yêu cầu câu hỏi, các đáp án kia không.`, lo: 'Phân loại theo khả năng/đặc điểm.', top: 'classification', skill: 'classification',
    });
  }

  // 16. more science TF statements (no passage - fact check)
  const FACTS = [
    ['All insects have six legs.', true], ['A spider is an insect.', false],
    ['The Moon makes its own light.', false], ['The Sun is a star.', true],
    ['Fish breathe with gills.', true], ['Whales are fish.', false],
    ['Plants make their own food with sunlight.', true], ['A mushroom is a plant.', false],
    ['Water boils at 100 degrees Celsius.', true], ['Water freezes at 50 degrees Celsius.', false],
    ['A magnet can attract plastic.', false], ['A magnet can attract iron.', true],
    ['Sound is made by vibrations.', true], ['We can see sound.', false],
    ['Exercise makes your heart stronger.', true], ['Sleeping is bad for children.', false],
    ['Trees give us oxygen.', true], ['Plastic is a natural material.', false],
    ['The Earth is flat like a table.', false], ['The Earth is a sphere.', true],
    ['Recycling helps the environment.', true], ['It is OK to throw rubbish in rivers.', false],
    ['Chickens are mammals.', false], ['Bats are mammals.', true],
    ['Leaves make food for the plant.', true], ['Roots make seeds.', false],
    ['A thermometer measures temperature.', true], ['A ruler measures temperature.', false],
    ['Ice melts when it is heated.', true], ['Ice becomes colder in the sun.', false],
    ['Humans need oxygen to live.', true], ['Plants need candy to grow.', false],
    ['Friction makes things move faster.', false], ['Gravity pulls things down.', true],
  ];
  for (const [s, b] of FACTS) {
    tf('Check this fact.', s, b, {
      d: 2, ex: `"${s}" là ${b ? 'đúng' : 'sai'} theo khoa học.`, lo: 'Kiểm tra kiến thức khoa học.', top: 'facts', skill: 'concept',
    });
  }
  // fact pool combinatorial: each fact also as mcq "is it true?"
  for (let i = 0; i < 300; i++) {
    const [s, b] = pick(FACTS);
    mcq(`True or false: "${s}"`, b ? 'True' : 'False', [b ? 'False' : 'True', 'Maybe', 'No answer'], {
      d: 2, ex: `"${s}" là ${b ? 'đúng' : 'sai'}.`, lo: 'Kiểm tra kiến thức khoa học.', top: 'facts', skill: 'concept',
    });
  }
}

// =====================================================================
if (SUBJECT === 'math') mathGrade(GRADE); else scienceGrade(GRADE);
console.log(`${SUBJECT} G${GRADE}: ${items.length} template items`);

// ---------- map to rows ----------
function toRow(it) {
  const questionType = it.tf ? 'true-false' : 'mcq';
  const promptText = it.tf ? 'Read the passage. True or False?' : it.q;
  const idKey = (it.q ?? it.statement) + '|' + JSON.stringify(it.c ?? it.bool ?? '');
  const id = `g${GRADE}-${SUBJECT}-tpl-${createHash('sha1').update(`${GRADE}|${SUBJECT}|${idKey}`).digest('hex').slice(0, 12)}`;
  const choices = it.tf ? ['True', 'False'] : it.c;
  const answer = it.tf ? { boolean: it.bool } : { text: it.c[it.a], index: it.a };
  const contentHash = createHash('sha1').update(JSON.stringify([promptText, choices, answer, it.passage ?? null])).digest('hex').slice(0, 16);
  return {
    id, grade: GRADE, subject: SUBJECT,
    domain: it.tf ? 'reading' : SUBJECT === 'math' ? 'numbers' : 'science',
    skill: it.skill ?? (SUBJECT === 'math' ? 'arithmetic' : 'concept'),
    question_type: questionType, difficulty: Math.min(5, Math.max(1, it.d ?? 2)),
    topic_key: String(it.top ?? 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
    prompt_text: String(promptText).slice(0, 500), transcript: null,
    choices, answer,
    explanation_vi: String(it.ex).slice(0, 500), learning_objective: String(it.lo ?? '').slice(0, 200),
    curriculum_alignment: { grade: GRADE, coreTopic: it.top ?? 'general', moetSubject: SUBJECT === 'math' ? 'Mathematics' : 'Science', alignmentLevel: 'topic-skill', curriculumRole: 'core', primaryFramework: 'MOET-2018' },
    tags: null, canonical: true, variant_group_id: null,
    rights_status: 'owned-original-generated',
    review_status: 'machine-editorial-reviewed-human-academic-signoff-required',
    publication_policy: { examEligible: false, mockEligible: true, practiceEligible: true, commercialReleaseEligible: true, requiresHumanApprovalForExam: true, requiresHumanApprovalForCommercialRelease: true },
    content_hash: contentHash,
    source: { kind: 'generated-v6', method: 'cr67-template', provenance: 'Deterministic template generation; original, not copied.' },
    schema_version: '6.0', passage: it.passage ?? null, statement: it.statement ?? null, tokens: null,
  };
}

const rows = items.map(toRow);
const uniqId = new Set(rows.map((r) => r.id));
const uniqHash = new Set(rows.map((r) => r.content_hash));
console.log(`unique ids: ${uniqId.size}, unique content_hash: ${uniqHash.size} / ${rows.length}`);

if (!DRY && rows.length) {
  for (let c = 0; c < rows.length; c += 300) {
    const res = await fetch(`${SUPA}/rest/v1/qb_questions`, { method: 'POST', headers: H, body: JSON.stringify(rows.slice(c, c + 300)) });
    if (!res.ok) console.error('push fail', res.status, (await res.text()).slice(0, 200));
  }
  console.log('pushed', rows.length);
}
mkdirSync(join(HERE, 'gen-bulk-out'), { recursive: true });
writeFileSync(join(HERE, 'gen-bulk-out', `tpl-${SUBJECT}-g${GRADE}-preview.json`), JSON.stringify(rows.slice(0, 8), null, 1));
