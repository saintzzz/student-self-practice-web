import { describe, expect, it } from 'vitest';
import { buildRound2Questions } from './round2ListeningSentence';
import { validateGapBank } from './gapBankValidator';
import { getWordsByGrade } from '../../data/vocabulary';

/**
 * CR-82 (DESIGN-SPEC-v5 s13.5 step 6 - coverage gate): sweeps fixed
 * seeds through the G1-2 Round 2 builder, asserts EVERY offered bank
 * passed the validator and holds exactly 3 distinct options, and
 * reports the eligible share for the design gate (no minimum share is
 * required - Spell-it carries the CR-82 drag acceptance, R-v5-08).
 */
const SEEDS = ['cov-1', 'cov-2', 'cov-3', 'cov-4', 'cov-5', 'cov-6', 'cov-7', 'cov-8'];

describe('gap bank coverage sweep (s13.5 item 6)', () => {
  for (const gradeId of ['grade-1', 'grade-2'] as const) {
    it(`${gradeId}: every offered bank is validator-clean with 3 distinct options`, () => {
      const pool = getWordsByGrade(gradeId);
      let sentenceItems = 0;
      let bankedItems = 0;

      for (const seed of SEEDS) {
        const questions = buildRound2Questions(seed, pool, { gradeId });
        for (const q of questions) {
          if (q.kind !== 'listening-sentence-fill-blank') continue;
          sentenceItems += 1;
          if (!q.bank) continue;
          bankedItems += 1;

          expect(new Set(q.bank.options).size, `${q.id}: bank must hold 3 distinct options`).toBe(3);
          expect(q.bank.options, `${q.id}: bank must contain the answer`).toContain(q.word);
          expect(new Set(q.bank.optionWordIds).size).toBe(3);

          const answer = pool.find((w) => w.id === q.wordId);
          expect(answer, `${q.id}: wordId must resolve in the grade pool`).toBeDefined();
          const distractors = q.bank.optionWordIds
            .filter((id) => id !== q.wordId)
            .map((id) => pool.find((w) => w.id === id));
          expect(distractors.every((d) => d !== undefined)).toBe(true);

          const verdict = validateGapBank({
            question: q,
            answer: answer!,
            distractors: distractors as never,
            audio: 'sentence',
          });
          expect(verdict.eligible, `${q.id}: ${verdict.reasons.join('; ')}`).toBe(true);
        }
      }

      /* Report the eligible share for the design gate (spec s13.5 item
         6) - informational, no minimum required. */
      console.info(
        `[gap-bank coverage] ${gradeId}: ${bankedItems}/${sentenceItems} sentence items offered a bank ` +
          `(${sentenceItems === 0 ? '0' : Math.round((bankedItems / sentenceItems) * 100)}%)`,
      );
      expect(sentenceItems).toBeGreaterThan(0);
    });
  }
});
