import { describe, expect, it } from 'vitest';
import { IOE_BANK } from './ioeRealBank';

/**
 * CR-42 content-contract guards for the harvested bank.
 *
 * Why these exist: CR-38/39/40 were three production defects that every
 * existing unit test missed, because tests validated code logic with
 * synthetic fixtures while the real shipped data never passed through
 * validation. These tests assert invariants over the REAL bank so a bad
 * record fails CI instead of reaching a child:
 *
 * - CR-38: tf records with empty `passage` rendered a blank gray box.
 * - CR-40: `<u>` markup leaked because nothing asserted the bank only
 *   contains markup the UI actually renders.
 * - General: template junk ('undefined', 'null', stray braces) must
 *   fail loudly here, not in a screenshot from the user.
 */

const GRADES = Object.keys(IOE_BANK);

function allBankStrings(): { where: string; value: string }[] {
  const out: { where: string; value: string }[] = [];
  for (const [gradeId, bank] of Object.entries(IOE_BANK)) {
    bank.mcq.forEach((m, i) => {
      out.push({ where: `${gradeId}.mcq[${i}].prompt`, value: m.prompt });
      m.options.forEach((o, j) => out.push({ where: `${gradeId}.mcq[${i}].options[${j}]`, value: o }));
      out.push({ where: `${gradeId}.mcq[${i}].explanationVi`, value: m.explanationVi });
    });
    bank.reorder.forEach((s, i) => out.push({ where: `${gradeId}.reorder[${i}]`, value: s }));
    bank.masked.forEach((m, i) => {
      out.push({ where: `${gradeId}.masked[${i}].word`, value: m.word });
      out.push({ where: `${gradeId}.masked[${i}].sentence`, value: m.sentence });
      out.push({ where: `${gradeId}.masked[${i}].displaySentence`, value: m.displaySentence });
    });
    bank.listen.forEach((s, i) => out.push({ where: `${gradeId}.listen[${i}]`, value: s }));
    bank.tf.forEach((t, i) => {
      out.push({ where: `${gradeId}.tf[${i}].passage`, value: t.passage });
      out.push({ where: `${gradeId}.tf[${i}].statement`, value: t.statement });
    });
  }
  return out;
}

describe('IOE bank data invariants (CR-42)', () => {
  it('every tf item has a non-empty passage (CR-38 regression)', () => {
    for (const [gradeId, bank] of Object.entries(IOE_BANK)) {
      bank.tf.forEach((t, i) => {
        expect(t.passage.trim().length, `${gradeId}.tf[${i}] empty passage`).toBeGreaterThanOrEqual(20);
        expect(t.statement.trim().length, `${gradeId}.tf[${i}] empty statement`).toBeGreaterThan(0);
      });
    }
  });

  it('every masked item shows a visible blank and a non-empty missing run', () => {
    for (const [gradeId, bank] of Object.entries(IOE_BANK)) {
      bank.masked.forEach((m, i) => {
        expect(m.displaySentence, `${gradeId}.masked[${i}] has no blank`).toMatch(/_/);
        expect(m.missing.trim().length, `${gradeId}.masked[${i}] empty missing`).toBeGreaterThan(0);
      });
    }
  });

  it('every mcq has 4 distinct options and an in-bounds answer', () => {
    for (const [gradeId, bank] of Object.entries(IOE_BANK)) {
      bank.mcq.forEach((m, i) => {
        expect(m.options, `${gradeId}.mcq[${i}]`).toHaveLength(4);
        expect(new Set(m.options).size, `${gradeId}.mcq[${i}] duplicate options`).toBe(4);
        expect(m.answer, `${gradeId}.mcq[${i}]`).toBeGreaterThanOrEqual(0);
        expect(m.answer, `${gradeId}.mcq[${i}]`).toBeLessThan(4);
        expect(m.prompt.trim().length, `${gradeId}.mcq[${i}] empty prompt`).toBeGreaterThan(0);
        expect(m.explanationVi.trim().length, `${gradeId}.mcq[${i}] empty explanation`).toBeGreaterThan(0);
      });
    }
  });

  it('every reorder/listen entry is non-empty text', () => {
    for (const [gradeId, bank] of Object.entries(IOE_BANK)) {
      bank.reorder.forEach((s, i) => {
        expect(s.trim().length, `${gradeId}.reorder[${i}]`).toBeGreaterThan(5);
      });
      bank.listen.forEach((s, i) => {
        expect(s.trim().length, `${gradeId}.listen[${i}]`).toBeGreaterThan(2);
      });
    }
  });

  it('every makeWord target is buildable from its own chunks', () => {
    for (const [gradeId, bank] of Object.entries(IOE_BANK)) {
      bank.makeWord.forEach((m, i) => {
        // The word must appear as a subsequence of the shuffled chunk stream.
        const stream = m.chunks.join('');
        let pos = 0;
        for (const ch of m.word) {
          pos = stream.indexOf(ch, pos);
          expect(pos, `${gradeId}.makeWord[${i}] "${m.word}" not buildable from ${JSON.stringify(m.chunks)}`).toBeGreaterThanOrEqual(0);
          pos += 1;
        }
      });
    }
  });

  it('bank strings contain only markup the UI renders (whitelist: <u> only)', () => {
    // Any tag other than <u>/</u> would leak as raw text (CR-40 class of bug).
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    const bad: string[] = [];
    for (const { where, value } of allBankStrings()) {
      for (const match of value.matchAll(tagRe)) {
        if (match[1]!.toLowerCase() !== 'u') bad.push(`${where}: ${match[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('bank strings contain no serialization junk (undefined/null/NaN/object/braces)', () => {
    const bad: string[] = [];
    for (const { where, value } of allBankStrings()) {
      if (/\bundefined\b|\bnull\b|\bNaN\b|\[object |^\s*$|[{}]/.test(value)) bad.push(`${where}: ${value.slice(0, 60)}`);
    }
    expect(bad).toEqual([]);
  });

  it('every grade ships at least one item in each supported bank section it declares', () => {
    // A silently-empty section means the converter dropped everything
    // again - surface it as a failing test, not a sparse exam.
    for (const gradeId of GRADES) {
      const bank = IOE_BANK[gradeId]!;
      const total = bank.mcq.length + bank.reorder.length + bank.masked.length + bank.makeWord.length + bank.listen.length + bank.tf.length;
      expect(total, `${gradeId} bank is empty`).toBeGreaterThan(20);
    }
  });
});
