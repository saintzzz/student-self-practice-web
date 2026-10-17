import { describe, expect, it } from 'vitest';
import {
  ROUND_1_EXTRA_LETTER_COUNT,
  ROUND_1_G12_EXTRA_LETTER_COUNT,
  ROUND_1_G12_IMAGE_CHOICE_COUNT,
  ROUND_1_G12_TRACING_COUNT,
  ROUND_1_G12_TRACING_INDICES,
  ROUND_1_IMAGE_CHOICE_COUNT,
  ROUND_1_QUESTION_COUNT,
  buildRound1Questions,
} from './round1ExtraLetter';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateExtraLetterQuestions } from '../generators/extraLetter';
import { generateImageChoiceQuestions } from '../generators/imageChoice';

describe('buildRound1Questions', () => {
  it('AC-9.1: returns 10 questions - 7 extra-letter + 3 image-choice, seeded-shuffled', () => {
    const questions = buildRound1Questions('seed-a', ALL_WORDS);

    expect(questions).toHaveLength(ROUND_1_QUESTION_COUNT);
    expect(questions.filter((q) => q.kind === 'extra-letter')).toHaveLength(ROUND_1_EXTRA_LETTER_COUNT);
    expect(questions.filter((q) => q.kind === 'image-choice')).toHaveLength(ROUND_1_IMAGE_CHOICE_COUNT);
  });

  it('AC-9.1: image-choice lands at varying positions across seeds, including position 1', () => {
    // PRD amendment A-12: AC-9.1 scans s1..s40 (widened from s1..s20 - the
    // seeded shuffle never places an image-choice at index 0 within the
    // original range; s24 and s33 do).
    const positions = new Set<number>();
    for (let i = 1; i <= 40; i++) {
      const questions = buildRound1Questions(`s${i}`, ALL_WORDS);
      questions.forEach((q, index) => {
        if (q.kind === 'image-choice') {
          positions.add(index);
        }
      });
    }

    expect(positions.size).toBeGreaterThan(1);
    expect(positions.has(0)).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const first = buildRound1Questions('seed-fixed', ALL_WORDS).map((q) => q.id);
    const second = buildRound1Questions('seed-fixed', ALL_WORDS).map((q) => q.id);

    expect(first).toEqual(second);
  });

  it('varies its selection across different seeds (supports repeat batches without quick repetition)', () => {
    const a = buildRound1Questions('seed-a', ALL_WORDS).map((q) => q.id);
    const b = buildRound1Questions('seed-b', ALL_WORDS).map((q) => q.id);

    expect(a).not.toEqual(b);
  });

  it('draws from the whole vocabulary pool, not a single topic (multiple topicIds appear across seeds)', () => {
    const topicIds = new Set<string>();
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      for (const q of buildRound1Questions(seed, ALL_WORDS)) {
        topicIds.add(q.topicId);
      }
    }

    expect(topicIds.size).toBeGreaterThan(1);
  });

  it('AC-9.2/AC23: each kind slice is stratified - extra-letter draw spreads across topics', () => {
    const eligibleTopics = new Set(generateExtraLetterQuestions([...ALL_WORDS]).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_1_EXTRA_LETTER_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound1Questions(seed, ALL_WORDS)
          .filter((q) => q.kind === 'extra-letter')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC-9.2/AC23: image-choice slice is stratified across topics too', () => {
    const eligibleTopics = new Set(generateImageChoiceQuestions([...ALL_WORDS]).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_1_IMAGE_CHOICE_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound1Questions(seed, ALL_WORDS)
          .filter((q) => q.kind === 'image-choice')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC-9.2: no single topic dominates a Round draw when many topics are eligible', () => {
    const eligibleTopics = new Set(generateExtraLetterQuestions([...ALL_WORDS]).map((q) => q.topicId));
    // With >= 10 eligible topics and 10 questions, the fair share per topic is 1.
    expect(eligibleTopics.size).toBeGreaterThanOrEqual(ROUND_1_QUESTION_COUNT);

    const counts = new Map<string, number>();
    for (const q of buildRound1Questions('dominance-check-seed', ALL_WORDS)) {
      counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      // Both slices contribute at most 1 each, so a topic may appear up to 2
      // times total (once per slice) - still far from domination.
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  /* ---------- CR-82 (ARCHITECTURE-v5 D-01): G1-2 tracing composition ---------- */

  it('D-01: G1-2 draws 6 extra-letter + 2 image-choice + 2 letter-tracing at indices 3 and 7', () => {
    for (const gradeId of ['grade-1', 'grade-2']) {
      for (const seed of ['s1', 's7', 's19']) {
        const questions = buildRound1Questions(seed, ALL_WORDS, { gradeId });
        expect(questions).toHaveLength(ROUND_1_QUESTION_COUNT);
        expect(questions.filter((q) => q.kind === 'extra-letter')).toHaveLength(
          ROUND_1_G12_EXTRA_LETTER_COUNT,
        );
        expect(questions.filter((q) => q.kind === 'image-choice')).toHaveLength(
          ROUND_1_G12_IMAGE_CHOICE_COUNT,
        );
        const tracing = questions.filter((q) => q.kind === 'letter-tracing');
        expect(tracing).toHaveLength(ROUND_1_G12_TRACING_COUNT);
        /* Fixed positions after the seeded shuffle - never question 1. */
        expect(questions[ROUND_1_G12_TRACING_INDICES[0]!]?.kind).toBe('letter-tracing');
        expect(questions[ROUND_1_G12_TRACING_INDICES[1]!]?.kind).toBe('letter-tracing');
      }
    }
  });

  it('D-02/D-04: tracing items are lowercase a-z with a pool example word and the right grade baked in', () => {
    const wordIds = new Set(ALL_WORDS.map((w) => w.id));
    for (const [gradeId, grade] of [['grade-1', 1], ['grade-2', 2]] as const) {
      const questions = buildRound1Questions('seed-a', ALL_WORDS, { gradeId });
      for (const q of questions.filter((q) => q.kind === 'letter-tracing')) {
        if (q.kind !== 'letter-tracing') continue;
        expect(q.letter).toMatch(/^[a-z]$/);
        expect(wordIds.has(q.exampleWordId)).toBe(true);
        expect(q.grade).toBe(grade);
      }
    }
  });

  it('D-04: G3-5 and no-ctx calls keep the legacy 7/3 mix with zero tracing', () => {
    for (const ctx of [undefined, { gradeId: 'grade-3' }, { gradeId: 'grade-5' }]) {
      const questions = buildRound1Questions('seed-a', ALL_WORDS, ctx);
      expect(questions.filter((q) => q.kind === 'letter-tracing')).toHaveLength(0);
      expect(questions.filter((q) => q.kind === 'extra-letter')).toHaveLength(
        ROUND_1_EXTRA_LETTER_COUNT,
      );
    }
  });

  it('D-01 backfill: a pool with fewer than 2 traceable letters still returns a full Round', () => {
    /* Only 'a' exhibits - one tracing slot backfills with extra-letter. */
    const thin = ALL_WORDS.filter((w) => w.word.trim().charAt(0).toLowerCase() === 'a');
    const questions = buildRound1Questions('seed-a', thin, { gradeId: 'grade-1' });
    const tracing = questions.filter((q) => q.kind === 'letter-tracing');
    expect(tracing.length).toBeLessThanOrEqual(1);
    if (tracing.length === 1) {
      /* Its slot is index 3 and the rest is backfilled, never short. */
      expect(questions[ROUND_1_G12_TRACING_INDICES[0]!]?.kind).toBe('letter-tracing');
    }
  });
});
