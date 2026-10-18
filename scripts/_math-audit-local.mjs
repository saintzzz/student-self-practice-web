// Local eval of wrong-answer-math over rows pulled via MCP execute_sql.
// Input: the overflow JSON file (array of {id, prompt_text, choices, answer}).
// Mirrors scripts/qb-content-audit.mjs evalChain/expectedMath exactly.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
let raw = readFileSync(file, 'utf8');
if (raw.trimStart().startsWith('{')) {
  const outer = JSON.parse(raw);
  raw = outer.result ?? raw;
}
const open = raw.indexOf('[');
const close = raw.lastIndexOf(']');
const rows = JSON.parse(open >= 0 && close > open ? raw.slice(open, close + 1) : raw);
console.log(`rows: ${rows.length}`);

const choiceLabel = (c) =>
  typeof c === 'string' || typeof c === 'number'
    ? String(c)
    : String(c?.assetId ?? '').replace(/^concept-/, '').replace(/-[0-9a-f]{6}$/, '').replace(/-/g, ' ');
const correctLabel = (q) => {
  const a = q.answer ?? {};
  if (a.index !== undefined && Array.isArray(q.choices)) return choiceLabel(q.choices[a.index]);
  if (a.text) return String(a.text);
  if (a.boolean !== undefined) return String(a.boolean);
  return '';
};

function evalChain(expr) {
  const toks = String(expr).match(/\d+|[+\-×x*÷/]/g);
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
  if ((m = p.match(/What is ([\d\s+\-×x*÷]+?)\s*[?=]/i)) ||
      (m = p.match(/What is ((?:\d+\s*[+\-×x*÷]\s*){2,}\d+)/i))) {
    const v = evalChain(m[1]);
    if (v !== undefined) return v;
  }
  if ((m = p.match(/Solve[^?\d]*((?:\d+\s*[+\-×x*÷]\s*){2,}\d+)/i))) {
    const v = evalChain(m[1]);
    if (v !== undefined) return v;
  }
  if ((m = p.match(/What is (\d+)\s*plus\s*(\d+)/i))) return +m[1] + +m[2];
  if ((m = p.match(/What is (\d+)\s*minus\s*(\d+)/i))) return +m[1] - +m[2];
  if ((m = p.match(/What is (\d+)\s*(?:times|multiplied by)\s*(\d+)/i))) return +m[1] * +m[2];
  if ((m = p.match(/What is (\d+)\s*divided by\s*(\d+)/i))) return +m[1] / +m[2];
  if ((m = p.match(/What is (\d+)\s*[+]\s*(\d+)/i))) return +m[1] + +m[2];
  if ((m = p.match(/What is (\d+)\s*-\s*(\d+)/i))) return +m[1] - +m[2];
  if ((m = p.match(/What is (\d+)\s*[×x*]\s*(\d+)/i))) return +m[1] * +m[2];
  if ((m = p.match(/What is (\d+)\s*÷\s*(\d+)/i))) return +m[1] / +m[2];
  if ((m = p.match(/Compute (\d+)\s*÷\s*(\d+)/i))) return +m[1] / +m[2];
  if ((m = p.match(/Compute (\d+)\s*[×x*]\s*(\d+)/i))) return +m[1] * +m[2];
  if ((m = p.match(/Solve[^\d]*(\d+)\s*[+]\s*(\d+)/i))) return +m[1] + +m[2];
  if ((m = p.match(/Solve[^\d]*(\d+)\s*-\s*(\d+)/i))) return +m[1] - +m[2];
  if ((m = p.match(/Solve[^\d]*(\d+)\s*[×x*]\s*(\d+)/i))) return +m[1] * +m[2];
  if ((m = p.match(/Solve[^\d]*(\d+)\s*÷\s*(\d+)/i))) return +m[1] / +m[2];
  if ((m = p.match(/(\d+)\s*[+]\s*(\d+)\s*=\s*[_?]/))) return +m[1] + +m[2];
  if ((m = p.match(/(\d+)\s*-\s*(\d+)\s*=\s*[_?]/))) return +m[1] - +m[2];
  if ((m = p.match(/(\d+)\s*[×x]\s*(\d+)\s*=\s*[_?]/))) return +m[1] * +m[2];
  if ((m = p.match(/(\d+)\s*÷\s*(\d+)\s*=\s*[_?]/))) return +m[1] / +m[2];
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

const bad = [];
let evaluated = 0;
for (const q of rows) {
  const exp = expectedMath(q.prompt_text ?? '');
  if (exp === undefined || !Number.isFinite(exp)) continue;
  evaluated++;
  const ans = toNum(correctLabel(q));
  if (!Number.isFinite(ans) || Math.abs(ans - exp) > 1e-9) {
    bad.push({ id: q.id, prompt: q.prompt_text, expected: exp, marked: correctLabel(q) });
  }
}
console.log(`evaluated: ${evaluated}`);
console.log(`wrong-answer-math: ${bad.length}`);
const classes = {
  missingAddend: bad.filter((b) => /___\s*[+\-]\s*\d|=\s*___\s*[+\-]/.test(b.prompt) || /missing number/i.test(b.prompt)),
};
console.log(`  missing-addend prompts: ${classes.missingAddend.length}`);
const rest = bad.filter((b) => !classes.missingAddend.includes(b));
console.log(`  other flagged: ${rest.length}`);
rest.slice(0, 20).forEach((b) => console.log(`  ${b.id} | "${b.prompt}" | expected=${b.expected} marked="${b.marked}"`));
