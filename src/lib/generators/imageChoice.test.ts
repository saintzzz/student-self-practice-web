import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { ALL_WORDS } from '../../data/vocabulary';
import { generateImageChoiceQuestions } from './imageChoice';

const WORDS: VocabWord[] = [
  { id: 'cat', topicId: 't1', word: 'cat', emoji: '🐱', countable: true, explanation: 'e1' },
  { id: 'dog', topicId: 't1', word: 'dog', emoji: '🐶', countable: true, explanation: 'e2' },
  { id: 'fish', topicId: 't1', word: 'fish', emoji: '🐟', countable: true, explanation: 'e3' },
  { id: 'bird', topicId: 't1', word: 'bird', emoji: '🐦', countable: true, explanation: 'e4' },
  { id: 'rabbit', topicId: 't1', word: 'rabbit', emoji: '🐰', countable: true, explanation: 'e5' },
  { id: 'horse', topicId: 't1', word: 'horse', emoji: '🐴', countable: true, explanation: 'e6' },
];

describe('generateImageChoiceQuestions', () => {
  it('generates 3 variants per word with 4 distinct options each', () => {
    const questions = generateImageChoiceQuestions(WORDS);

    expect(questions).toHaveLength(WORDS.length * 3);
    for (const question of questions) {
      expect(new Set(question.options).size).toBe(4);
      expect(question.options[question.correctIndex]).toBeDefined();
    }
  });

  it('always includes the target word among the options at correctIndex', () => {
    const questions = generateImageChoiceQuestions(WORDS);

    for (const question of questions) {
      const word = WORDS.find((w) => w.emoji === question.emoji);
      expect(question.options[question.correctIndex]).toBe(word?.word);
    }
  });

  it('produces at least 2 different distractor sets across the 3 variants for a word', () => {
    const questions = generateImageChoiceQuestions(WORDS).filter((q) => q.emoji === '🐱');
    const distractorSets = questions.map((q) =>
      [...q.options].filter((_, i) => i !== q.correctIndex).sort().join(','),
    );

    expect(new Set(distractorSets).size).toBeGreaterThanOrEqual(2);
  });

  describe('AC-9.3 / BR-15: no second correct answer via shared emoji', () => {
    it('never offers a distractor whose word shares the target emoji, across the full bank', () => {
      // Round 1 builds image-choice from ALL_WORDS (cross-topic), so a
      // shared-emoji collision can come from different topics entirely.
      const byWordId = new Map(ALL_WORDS.map((w) => [w.id, w]));
      const byWordText = new Map(ALL_WORDS.map((w) => [w.word, w]));
      const questions = generateImageChoiceQuestions([...ALL_WORDS]);

      expect(questions.length).toBeGreaterThan(0);
      for (const q of questions) {
        // wordId is authoritative - duplicate word texts in the bank would
        // collapse a text-keyed lookup and let a real collision slip through.
        const target = byWordId.get(q.wordId);
        expect(target, `unknown target wordId "${q.wordId}"`).toBeDefined();
        expect(target!.word).toBe(q.options[q.correctIndex]!);
        for (let i = 0; i < q.options.length; i++) {
          if (i === q.correctIndex) continue;
          const distractor = byWordText.get(q.options[i]!);
          expect(
            distractor?.emoji,
            `question ${q.id}: distractor "${distractor?.word}" must not share target "${target!.word}"'s emoji ${target!.emoji}`,
          ).not.toBe(target!.emoji);
        }
      }
    });

    it('never puts sad and cry (both 😢, different topics) in the same question (regression)', () => {
      const sad = ALL_WORDS.find((w) => w.word === 'sad');
      const cry = ALL_WORDS.find((w) => w.word === 'cry');
      expect(sad?.emoji, 'fixture assumption: sad uses 😢').toBe('😢');
      expect(cry?.emoji, 'fixture assumption: cry uses 😢').toBe('😢');

      const questions = generateImageChoiceQuestions([...ALL_WORDS]);
      const sadTargets = questions.filter((q) => q.wordId === sad!.id);
      expect(sadTargets.length, 'no image-choice question targets "sad"').toBeGreaterThan(0);
      for (const q of sadTargets) {
        expect(
          q.options.includes('cry'),
          `question ${q.id}: "cry" is a second 😢-matching answer for prompt "sad"`,
        ).toBe(false);
      }
      // Reverse direction: cry as the target must never offer "sad".
      const cryTargets = questions.filter((q) => q.wordId === cry!.id);
      expect(cryTargets.length, 'no image-choice question targets "cry"').toBeGreaterThan(0);
      for (const q of cryTargets) {
        expect(
          q.options.includes('sad'),
          `question ${q.id}: "sad" is a second 😢-matching answer for prompt "cry"`,
        ).toBe(false);
      }
    });
  });
});
