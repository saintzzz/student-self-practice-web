import { describe, expect, it } from 'vitest';
import { ROUND_2_QUESTION_COUNT, buildRound2Questions } from './round2ListeningSentence';

describe('buildRound2Questions', () => {
  it('returns about 10 questions, all of kind listening-sentence-fill-blank', () => {
    const questions = buildRound2Questions('seed-a');

    expect(questions).toHaveLength(ROUND_2_QUESTION_COUNT);
    expect(questions.every((q) => q.kind === 'listening-sentence-fill-blank')).toBe(true);
  });

  it('every question has a non-empty sentence, displaySentence and word', () => {
    const questions = buildRound2Questions('seed-a');

    for (const q of questions) {
      expect(q.sentence.length).toBeGreaterThan(0);
      expect(q.displaySentence).toContain('___');
      expect(q.word.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for the same seed', () => {
    const first = buildRound2Questions('seed-fixed').map((q) => q.id);
    const second = buildRound2Questions('seed-fixed').map((q) => q.id);

    expect(first).toEqual(second);
  });

  it('varies its selection across different seeds (supports repeat batches without quick repetition)', () => {
    const a = buildRound2Questions('seed-a').map((q) => q.id);
    const b = buildRound2Questions('seed-b').map((q) => q.id);

    expect(a).not.toEqual(b);
  });
});
