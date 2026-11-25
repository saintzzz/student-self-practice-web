import { describe, expect, it } from 'vitest';
import type { VocabWord } from '../../types';
import { blankOutWord, generateListeningSentenceFillBlankQuestions, sentencesForWord } from './listeningSentenceFillBlank';

const ACTIONS_TOPIC_ID = 'g2-actions';

const COUNTABLE_WORD: VocabWord = {
  id: 'cat',
  topicId: 't-animals',
  word: 'cat',
  plural: 'cats',
  emoji: '🐱',
  countable: true,
  explanation: 'Con mèo tiếng Anh là "cat".',
};

const VOWEL_INITIAL_WORD: VocabWord = {
  id: 'elephant',
  topicId: 't-animals',
  word: 'elephant',
  plural: 'elephants',
  emoji: '🐘',
  countable: true,
  explanation: 'Con voi tiếng Anh là "elephant".',
};

const UNCOUNTABLE_WORD: VocabWord = {
  id: 'red',
  topicId: 't-colors',
  word: 'red',
  emoji: '🔴',
  countable: false,
  explanation: 'Màu đỏ tiếng Anh là "red".',
};

const ACTION_WORD: VocabWord = {
  id: 'run',
  topicId: ACTIONS_TOPIC_ID,
  word: 'run',
  emoji: '🏃',
  countable: false,
  explanation: 'Chạy tiếng Anh là "run".',
};

describe('blankOutWord', () => {
  it('replaces the target word with a blank, case-insensitively', () => {
    expect(blankOutWord('I have a cat.', 'cat')).toBe('I have a ___.');
  });

  it('matches whole words only (does not blank a substring of another word)', () => {
    expect(blankOutWord('I can see a caterpillar.', 'cat')).toBe('I can see a caterpillar.');
  });
});

describe('generateListeningSentenceFillBlankQuestions (countable words)', () => {
  const questions = generateListeningSentenceFillBlankQuestions([COUNTABLE_WORD]);

  it('generates one instance per applicable template (combinatorial, not hand-written)', () => {
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.every((q) => q.kind === 'listening-sentence-fill-blank')).toBe(true);
    expect(questions.every((q) => q.word === 'cat')).toBe(true);
  });

  it('uses "a" before a consonant-initial word', () => {
    expect(questions.some((q) => q.sentence === 'I have a cat.')).toBe(true);
    expect(questions.some((q) => q.sentence === 'I can see a cat.')).toBe(true);
    expect(questions.some((q) => q.sentence === 'This is a cat.')).toBe(true);
  });

  it('carries topicId and explanation through unchanged', () => {
    expect(questions.every((q) => q.topicId === 't-animals')).toBe(true);
    expect(questions.every((q) => q.explanation === COUNTABLE_WORD.explanation)).toBe(true);
  });

  it('assigns unique ids across all generated instances', () => {
    const ids = new Set(questions.map((q) => q.id));
    expect(ids.size).toBe(questions.length);
  });

  it('blanking the target word out of the full sentence recovers the display sentence (core invariant)', () => {
    for (const q of questions) {
      expect(blankOutWord(q.sentence, q.word)).toBe(q.displaySentence);
      expect(q.displaySentence).toContain('___');
      expect(q.displaySentence).not.toContain(q.word);
    }
  });
});

describe('generateListeningSentenceFillBlankQuestions (vowel-initial countable words)', () => {
  it('uses "an" before a vowel-initial word', () => {
    const questions = generateListeningSentenceFillBlankQuestions([VOWEL_INITIAL_WORD]);

    expect(questions.some((q) => q.sentence === 'I have an elephant.')).toBe(true);
    expect(questions.every((q) => !q.sentence.includes('a elephant'))).toBe(true);
  });
});

describe('generateListeningSentenceFillBlankQuestions (uncountable words)', () => {
  const questions = generateListeningSentenceFillBlankQuestions([UNCOUNTABLE_WORD]);

  it('uses the uncountable template set (no article)', () => {
    expect(questions.some((q) => q.sentence === 'I like red.')).toBe(true);
    expect(questions.some((q) => q.sentence === 'I want some red.')).toBe(true);
    expect(questions.some((q) => q.sentence === 'I can see red.')).toBe(true);
  });

  it('still satisfies the blank-recovery invariant', () => {
    for (const q of questions) {
      expect(blankOutWord(q.sentence, q.word)).toBe(q.displaySentence);
    }
  });
});

describe('generateListeningSentenceFillBlankQuestions (Actions topic)', () => {
  const questions = generateListeningSentenceFillBlankQuestions([ACTION_WORD]);

  it('uses verb-shaped templates instead of the noun-shaped countable/uncountable ones', () => {
    expect(questions.some((q) => q.sentence === 'I can run.')).toBe(true);
    expect(questions.some((q) => q.sentence === 'I like to run.')).toBe(true);
    expect(questions.every((q) => !q.sentence.startsWith('I have') && !q.sentence.startsWith('This is'))).toBe(
      true,
    );
  });

  it('still satisfies the blank-recovery invariant for verb sentences', () => {
    for (const q of questions) {
      expect(blankOutWord(q.sentence, q.word)).toBe(q.displaySentence);
    }
  });
});

describe('CR-144 content guards', () => {
  const mk = (id: string, word: string, topicId = 't-x', countable = true): VocabWord => ({
    id,
    topicId,
    word,
    emoji: '❓',
    countable,
    explanation: 'e',
  });

  it('never generates sentences for blocked words (aspiration/number/badge/non-country)', () => {
    const blocked = [
      mk('liar', 'liar', 'g3-xp-people'),
      mk('villain', 'villain', 'g3-xp-people'),
      mk('kiss', 'kiss', 'g3-xp-feelings'),
      mk('woozy', 'woozy', 'g3-xp-feelings', false),
      mk('infinity', 'infinity', 'g4-xp-signs', false),
      mk('zero', 'zero', 'g4-xp-signs', false),
      mk('hundred', 'hundred', 'g4-xp-signs', false),
      mk('european-union', 'the European Union', 'g4-xp-flags-europe', false),
      mk('ok-badge', 'OK badge'),
      mk('new-badge', 'NEW badge'),
      mk('free-badge', 'FREE badge'),
      mk('vs-badge', 'VS badge'),
    ];
    expect(generateListeningSentenceFillBlankQuestions(blocked)).toHaveLength(0);
    for (const w of blocked) {
      expect(sentencesForWord(w), `"${w.id}" must produce no sentences`).toEqual([]);
    }
  });

  it('drops non-ASCII words from the typing path (CR-144 C1)', () => {
    const questions = generateListeningSentenceFillBlankQuestions([
      mk('pinata', 'piñata'),
      mk('cat', 'cat'),
    ]);
    expect(questions.every((q) => q.word === 'cat')).toBe(true);
  });

  it('keeps flag regions out of the country frame and Santa out of occupations', () => {
    for (const [id, word] of [
      ['taiwan', 'Taiwan'],
      ['hong-kong', 'Hong Kong'],
      ['macau', 'Macau'],
    ] as const) {
      const sentences = sentencesForWord(mk(id, word, 'g5-xp-flags-asia', false));
      expect(sentences.length).toBeGreaterThan(0);
      expect(sentences.every((s) => !s.startsWith('I am from'))).toBe(true);
    }
    const santa = sentencesForWord(mk('santa-claus', 'Santa Claus', 'g3-xp-people', false));
    expect(santa.every((s) => !s.includes('want to be'))).toBe(true);
  });
});

describe('generateListeningSentenceFillBlankQuestions (multi-word entry)', () => {
  it('generates a well-formed pool across a mixed word list without crashing or duplicating ids', () => {
    const words = [COUNTABLE_WORD, VOWEL_INITIAL_WORD, UNCOUNTABLE_WORD, ACTION_WORD];
    const questions = generateListeningSentenceFillBlankQuestions(words);

    const ids = new Set(questions.map((q) => q.id));
    expect(ids.size).toBe(questions.length);
    expect(questions.length).toBeGreaterThan(words.length);
  });

  it('is deterministic across repeated calls (same input -> same output)', () => {
    const words = [COUNTABLE_WORD, UNCOUNTABLE_WORD];
    const first = generateListeningSentenceFillBlankQuestions(words);
    const second = generateListeningSentenceFillBlankQuestions(words);

    expect(first).toEqual(second);
  });
});
