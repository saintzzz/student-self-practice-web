import type { ExamQuestion, GrammarMcqQuestion, TextAnswerQuestion } from '../../types/exam';
import { hashString, seededShuffleIndices } from '../prng';

/**
 * CR-24 - "Toán tiếng Anh" program: math questions phrased in English,
 * matching the IOE Math-in-English style (e.g. "Five times nine minus
 * ___ equals thirty-four"). All items are generated deterministically
 * from seeded arithmetic facts, so the pool is large and always correct.
 */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberToWords(n: number): string {
  if (n < 0) return `minus ${numberToWords(-n)}`;
  if (n < 20) return ONES[n]!;
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r === 0 ? TENS[t]! : `${TENS[t]}-${ONES[r]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r === 0 ? `${ONES[h]} hundred` : `${ONES[h]} hundred and ${numberToWords(r)}`;
  }
  return String(n);
}

/** Answers accepted for a numeric result: digits + words. */
function numericAccept(n: number): readonly string[] {
  return [String(n), numberToWords(n), numberToWords(n).replace('-', ' ')];
}

interface BandSpec {
  maxAdd: number;
  maxMul: number;
  maxNum: number;
}

function band(gradeId: string): BandSpec {
  switch (gradeId) {
    case 'grade-1': return { maxAdd: 10, maxMul: 0, maxNum: 20 };
    case 'grade-2': return { maxAdd: 20, maxMul: 5, maxNum: 100 };
    case 'grade-3': return { maxAdd: 100, maxMul: 9, maxNum: 1000 };
    default: return { maxAdd: 1000, maxMul: 12, maxNum: 1000 };
  }
}

function seededNum(seed: string, min: number, max: number): number {
  return min + (hashString(seed) % (max - min + 1));
}

function mcqOptions(correct: number, seed: string, max: number): { options: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3 } {
  const pool = new Set<number>();
  let attempt = 0;
  while (pool.size < 3 && attempt < 40) {
    const d = seededNum(`${seed}-d${attempt}`, Math.max(0, correct - 9), Math.min(max, correct + 9));
    if (d !== correct) pool.add(d);
    attempt++;
  }
  const distractors = [...pool].slice(0, 3);
  const texts = [numberToWords(correct), ...distractors.map(numberToWords)];
  const order = seededShuffleIndices(4, `${seed}-o`);
  const options = order.map((i) => texts[i]!) as [string, string, string, string];
  return { options, correctIndex: order.indexOf(0) as 0 | 1 | 2 | 3 };
}

/**
 * Generates the math-English pool for a grade. Families:
 *  A. text-answer arithmetic sentences (IOE style: "Five times nine
 *     minus ___ equals thirty-four.")
 *  B. "What is ..." MCQ (add/sub/mul)
 *  C. number reading MCQ ("Which number is 'sixty-four'?")
 *  D. comparisons ("Which is the biggest/smallest number?")
 *  E. sequences ("What comes next: 5, 10, 15, ___?")
 *  F. everyday math facts MCQ (days in a week, sides of a shape...)
 */
export function generateMathQuestions(gradeId: string, seedPrefix = ''): ExamQuestion[] {
  const spec = band(gradeId);
  const questions: ExamQuestion[] = [];
  const T = 'math';
  let n = 0;
  const id = (tag: string) => `q-${T}-${gradeId}-${tag}-${n++}`;

  // A. Arithmetic sentence fill (IOE "Five times nine minus ___ equals...")
  const OPS: { sym: string; words: string }[] = [
    { sym: '+', words: 'plus' },
    { sym: '-', words: 'minus' },
  ];
  if (spec.maxMul > 0) OPS.push({ sym: 'x', words: 'times' });

  for (let i = 0; i < 60; i++) {
    const seed = `${seedPrefix}arith-${i}`;
    const a = seededNum(seed + 'a', 1, spec.maxMul > 0 ? spec.maxMul : spec.maxAdd);
    const b = seededNum(seed + 'b', 1, spec.maxMul > 0 ? spec.maxMul : spec.maxAdd);
    const c = seededNum(seed + 'c', 1, spec.maxAdd);

    // "A times B minus ___ equals C" or "A plus B minus ___ equals C"
    const prod = spec.maxMul > 0 && i % 2 === 0 ? a * b : a + b;
    const lead = spec.maxMul > 0 && i % 2 === 0
      ? `${cap(numberToWords(a))} times ${numberToWords(b)}`
      : `${cap(numberToWords(a))} plus ${numberToWords(b)}`;
    const answer = prod - c;
    if (answer < 0) continue;
    const sentence = `${lead} minus ${numberToWords(answer)} equals ${numberToWords(c)}.`;
    questions.push({
      id: id('arith'),
      topicId: T,
      kind: 'text-answer',
      sentence,
      displaySentence: `${lead} minus ___ equals ${numberToWords(c)}.`,
      accept: numericAccept(answer),
      explanation: `${numberToWords(prod)} minus ${numberToWords(answer)} = ${numberToWords(c)}.`,
    } satisfies TextAnswerQuestion);
  }

  // B. "What is A plus/minus/times B?" MCQ
  const total = 60;
  for (let i = 0; i < total; i++) {
    const seed = `${seedPrefix}what-${i}`;
    const a = seededNum(seed + 'a', 2, spec.maxMul > 0 ? spec.maxMul * 2 : spec.maxAdd);
    const b = seededNum(seed + 'b', 1, spec.maxMul > 0 ? spec.maxMul : spec.maxAdd);
    const variants: { q: string; r: number; sym: string }[] = [
      { q: `${cap(numberToWords(a))} plus ${numberToWords(b)}`, r: a + b, sym: '+' },
      { q: `${cap(numberToWords(a + b))} minus ${numberToWords(b)}`, r: a, sym: '-' },
    ];
    if (spec.maxMul > 0 && a <= spec.maxMul && b <= spec.maxMul) {
      variants.push({ q: `${cap(numberToWords(a))} times ${numberToWords(b)}`, r: a * b, sym: 'x' });
    }
    const v = variants[i % variants.length]!;
    const { options, correctIndex } = mcqOptions(v.r, seed, Math.max(spec.maxNum, v.r + 9));
    questions.push({
      id: id('what'),
      topicId: T,
      kind: 'grammar-mcq',
      prompt: `What is ${v.q.charAt(0).toLowerCase() + v.q.slice(1)}?`,
      options,
      correctIndex,
      explanation: `${v.q} = ${numberToWords(v.r)} (${v.r}).`,
    } satisfies GrammarMcqQuestion);
  }

  // C. Number reading: "Which number is 'seventy-two'?" -> digits
  for (let i = 0; i < 40; i++) {
    const seed = `${seedPrefix}read-${i}`;
    const value = seededNum(seed, 10, spec.maxNum);
    const pool = new Set<number>([value]);
    let a2 = 0;
    while (pool.size < 4 && a2++ < 50) pool.add(seededNum(`${seed}-x${a2}`, 10, spec.maxNum));
    const digits = [...pool];
    const order = seededShuffleIndices(digits.length === 4 ? 4 : digits.length, `${seed}-o`);
    const four = digits.length === 4 ? digits : [value, ...digits.slice(1)].slice(0, 4);
    const opts = four.map(String) as [string, string, string, string];
    const ordered = order.map((ix) => opts[ix]!);
    const ci = ordered.indexOf(String(value)) as 0 | 1 | 2 | 3;
    questions.push({
      id: id('read'),
      topicId: T,
      kind: 'grammar-mcq',
      prompt: `Which number is "${numberToWords(value)}"?`,
      options: [ordered[0]!, ordered[1]!, ordered[2]!, ordered[3]!],
      correctIndex: ci,
      explanation: `"${numberToWords(value)}" là số ${value}.`,
    } satisfies GrammarMcqQuestion);
  }

  // D. Biggest/smallest
  for (let i = 0; i < 30; i++) {
    const seed = `${seedPrefix}cmp-${i}`;
    const nums = new Set<number>();
    let t = 0;
    while (nums.size < 4 && t++ < 60) nums.add(seededNum(`${seed}-${t}`, 1, spec.maxNum));
    const arr = [...nums];
    const biggest = i % 2 === 0;
    const target = biggest ? Math.max(...arr) : Math.min(...arr);
    const order = seededShuffleIndices(4, `${seed}-o`);
    const options = order.map((ix) => String(arr[ix]!)) as [string, string, string, string];
    questions.push({
      id: id('cmp'),
      topicId: T,
      kind: 'grammar-mcq',
      prompt: `Which is the ${biggest ? 'biggest' : 'smallest'} number?`,
      options,
      correctIndex: options.indexOf(String(target)) as 0 | 1 | 2 | 3,
      explanation: `Số ${biggest ? 'lớn' : 'nhỏ'} nhất là ${target}.`,
    } satisfies GrammarMcqQuestion);
  }

  // E. Sequences: "What comes next? 4, 8, 12, ___"
  for (let i = 0; i < 30; i++) {
    const seed = `${seedPrefix}seq-${i}`;
    const step = seededNum(seed + 's', 2, Math.min(10, spec.maxAdd));
    const start = seededNum(seed + 't', 1, 15);
    const seq = [start, start + step, start + 2 * step];
    const next = start + 3 * step;
    questions.push({
      id: id('seq'),
      topicId: T,
      kind: 'text-answer',
      sentence: `What comes next? ${seq.join(', ')}, ${next}.`,
      displaySentence: `What comes next? ${seq.join(', ')}, ___.`,
      accept: numericAccept(next),
      explanation: `Dãy cộng thêm ${step} mỗi lần: sau ${seq[2]} là ${next}.`,
    } satisfies TextAnswerQuestion);
  }

  // F. Everyday facts (authored - per band)
  for (const [i, fact] of MATH_FACTS.entries()) {
    const { options, correctIndex } = mcqOptions(fact.answer, `${seedPrefix}fact-${i}`, 60);
    questions.push({
      id: id('fact'),
      topicId: T,
      kind: 'grammar-mcq',
      prompt: fact.prompt,
      options,
      correctIndex,
      explanation: fact.explanationVi,
    } satisfies GrammarMcqQuestion);
  }

  return questions;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const MATH_FACTS: readonly { prompt: string; answer: number; explanationVi: string }[] = [
  { prompt: 'How many days are there in a week?', answer: 7, explanationVi: 'Một tuần có 7 ngày.' },
  { prompt: 'How many months are there in a year?', answer: 12, explanationVi: 'Một năm có 12 tháng.' },
  { prompt: 'How many sides does a triangle have?', answer: 3, explanationVi: 'Hình tam giác có 3 cạnh.' },
  { prompt: 'How many sides does a square have?', answer: 4, explanationVi: 'Hình vuông có 4 cạnh.' },
  { prompt: 'How many sides does a pentagon have?', answer: 5, explanationVi: 'Hình ngũ giác có 5 cạnh.' },
  { prompt: 'How many minutes are there in an hour?', answer: 60, explanationVi: 'Một giờ có 60 phút.' },
  { prompt: 'How many hours are there in a day?', answer: 24, explanationVi: 'Một ngày có 24 giờ.' },
  { prompt: 'How many legs do two cats have?', answer: 8, explanationVi: 'Mỗi con mèo 4 chân, hai con là 8.' },
  { prompt: 'How many fingers do you have on two hands?', answer: 10, explanationVi: 'Hai bàn tay có 10 ngón.' },
  { prompt: 'A dozen eggs means how many eggs?', answer: 12, explanationVi: 'Một tá = 12 quả.' },
];
