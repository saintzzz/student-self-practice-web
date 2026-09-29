import { describe, expect, it } from 'vitest';
import {
  ROUND_4_DESCRIBE_COUNT,
  ROUND_4_PAIR_MATCHING_COUNT,
  ROUND_4_PHONICS_FINAL_COUNT,
  ROUND_4_PHONICS_SOUND_COUNT,
  ROUND_4_PHONICS_WORD_COUNT,
  ROUND_4_QUESTION_COUNT,
  buildRound4Questions,
} from './round4DescribeAndChooseImage';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateDescribeAndChooseImageQuestions } from '../generators/describeAndChooseImage';
import { generatePicturePairMatchingBoards } from '../generators/picturePairMatching';
import {
  generatePhonicsSoundChoiceQuestions,
  generatePhonicsWordChoiceQuestions,
} from '../generators/phonics';

const ROUND4_KINDS = [
  'describe-and-choose-image',
  'picture-pair-matching',
  'phonics-sound-choice',
  'phonics-word-choice',
  'phonics-final-choice',
  'phonics-blend-choice',
  'phonics-rhyme-choice',
] as const;

/** Kinds guaranteed in every Round 4 draw under the CR-06 composition. */
const ALWAYS_PRESENT_KINDS = [
  'describe-and-choose-image',
  'picture-pair-matching',
  'phonics-sound-choice',
  'phonics-word-choice',
  'phonics-final-choice',
] as const;

describe('buildRound4Questions', () => {
  it('returns about 10 questions, all of a Round 4 kind', () => {
    const questions = buildRound4Questions('seed-a', ALL_WORDS);

    expect(questions).toHaveLength(ROUND_4_QUESTION_COUNT);
    expect(questions.every((q) => (ROUND4_KINDS as readonly string[]).includes(q.kind))).toBe(true);
  });

  it('AC31 + CR-06: includes every always-present kind plus exactly one alternating blend/rhyme slot in every draw', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const questions = buildRound4Questions(seed, ALL_WORDS);
      const kinds = new Set(questions.map((q) => q.kind));

      for (const kind of ALWAYS_PRESENT_KINDS) {
        expect(kinds.has(kind), `seed ${seed} must include ${kind}`).toBe(true);
      }
      const alternating =
        (kinds.has('phonics-blend-choice') ? 1 : 0) + (kinds.has('phonics-rhyme-choice') ? 1 : 0);
      expect(alternating, `seed ${seed} must include exactly one of blend/rhyme`).toBe(1);
    }
  });

  it('CR-06: both blend and rhyme appear across seeds (seed-parity alternation, never starved)', () => {
    const seen = new Set<string>();
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']) {
      for (const q of buildRound4Questions(seed, ALL_WORDS)) {
        if (q.kind === 'phonics-blend-choice' || q.kind === 'phonics-rhyme-choice') {
          seen.add(q.kind);
        }
      }
    }
    expect(seen).toEqual(new Set(['phonics-blend-choice', 'phonics-rhyme-choice']));
  });

  it('splits the mix per the documented ratio (3 describe / 3 pair-matching / 1 sound / 1 word / 1 final / 1 blend-or-rhyme)', () => {
    const questions = buildRound4Questions('seed-ratio', ALL_WORDS);

    const count = (kind: string) => questions.filter((q) => q.kind === kind).length;
    expect(count('describe-and-choose-image')).toBe(ROUND_4_DESCRIBE_COUNT);
    expect(count('picture-pair-matching')).toBe(ROUND_4_PAIR_MATCHING_COUNT);
    expect(count('phonics-sound-choice')).toBe(ROUND_4_PHONICS_SOUND_COUNT);
    expect(count('phonics-word-choice')).toBe(ROUND_4_PHONICS_WORD_COUNT);
    expect(count('phonics-final-choice')).toBe(ROUND_4_PHONICS_FINAL_COUNT);
    expect(count('phonics-blend-choice') + count('phonics-rhyme-choice')).toBe(1);
  });

  it('every describe-and-choose-image question has a valid descriptionType, 4 options and a non-empty explanation', () => {
    const questions = buildRound4Questions('seed-a', ALL_WORDS).filter((q) => q.kind === 'describe-and-choose-image');

    for (const q of questions) {
      expect(['count', 'negation']).toContain(q.descriptionType);
      expect(q.options).toHaveLength(4);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.sentence.length).toBeGreaterThan(0);
    }
  });

  it('every describe-and-choose-image question has exactly one correct option (correctIndex within bounds)', () => {
    const questions = buildRound4Questions('seed-a', ALL_WORDS).filter((q) => q.kind === 'describe-and-choose-image');

    for (const q of questions) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      expect(q.options[q.correctIndex]).toBeDefined();
    }
  });

  it('every picture-pair-matching board has exactly 4 pairs and 8 tiles (AC32)', () => {
    const questions = buildRound4Questions('seed-a', ALL_WORDS).filter((q) => q.kind === 'picture-pair-matching');

    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.pairs).toHaveLength(4);
      expect(q.tiles).toHaveLength(8);
    }
  });

  it('is deterministic for the same seed', () => {
    const first = buildRound4Questions('seed-fixed', ALL_WORDS).map((q) => q.id);
    const second = buildRound4Questions('seed-fixed', ALL_WORDS).map((q) => q.id);

    expect(first).toEqual(second);
  });

  it('varies its selection across different seeds (supports repeat batches without quick repetition)', () => {
    const a = buildRound4Questions('seed-a', ALL_WORDS).map((q) => q.id);
    const b = buildRound4Questions('seed-b', ALL_WORDS).map((q) => q.id);

    expect(a).not.toEqual(b);
  });

  it('AC23: the describe-and-choose-image slice is spread across at least min(eligible topics, slice size) distinct topics', () => {
    const eligibleTopics = new Set(generateDescribeAndChooseImageQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_4_DESCRIBE_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound4Questions(seed, ALL_WORDS)
          .filter((q) => q.kind === 'describe-and-choose-image')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC23: the pair-matching slice is spread across at least min(eligible topics, slice size) distinct topics', () => {
    const eligibleTopics = new Set(generatePicturePairMatchingBoards(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_4_PAIR_MATCHING_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound4Questions(seed, ALL_WORDS)
          .filter((q) => q.kind === 'picture-pair-matching')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC23: the phonics-sound-choice slice is spread across at least min(eligible topics, slice size) distinct topics', () => {
    const eligibleTopics = new Set(generatePhonicsSoundChoiceQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_4_PHONICS_SOUND_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound4Questions(seed, ALL_WORDS)
          .filter((q) => q.kind === 'phonics-sound-choice')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC23: the phonics-word-choice slice is spread across at least min(eligible topics, slice size) distinct topics', () => {
    const eligibleTopics = new Set(generatePhonicsWordChoiceQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_4_PHONICS_WORD_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound4Questions(seed, ALL_WORDS)
          .filter((q) => q.kind === 'phonics-word-choice')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });
});
