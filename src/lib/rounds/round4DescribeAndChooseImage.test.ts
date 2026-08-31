import { describe, expect, it } from 'vitest';
import {
  ROUND_4_DESCRIBE_COUNT,
  ROUND_4_PAIR_MATCHING_COUNT,
  ROUND_4_QUESTION_COUNT,
  buildRound4Questions,
} from './round4DescribeAndChooseImage';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateDescribeAndChooseImageQuestions } from '../generators/describeAndChooseImage';
import { generatePicturePairMatchingBoards } from '../generators/picturePairMatching';

describe('buildRound4Questions', () => {
  it('returns about 10 questions, all of kind describe-and-choose-image or picture-pair-matching', () => {
    const questions = buildRound4Questions('seed-a');

    expect(questions).toHaveLength(ROUND_4_QUESTION_COUNT);
    expect(
      questions.every((q) => q.kind === 'describe-and-choose-image' || q.kind === 'picture-pair-matching'),
    ).toBe(true);
  });

  it('AC31: includes both describe-and-choose-image and picture-pair-matching in every draw', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const questions = buildRound4Questions(seed);
      const kinds = new Set(questions.map((q) => q.kind));

      expect(kinds.has('describe-and-choose-image')).toBe(true);
      expect(kinds.has('picture-pair-matching')).toBe(true);
    }
  });

  it('splits the mix per the documented ratio (3 pair-matching boards / 7 describe-and-choose-image)', () => {
    const questions = buildRound4Questions('seed-ratio');

    const pairMatchingCount = questions.filter((q) => q.kind === 'picture-pair-matching').length;
    const describeCount = questions.filter((q) => q.kind === 'describe-and-choose-image').length;

    expect(pairMatchingCount).toBe(ROUND_4_PAIR_MATCHING_COUNT);
    expect(describeCount).toBe(ROUND_4_DESCRIBE_COUNT);
  });

  it('every describe-and-choose-image question has a valid descriptionType, 4 options and a non-empty explanation', () => {
    const questions = buildRound4Questions('seed-a').filter((q) => q.kind === 'describe-and-choose-image');

    for (const q of questions) {
      expect(['count', 'negation']).toContain(q.descriptionType);
      expect(q.options).toHaveLength(4);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.sentence.length).toBeGreaterThan(0);
    }
  });

  it('every describe-and-choose-image question has exactly one correct option (correctIndex within bounds)', () => {
    const questions = buildRound4Questions('seed-a').filter((q) => q.kind === 'describe-and-choose-image');

    for (const q of questions) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      expect(q.options[q.correctIndex]).toBeDefined();
    }
  });

  it('every picture-pair-matching board has exactly 4 pairs and 8 tiles (AC32)', () => {
    const questions = buildRound4Questions('seed-a').filter((q) => q.kind === 'picture-pair-matching');

    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.pairs).toHaveLength(4);
      expect(q.tiles).toHaveLength(8);
    }
  });

  it('is deterministic for the same seed', () => {
    const first = buildRound4Questions('seed-fixed').map((q) => q.id);
    const second = buildRound4Questions('seed-fixed').map((q) => q.id);

    expect(first).toEqual(second);
  });

  it('varies its selection across different seeds (supports repeat batches without quick repetition)', () => {
    const a = buildRound4Questions('seed-a').map((q) => q.id);
    const b = buildRound4Questions('seed-b').map((q) => q.id);

    expect(a).not.toEqual(b);
  });

  it('AC23: the describe-and-choose-image slice is spread across at least min(eligible topics, slice size) distinct topics', () => {
    const eligibleTopics = new Set(generateDescribeAndChooseImageQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, ROUND_4_DESCRIBE_COUNT);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(
        buildRound4Questions(seed)
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
        buildRound4Questions(seed)
          .filter((q) => q.kind === 'picture-pair-matching')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });
});
