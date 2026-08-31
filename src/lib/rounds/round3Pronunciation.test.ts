import { describe, expect, it } from 'vitest';
import { ROUND_3_QUESTION_COUNT, buildRound3Questions } from './round3Pronunciation';
import { ALL_WORDS } from '../../data/vocabulary';
import { generatePronunciationRecordingQuestions } from '../generators/pronunciationRecording';

describe('buildRound3Questions', () => {
  it('returns about 10 questions, all of kind pronunciation-recording', () => {
    const questions = buildRound3Questions('seed-a');

    expect(questions).toHaveLength(ROUND_3_QUESTION_COUNT);
    expect(questions.every((q) => q.kind === 'pronunciation-recording')).toBe(true);
  });

  it('every question has a non-empty word and explanation', () => {
    const questions = buildRound3Questions('seed-a');

    for (const q of questions) {
      expect(q.word.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic for the same seed', () => {
    const first = buildRound3Questions('seed-fixed').map((q) => q.id);
    const second = buildRound3Questions('seed-fixed').map((q) => q.id);

    expect(first).toEqual(second);
  });

  it('varies its selection across different seeds (supports repeat batches without quick repetition)', () => {
    const a = buildRound3Questions('seed-a').map((q) => q.id);
    const b = buildRound3Questions('seed-b').map((q) => q.id);

    expect(a).not.toEqual(b);
  });

  it('AC23: a single Round draw is spread across at least min(eligible topics, 8) distinct topics', () => {
    const eligibleTopics = new Set(generatePronunciationRecordingQuestions(ALL_WORDS).map((q) => q.topicId));
    const minExpected = Math.min(eligibleTopics.size, 8);

    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const topicIds = new Set(buildRound3Questions(seed).map((q) => q.topicId));
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });

  it('AC23: no single topic dominates a Round draw when many topics are eligible', () => {
    const eligibleTopics = new Set(generatePronunciationRecordingQuestions(ALL_WORDS).map((q) => q.topicId));
    // With >= 10 eligible topics and 10 questions, the fair share per topic is 1.
    expect(eligibleTopics.size).toBeGreaterThanOrEqual(ROUND_3_QUESTION_COUNT);

    const counts = new Map<string, number>();
    for (const q of buildRound3Questions('dominance-check-seed')) {
      counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});
