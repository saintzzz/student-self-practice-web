import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CurrentAnswer } from '../lib/practiceSession';
import type { Question } from '../types';
import QuestionCard from './QuestionCard';
import {
  COUNTING_QUESTION,
  DESCRIBE_IMAGE_QUESTION,
  EXTRA_LETTER_QUESTION,
  IMAGE_QUESTION,
  LISTENING_IMAGE_CHOICE_QUESTION,
  LISTENING_QUESTION,
  LISTENING_SENTENCE_QUESTION,
  PHONICS_BLEND_CHOICE_QUESTION,
  PHONICS_FINAL_CHOICE_QUESTION,
  PHONICS_RHYME_CHOICE_QUESTION,
  PHONICS_SOUND_CHOICE_QUESTION,
  PHONICS_WORD_CHOICE_QUESTION,
  PICTURE_PAIR_MATCHING_QUESTION,
  noopHandlers,
} from './questionCardFixtures';

/**
 * AC-10.1 / US-10: the FeedbackPanel correct-word picture shows THE CORRECT
 * WORD for the five picture-bearing kinds and nothing for the rest. The
 * wordId -> visual lookup is mocked so fixture ids map to their emoji.
 */
vi.mock('../lib/emoji/wordVisual', () => ({
  getWordVisual: (wordId: string) => {
    const emojiById: Record<string, string> = {
      'fixture-cat': '🐱',
      'fixture-dog': '🐶',
      'fixture-fish': '🐟',
      'fixture-bird': '🐦',
      'fixture-frog': '🐸',
      'fixture-hat': '🎩',
    };
    const emoji = emojiById[wordId];
    return emoji ? { emoji } : undefined;
  },
}));

function wordLine(): HTMLElement {
  return screen.getByText(/Từ đúng là:/);
}

function renderAnswered(question: Question, currentAnswer: CurrentAnswer) {
  render(
    <QuestionCard
      question={question}
      questionNumber={1}
      totalQuestions={10}
      currentAnswer={currentAnswer}
      {...noopHandlers}
    />,
  );
}

describe('FeedbackPanel correct-word picture (AC-10.1)', () => {
  const PICTURE_KINDS: Array<{ label: string; question: Question; answer: CurrentAnswer; expectedEmoji: string }> = [
    {
      label: 'extra-letter (wordId)',
      question: EXTRA_LETTER_QUESTION,
      answer: { isCorrect: true, selectedLetterIndex: 3 },
      expectedEmoji: '🐦', // wordId: fixture-bird
    },
    {
      label: 'listening-sentence-fill-blank (wordId)',
      question: LISTENING_SENTENCE_QUESTION,
      answer: { isCorrect: true },
      expectedEmoji: '🐱', // wordId: fixture-cat
    },
    {
      label: 'counting-image (promptWordId)',
      question: COUNTING_QUESTION,
      answer: { isCorrect: true, selectedIndex: 0 },
      expectedEmoji: '🐱', // promptWordId: fixture-cat
    },
    {
      label: 'listening-image-choice (optionWordIds[correctIndex])',
      question: LISTENING_IMAGE_CHOICE_QUESTION,
      answer: { isCorrect: true, selectedIndex: 0 },
      expectedEmoji: '🐱', // optionWordIds[0]
    },
    {
      label: 'describe-and-choose-image (optionWordIds[correctIndex])',
      question: DESCRIBE_IMAGE_QUESTION,
      answer: { isCorrect: true, selectedIndex: 0 },
      expectedEmoji: '🐱', // optionWordIds[0]
    },
    {
      label: 'phonics-sound-choice (wordId)',
      question: PHONICS_SOUND_CHOICE_QUESTION,
      answer: { isCorrect: true, selectedIndex: 0 },
      expectedEmoji: '🐱', // wordId: fixture-cat
    },
    {
      label: 'phonics-word-choice (optionWordIds[correctIndex])',
      question: PHONICS_WORD_CHOICE_QUESTION,
      answer: { isCorrect: true, selectedIndex: 0 },
      expectedEmoji: '🐱', // optionWordIds[0]
    },
    {
      label: 'phonics-final-choice (wordId)',
      question: PHONICS_FINAL_CHOICE_QUESTION,
      answer: { isCorrect: true, selectedIndex: 0 },
      expectedEmoji: '🐱', // wordId: fixture-cat
    },
    {
      label: 'phonics-blend-choice (wordId)',
      question: PHONICS_BLEND_CHOICE_QUESTION,
      answer: { isCorrect: true, selectedIndex: 0 },
      expectedEmoji: '🐸', // wordId: fixture-frog
    },
    {
      label: 'phonics-rhyme-choice (optionWordIds[correctIndex])',
      question: PHONICS_RHYME_CHOICE_QUESTION,
      answer: { isCorrect: true, selectedIndex: 0 },
      expectedEmoji: '🎩', // optionWordIds[0] = fixture-hat
    },
  ];

  it.each(PICTURE_KINDS)('shows the correct word picture for $label', ({ question, answer, expectedEmoji }) => {
    renderAnswered(question, answer);

    const line = wordLine();
    const visual = line.querySelector('[data-emoji-visual]');
    expect(visual, 'expected a picture inside the "Từ đúng là:" line').not.toBeNull();
    expect(visual).toHaveAttribute('data-emoji-visual', expectedEmoji);
  });

  const NO_PICTURE_KINDS: Array<{ label: string; question: Question; answer: CurrentAnswer }> = [
    { label: 'image-choice (prompt already IS the picture)', question: IMAGE_QUESTION, answer: { isCorrect: true, selectedIndex: 0 } },
    { label: 'picture-pair-matching (no single correct word)', question: PICTURE_PAIR_MATCHING_QUESTION, answer: { isCorrect: true } },
    { label: 'listening-fill-blank (existing feedback unchanged)', question: LISTENING_QUESTION, answer: { isCorrect: false } },
  ];

  it.each(NO_PICTURE_KINDS)('shows no picture for $label', ({ question, answer }) => {
    renderAnswered(question, answer);
    expect(wordLine().querySelector('[data-emoji-visual]')).toBeNull();
  });

  it('uses optionWordIds[correctIndex] - not optionWordIds[0] - for listening-image-choice (mutation guard)', () => {
    renderAnswered(
      { ...LISTENING_IMAGE_CHOICE_QUESTION, correctIndex: 1 },
      { isCorrect: true, selectedIndex: 1 },
    );

    const visual = wordLine().querySelector('[data-emoji-visual]');
    expect(visual).toHaveAttribute('data-emoji-visual', '🐶'); // optionWordIds[1] = fixture-dog
  });

  it('uses optionWordIds[correctIndex] - not optionWordIds[0] - for describe-and-choose-image (mutation guard)', () => {
    renderAnswered(
      { ...DESCRIBE_IMAGE_QUESTION, correctIndex: 2 },
      { isCorrect: true, selectedIndex: 2 },
    );

    const visual = wordLine().querySelector('[data-emoji-visual]');
    expect(visual).toHaveAttribute('data-emoji-visual', '🐶'); // optionWordIds[2] = fixture-dog
  });

  it('uses optionWordIds[correctIndex] - not optionWordIds[0] - for phonics-word-choice (mutation guard)', () => {
    renderAnswered(
      { ...PHONICS_WORD_CHOICE_QUESTION, correctIndex: 2 },
      { isCorrect: true, selectedIndex: 2 },
    );

    const visual = wordLine().querySelector('[data-emoji-visual]');
    expect(visual).toHaveAttribute('data-emoji-visual', '🐟'); // optionWordIds[2] = fixture-fish
  });
});
