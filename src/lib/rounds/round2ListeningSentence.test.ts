import { describe, expect, it } from 'vitest';
import {
  ROUND_2_G12_IMAGE_CHOICE_COUNT,
  ROUND_2_G12_SENTENCE_COUNT,
  ROUND_2_G12_SPELL_COUNT,
  ROUND_2_IMAGE_CHOICE_COUNT,
  ROUND_2_QUESTION_COUNT,
  ROUND_2_TYPING_COUNT,
  buildRound2Questions,
} from './round2ListeningSentence';
import { ALL_WORDS, getWordsByGrade } from '../../data/vocabulary';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';
import { generateListeningImageChoiceQuestions } from '../generators/listeningImageChoice';
import { spellEligibility } from './spellEligibility';
import { validateGapBank } from './gapBankValidator';

describe('buildRound2Questions', () => {
  it('returns about 10 questions, all of kind listening-sentence-fill-blank or listening-image-choice', () => {
    const questions = buildRound2Questions('seed-a', ALL_WORDS);

    expect(questions).toHaveLength(ROUND_2_QUESTION_COUNT);
    expect(
      questions.every((q) => q.kind === 'listening-sentence-fill-blank' || q.kind === 'listening-image-choice'),
    ).toBe(true);
  });

  it('AC30: includes both listening-sentence-fill-blank and listening-image-choice in every draw', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const questions = buildRound2Questions(seed, ALL_WORDS);
      const kinds = new Set(questions.map((q) => q.kind));

      expect(kinds.has('listening-sentence-fill-blank')).toBe(true);
      expect(kinds.has('listening-image-choice')).toBe(true);
    }
  });

  it('splits the mix per the documented ratio (5 image-choice / 5 typing)', () => {
    const questions = buildRound2Questions('seed-ratio', ALL_WORDS);

    const imageChoiceCount = questions.filter((q) => q.kind === 'listening-image-choice').length;
    const typingCount = questions.filter((q) => q.kind === 'listening-sentence-fill-blank').length;

    expect(imageChoiceCount).toBe(ROUND_2_IMAGE_CHOICE_COUNT);
    expect(typingCount).toBe(ROUND_2_TYPING_COUNT);
  });

  it('every listening-sentence-fill-blank question has a non-empty sentence, displaySentence and word', () => {
    const questions = buildRound2Questions('seed-a', ALL_WORDS).filter((q) => q.kind === 'listening-sentence-fill-blank');

    for (const q of questions) {
      expect(q.sentence.length).toBeGreaterThan(0);
      expect(q.displaySentence).toContain('___');
      expect(q.word.length).toBeGreaterThan(0);
    }
  });

  it('every listening-image-choice question has a word and 4 distinct emoji options', () => {
    const questions = buildRound2Questions('seed-a', ALL_WORDS).filter((q) => q.kind === 'listening-image-choice');

    for (const q of questions) {
      expect(q.word.length).toBeGreaterThan(0);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it('is deterministic for the same seed', () => {
    const first = buildRound2Questions('seed-fixed', ALL_WORDS).map((q) => q.id);
    const second = buildRound2Questions('seed-fixed', ALL_WORDS).map((q) => q.id);

    expect(first).toEqual(second);
  });

  it('varies its selection across different seeds (supports repeat batches without quick repetition)', () => {
    const a = buildRound2Questions('seed-a', ALL_WORDS).map((q) => q.id);
    const b = buildRound2Questions('seed-b', ALL_WORDS).map((q) => q.id);

    expect(a).not.toEqual(b);
  });

  it('does not always order the two kinds as two fixed blocks (kinds interleave across seeds)', () => {
    const orderings = ['s1', 's2', 's3', 's4', 's5'].map((seed) =>
      buildRound2Questions(seed, ALL_WORDS).map((q) => q.kind),
    );
    const isTwoBlocks = (kinds: string[]) => {
      const firstKind = kinds[0];
      const switchIndex = kinds.findIndex((k) => k !== firstKind);
      if (switchIndex === -1) return true;
      return kinds.slice(switchIndex).every((k) => k !== firstKind);
    };

    expect(orderings.every(isTwoBlocks)).toBe(false);
  });

  it('AC23: the typing slice is spread across at least min(eligible topics, slice size) distinct topics', () => {
    const eligibleTopics = new Set(generateListeningSentenceFillBlankQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_2_TYPING_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound2Questions(seed, ALL_WORDS)
          .filter((q) => q.kind === 'listening-sentence-fill-blank')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC23: the image-choice slice is spread across at least min(eligible topics, 5) distinct topics', () => {
    const eligibleTopics = new Set(generateListeningImageChoiceQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_2_IMAGE_CHOICE_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound2Questions(seed, ALL_WORDS)
          .filter((q) => q.kind === 'listening-image-choice')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  /* ---------- CR-82 D-01 B: the G1-2 composition ---------- */

  describe('G1-2 composition (CR-82 D-01)', () => {
    for (const gradeId of ['grade-1', 'grade-2'] as const) {
      const grade = gradeId === 'grade-1' ? 1 : 2;
      const pool = getWordsByGrade(gradeId);

      it(`${gradeId}: exactly ${ROUND_2_G12_IMAGE_CHOICE_COUNT} image-choice + ${ROUND_2_G12_SENTENCE_COUNT} sentence + ${ROUND_2_G12_SPELL_COUNT} spell-it items`, () => {
        const questions = buildRound2Questions('g12-seed', pool, { gradeId });
        expect(questions).toHaveLength(ROUND_2_QUESTION_COUNT);

        const counts = { img: 0, sentence: 0, spell: 0 };
        for (const q of questions) {
          if (q.kind === 'listening-image-choice') counts.img += 1;
          else if (q.kind === 'listening-sentence-fill-blank') counts.sentence += 1;
          else if (q.kind === 'listening-fill-blank') counts.spell += 1;
          /* Round2Question's union is exhaustive - a fourth kind is a
             compile error, not a runtime surprise. */
        }
        expect(counts).toEqual({
          img: ROUND_2_G12_IMAGE_CHOICE_COUNT,
          sentence: ROUND_2_G12_SENTENCE_COUNT,
          spell: ROUND_2_G12_SPELL_COUNT,
        });
      });

      it(`${gradeId}: every Spell-it item carries seeded tiles and passes spellEligibility`, () => {
        const questions = buildRound2Questions('g12-seed', pool, { gradeId });
        const spellItems = questions.filter((q) => q.kind === 'listening-fill-blank');
        for (const q of spellItems) {
          if (q.kind !== 'listening-fill-blank') throw new Error('narrowing');
          expect(spellEligibility(q.word, grade).eligible).toBe(true);
          expect(q.spell).toBeDefined();
          expect(q.spell!.tiles.length).toBeGreaterThan(q.word.length);
          /* Tiles hold every word letter exactly once. */
          const letters = q.spell!.tiles.map((t) => t.letter).sort();
          const distractors = q.spell!.tiles.filter((t) => t.id.includes('-d')).map((t) => t.letter);
          expect(letters).toEqual([...q.word].sort().concat(distractors).sort());
        }
      });

      it(`${gradeId}: every offered sentence bank passed the validator and has 3 distinct options`, () => {
        for (const seed of ['gs1', 'gs2', 'gs3']) {
          const questions = buildRound2Questions(seed, pool, { gradeId });
          for (const q of questions) {
            if (q.kind !== 'listening-sentence-fill-blank' || !q.bank) continue;
            expect(new Set(q.bank.options).size).toBe(3);
            expect(q.bank.options).toContain(q.word);
            const answer = pool.find((w) => w.id === q.wordId);
            const distractors = q.bank.optionWordIds
              .filter((id) => id !== q.wordId)
              .map((id) => pool.find((w) => w.id === id)!);
            const verdict = validateGapBank({ question: q, answer: answer!, distractors, audio: 'sentence' });
            expect(verdict.eligible, `${q.id}: ${verdict.reasons.join('; ')}`).toBe(true);
          }
        }
      });
    }

    it('G3-5 / no ctx: the mix and payloads are unchanged (no spell, no bank)', () => {
      for (const ctx of [undefined, { gradeId: 'grade-3' }]) {
        const questions = buildRound2Questions('g345-seed', getWordsByGrade('grade-3'), ctx);
        for (const q of questions) {
          expect(q.kind).not.toBe('listening-fill-blank');
          if (q.kind === 'listening-sentence-fill-blank') expect(q.bank).toBeUndefined();
        }
      }
    });

    it('G1-2 kind mix is deterministic per seed', () => {
      const pool = getWordsByGrade('grade-1');
      const a = buildRound2Questions('det-seed', pool, { gradeId: 'grade-1' }).map((q) => q.id);
      const b = buildRound2Questions('det-seed', pool, { gradeId: 'grade-1' }).map((q) => q.id);
      expect(a).toEqual(b);
    });
  });
});
