// Shared visual-puzzle spec derivation (CR-136). Both the question
// generator (choices/assetIds) and the asset publisher (SVG rendering,
// link sort_order) must agree on the candidate set and slot order, so
// the derivation lives in one place.
import { createHash } from 'node:crypto';

export const PUZZLE_RX = /Hình nào thể hiện phép tính (\d+) ([+\-×:]) (\d+)\?/;

export function puzzleSlot(prompt) {
  return createHash('sha1').update(prompt).digest()[0] % 4;
}

const MODEL_LABEL = {
  partWhole: 'sơ đồ gộp hai phần',
  compare: 'hai thanh so sánh',
  compareGap: 'so sánh có phần chênh',
  subtract: 'sơ đồ bớt một phần',
  equalParts: 'chia thành phần bằng nhau',
  multiply: 'nhóm bằng nhau lặp lại',
};

/** Ordered 4-cell spec list for a puzzle prompt (or null if not a puzzle). */
export function puzzleCells(prompt) {
  const m = prompt.match(PUZZLE_RX);
  if (!m) return null;
  const a = +m[1], op = m[2], b = +m[3];
  const correct = {
    '+': { type: 'bar', kind: 'partWhole', a, b, unit: '' },
    '-': { type: 'bar', kind: 'subtract', whole: a, part: b, unit: '' },
    '×': { type: 'bar', kind: 'multiply', n: b, unitPrice: a, unit: '' },
    ':': { type: 'bar', kind: 'equalParts', total: a, parts: b, unit: '' },
  }[op];
  // wrong pools are per-op: a distractor model must NOT also be a valid
  // depiction of the expression (compareGap/numberBond both encode a-b,
  // so they can never appear in '-' puzzles).
  const pools = {
    '+': [{ type: 'bar', kind: 'compare', a, b }, { type: 'bar', kind: 'compareGap', a, gap: b, unit: '' }, { type: 'bar', kind: 'equalParts', total: a + b, parts: 2, unit: '' }],
    '-': [{ type: 'bar', kind: 'compare', a, b }, { type: 'bar', kind: 'equalParts', total: a, parts: 2, unit: '' }, { type: 'bar', kind: 'multiply', n: 2, unitPrice: b, unit: '' }],
    '×': [{ type: 'bar', kind: 'partWhole', a, b, unit: '' }, { type: 'bar', kind: 'equalParts', total: a, parts: b, unit: '' }, { type: 'bar', kind: 'compare', a, b }],
    ':': [{ type: 'bar', kind: 'partWhole', a, b, unit: '' }, { type: 'bar', kind: 'multiply', n: 2, unitPrice: b, unit: '' }, { type: 'bar', kind: 'compare', a, b }],
  };
  const wrongs = pools[op].filter((w) => JSON.stringify(w) !== JSON.stringify(correct)).slice(0, 3);
  const slot = puzzleSlot(prompt);
  const cells = [];
  for (let i = 0, w = 0; i < 4; i++) cells.push(i === slot ? correct : wrongs[w++]);
  return cells;
}

/** Deterministic asset id for one candidate model AT a given option
 *  letter. The letter is baked into the rendered SVG badge, so the id
 *  must include it - otherwise the same model at a different option
 *  index would share an asset showing the wrong letter (r188). */
export function puzzleAssetId(cellSpec, letter) {
  return `mathvi-opt-${createHash('sha1').update(JSON.stringify({ letter, cellSpec })).digest('hex').slice(0, 10)}`;
}

/** Visible/accessible label for option i of a puzzle prompt. */
export function puzzleOptionLabel(prompt, i) {
  const cells = puzzleCells(prompt);
  const kind = cells?.[i]?.kind ?? cells?.[i]?.type ?? '';
  return `Hình ${'ABCD'[i]} - ${MODEL_LABEL[kind] ?? 'mô hình'}`;
}
