import { describe, expect, it } from 'vitest';
import { ROUND_1_QUESTION_COUNT, buildRound1Questions } from './round1ExtraLetter';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateExtraLetterQuestions } from '../generators/extraLetter';

describe('buildRound1Questions', () => {
  it('returns about 10 questions, all of kind extra-letter', () => {
    const questions = buildRound1Questions('seed-a');

    expect(questions).toHaveLength(ROUND_1_QUESTION_COUNT);
    expect(questions.every((q) => q.kind === 'extra-letter')).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    const first = buildRound1Questions('seed-fixed').map((q) => q.id);
    const second = buildRound1Questions('seed-fixed').map((q) => q.id);

    expect(first).toEqual(second);
  });

  it('varies its selection across different seeds (supports repeat batches without quick repetition)', () => {
    const a = buildRound1Questions('seed-a').map((q) => q.id);
    const b = buildRound1Questions('seed-b').map((q) => q.id);

    expect(a).not.toEqual(b);
  });

  it('draws from the whole vocabulary pool, not a single topic (multiple topicIds appear across seeds)', () => {
    const topicIds = new Set<string>();
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      for (const q of buildRound1Questions(seed)) {
        topicIds.add(q.topicId);
      }
    }

    expect(topicIds.size).toBeGreaterThan(1);
  });

  it('AC23: a single Round draw is spread across at least min(eligible topics, 8) distinct topics', () => {
    const eligibleTopics = new Set(generateExtraLetterQuestions([...ALL_WORDS]).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, 8);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(buildRound1Questions(seed).map((q) => q.topicId));
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC23: no single topic dominates a Round draw when many topics are eligible', () => {
    const eligibleTopics = new Set(generateExtraLetterQuestions([...ALL_WORDS]).map((q) => q.topicId));
    // With >= 10 eligible topics and 10 questions, the fair share per topic is 1.
    expect(eligibleTopics.size).toBeGreaterThanOrEqual(ROUND_1_QUESTION_COUNT);

    const counts = new Map<string, number>();
    for (const q of buildRound1Questions('dominance-check-seed')) {
      counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});
