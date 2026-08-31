import { describe, expect, it } from 'vitest';
import {
  ROUND_2_IMAGE_CHOICE_COUNT,
  ROUND_2_QUESTION_COUNT,
  ROUND_2_TYPING_COUNT,
  buildRound2Questions,
} from './round2ListeningSentence';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateListeningSentenceFillBlankQuestions } from '../generators/listeningSentenceFillBlank';
import { generateListeningImageChoiceQuestions } from '../generators/listeningImageChoice';

describe('buildRound2Questions', () => {
  it('returns about 10 questions, all of kind listening-sentence-fill-blank or listening-image-choice', () => {
    const questions = buildRound2Questions('seed-a');

    expect(questions).toHaveLength(ROUND_2_QUESTION_COUNT);
    expect(
      questions.every((q) => q.kind === 'listening-sentence-fill-blank' || q.kind === 'listening-image-choice'),
    ).toBe(true);
  });

  it('AC30: includes both listening-sentence-fill-blank and listening-image-choice in every draw', () => {
    for (const seed of ['s1', 's2', 's3', 's4', 's5']) {
      const questions = buildRound2Questions(seed);
      const kinds = new Set(questions.map((q) => q.kind));

      expect(kinds.has('listening-sentence-fill-blank')).toBe(true);
      expect(kinds.has('listening-image-choice')).toBe(true);
    }
  });

  it('splits the mix per the documented ratio (5 image-choice / 5 typing)', () => {
    const questions = buildRound2Questions('seed-ratio');

    const imageChoiceCount = questions.filter((q) => q.kind === 'listening-image-choice').length;
    const typingCount = questions.filter((q) => q.kind === 'listening-sentence-fill-blank').length;

    expect(imageChoiceCount).toBe(ROUND_2_IMAGE_CHOICE_COUNT);
    expect(typingCount).toBe(ROUND_2_TYPING_COUNT);
  });

  it('every listening-sentence-fill-blank question has a non-empty sentence, displaySentence and word', () => {
    const questions = buildRound2Questions('seed-a').filter((q) => q.kind === 'listening-sentence-fill-blank');

    for (const q of questions) {
      expect(q.sentence.length).toBeGreaterThan(0);
      expect(q.displaySentence).toContain('___');
      expect(q.word.length).toBeGreaterThan(0);
    }
  });

  it('every listening-image-choice question has a word and 4 distinct emoji options', () => {
    const questions = buildRound2Questions('seed-a').filter((q) => q.kind === 'listening-image-choice');

    for (const q of questions) {
      expect(q.word.length).toBeGreaterThan(0);
      expect(new Set(q.options).size).toBe(4);
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

  it('does not always order the two kinds as two fixed blocks (kinds interleave across seeds)', () => {
    const orderings = ['s1', 's2', 's3', 's4', 's5'].map((seed) =>
      buildRound2Questions(seed).map((q) => q.kind),
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
        buildRound2Questions(seed)
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
        buildRound2Questions(seed)
          .filter((q) => q.kind === 'listening-image-choice')
          .map((q) => q.topicId),
      );
      expect(topicIds.size).toBeGreaterThanOrEqual(minExpected);
    }
  });
});
