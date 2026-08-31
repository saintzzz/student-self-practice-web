import { describe, expect, it } from 'vitest';
import { ROUND_2_QUESTION_COUNT, buildRound2Questions } from './round2ListeningSentence';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';

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

  it('AC23: a single Round draw is spread across at least min(eligible topics, 8) distinct topics', () => {
    const eligibleTopics = new Set(generateListeningSentenceFillBlankQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, 8);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(buildRound2Questions(seed).map((q) => q.topicId));
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC23: no single topic dominates a Round draw when many topics are eligible', () => {
    const eligibleTopics = new Set(generateListeningSentenceFillBlankQuestions(ALL_WORDS).map((q) => q.topicId));
    // With >= 10 eligible topics and 10 questions, the fair share per topic is 1.
    expect(eligibleTopics.size).toBeGreaterThanOrEqual(ROUND_2_QUESTION_COUNT);

    const counts = new Map<string, number>();
    for (const q of buildRound2Questions('dominance-check-seed')) {
      counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});
