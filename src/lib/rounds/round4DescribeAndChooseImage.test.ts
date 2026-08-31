import { describe, expect, it } from 'vitest';
import { ROUND_4_QUESTION_COUNT, buildRound4Questions } from './round4DescribeAndChooseImage';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateDescribeAndChooseImageQuestions } from '../generators/describeAndChooseImage';

describe('buildRound4Questions', () => {
  it('returns about 10 questions, all of kind describe-and-choose-image', () => {
    const questions = buildRound4Questions('seed-a');

    expect(questions).toHaveLength(ROUND_4_QUESTION_COUNT);
    expect(questions.every((q) => q.kind === 'describe-and-choose-image')).toBe(true);
  });

  it('every question has a valid descriptionType, 4 options and a non-empty explanation', () => {
    const questions = buildRound4Questions('seed-a');

    for (const q of questions) {
      expect(['count', 'negation']).toContain(q.descriptionType);
      expect(q.options).toHaveLength(4);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.sentence.length).toBeGreaterThan(0);
    }
  });

  it('every question has exactly one correct option (correctIndex within bounds)', () => {
    const questions = buildRound4Questions('seed-a');

    for (const q of questions) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      expect(q.options[q.correctIndex]).toBeDefined();
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

  it('AC23: a single Round draw is spread across at least min(eligible topics, 8) distinct topics', () => {
    const eligibleTopics = new Set(generateDescribeAndChooseImageQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, 8);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(buildRound4Questions(seed).map((q) => q.topicId));
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC23: no single topic dominates a Round draw when many topics are eligible', () => {
    const eligibleTopics = new Set(generateDescribeAndChooseImageQuestions(ALL_WORDS).map((q) => q.topicId));
    expect(eligibleTopics.size).toBeGreaterThanOrEqual(ROUND_4_QUESTION_COUNT);

    const counts = new Map<string, number>();
    for (const q of buildRound4Questions('dominance-check-seed')) {
      counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});
