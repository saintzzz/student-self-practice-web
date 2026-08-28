import { describe, expect, it } from 'vitest';
import { ROUND_1_QUESTION_COUNT, buildRound1Questions } from './round1ExtraLetter';

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
});
