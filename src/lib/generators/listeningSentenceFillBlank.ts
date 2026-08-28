import type { ListeningSentenceFillBlankQuestion, VocabWord } from '../../types';

/**
 * The Actions topic's stable id (see data/vocabulary/actions.ts,
 * `ACTIONS_TOPIC.id`) - referenced here only as a fixed topic identifier
 * (like the topic ids already hardcoded in tests such as "g2-animals"), not
 * as a word/topic count assumption. Actions are verbs, so they get a
 * dedicated verb-shaped template set instead of the noun-shaped ones.
 */
const ACTIONS_TOPIC_ID = 'g2-actions';

const VOWEL_LETTERS = new Set(['a', 'e', 'i', 'o', 'u']);

function article(word: string): 'a' | 'an' {
  const firstLetter = word.trim().charAt(0).toLowerCase();
  return VOWEL_LETTERS.has(firstLetter) ? 'an' : 'a';
}

type SentenceTemplate = (word: string) => string;

/** "I have a cat.", "I can see an elephant.", "This is a red." (see templatesForWord for gating). */
const COUNTABLE_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I have ${article(word)} ${word}.`,
  (word) => `I can see ${article(word)} ${word}.`,
  (word) => `This is ${article(word)} ${word}.`,
];

/** For countable: false words (colors, feelings, weather, etc.). */
const UNCOUNTABLE_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I like ${word}.`,
  (word) => `I want some ${word}.`,
  (word) => `I can see ${word}.`,
];

/** For the Actions topic specifically - verbs read naturally here, nouns would not. */
const ACTION_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I can ${word}.`,
  (word) => `I like to ${word}.`,
];

function templatesForWord(word: VocabWord): readonly SentenceTemplate[] {
  if (word.topicId === ACTIONS_TOPIC_ID) {
    return ACTION_TEMPLATES;
  }
  return word.countable ? COUNTABLE_TEMPLATES : UNCOUNTABLE_TEMPLATES;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replaces the target word's first (and by template construction, only)
 * occurrence in `sentence` with "___", matched as a whole word
 * case-insensitively. This is the inverse of "fill in the blank" - the
 * generator already knows the answer, so it blanks it out itself rather
 * than asking a human to author the blanked form separately.
 */
export function blankOutWord(sentence: string, word: string): string {
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  return sentence.replace(pattern, '___');
}

/**
 * Generates cloze-sentence instances for every word, combining each word
 * with every template in its applicable template set (see plan.md v5
 * "Round 2 - Listening Sentence Fill-Blank"). This is the combinatorial
 * lever for this round's content scale - never hand-written per-word
 * sentences, same discipline as countingImage.ts and extraLetter.ts.
 */
export function generateListeningSentenceFillBlankQuestions(
  words: readonly VocabWord[],
): ListeningSentenceFillBlankQuestion[] {
  const questions: ListeningSentenceFillBlankQuestion[] = [];

  for (const word of words) {
    const templates = templatesForWord(word);
    templates.forEach((buildSentence, index) => {
      const sentence = buildSentence(word.word);
      questions.push({
        id: `q-lsfb-${word.id}-${index}`,
        topicId: word.topicId,
        kind: 'listening-sentence-fill-blank',
        word: word.word,
        sentence,
        displaySentence: blankOutWord(sentence, word.word),
        explanation: word.explanation,
      });
    });
  }

  return questions;
}
