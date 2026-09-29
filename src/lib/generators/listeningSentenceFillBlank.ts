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

/**
 * Sentence classes (PRD section 5.1, ruling D-6: fix in-run). Every class
 * maps to a template family; `countable`, `mass` and `action` are the
 * pre-existing sets kept byte-identical, the rest are new topic-aware
 * families so feelings/occupations/... no longer produce sentences like
 * "I want some sick.".
 */
type SentenceClass =
  | 'countable'
  | 'mass'
  | 'action'
  | 'feeling'
  | 'occupation'
  | 'family'
  | 'body-part'
  | 'color'
  | 'number'
  | 'the-noun'
  | 'sport'
  | 'country';

/** "I have a cat.", "I can see an elephant.", "This is a red." (see templatesForWord for gating). */
const COUNTABLE_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I have ${article(word)} ${word}.`,
  (word) => `I can see ${article(word)} ${word}.`,
  (word) => `This is ${article(word)} ${word}.`,
];

/** For countable: false words with no topic class (food, drink, clothes plurals, etc.). */
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

/** Feelings are adjectives, not mass nouns: "I am happy." / "I feel happy.". */
const FEELING_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I am ${word}.`,
  (word) => `I feel ${word}.`,
];

/** One third-person form plus a neutral aspiration form (PRD 5.1 ruling). */
const OCCUPATION_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `He is ${article(word)} ${word}.`,
  (word) => `I want to be ${article(word)} ${word}.`,
];

const FAMILY_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `This is my ${word}.`,
  (word) => `I love my ${word}.`,
];

const BODY_PART_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `This is my ${word}.`,
  (word) => `Touch your ${word}.`,
];

const COLOR_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I like ${word}.`,
  (word) => `I can see ${word}.`,
  (word) => `It is ${word}.`,
];

const NUMBER_TEMPLATES: readonly SentenceTemplate[] = [(word) => `I can count to ${word}.`];

/** Words that read naturally with "the": sun, moon, rain, wind, ... */
const THE_NOUN_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I like the ${word}.`,
  (word) => `I can see the ${word}.`,
];

const SPORT_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I like ${word}.`,
  (word) => `Do you like ${word}?`,
];

/** CR-07: G5 "Where are you from?" unit - country nouns take the from-frame. */
const COUNTRY_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I am from ${word}.`,
  (word) => `I like ${word}.`,
];

const CLASS_TEMPLATES: Readonly<Record<SentenceClass, readonly SentenceTemplate[]>> = {
  countable: COUNTABLE_TEMPLATES,
  mass: UNCOUNTABLE_TEMPLATES,
  action: ACTION_TEMPLATES,
  feeling: FEELING_TEMPLATES,
  occupation: OCCUPATION_TEMPLATES,
  family: FAMILY_TEMPLATES,
  'body-part': BODY_PART_TEMPLATES,
  color: COLOR_TEMPLATES,
  number: NUMBER_TEMPLATES,
  'the-noun': THE_NOUN_TEMPLATES,
  sport: SPORT_TEMPLATES,
  country: COUNTRY_TEMPLATES,
};

/**
 * PRD 5.1 Table A - topic-level sentence classes. Topics not listed fall
 * through to the countable/mass default (step 4 of BR-16).
 */
const TOPIC_CLASSES: Readonly<Record<string, SentenceClass>> = {
  'g2-feelings': 'feeling',
  'g2-occupations': 'occupation',
  'g2-family': 'family',
  'g2-body-parts': 'body-part',
  'g2-colors': 'color',
  'g2-numbers': 'number',
  'g2-weather': 'the-noun',
  'g2-sports': 'sport',
  // CR-07 Table A extension - same classes reused for the new grade topics.
  'g1-numbers': 'number',
  'g1-colors': 'color',
  'g1-family': 'family',
  'g1-body': 'body-part',
  'g3-classroom-actions': 'action',
  'g3-body-parts': 'body-part',
  'g3-hobbies': 'sport',
  'g3-colours': 'color',
  'g3-family': 'family',
  'g3-jobs': 'occupation',
  'g3-sports-games': 'sport',
  'g3-weather': 'the-noun',
  'g4-daily-routine': 'the-noun',
  'g4-subjects': 'sport',
  'g4-seasons': 'the-noun',
  'g4-abilities': 'action',
  'g4-jobs': 'occupation',
  'g5-countries': 'country',
  'g5-future-jobs': 'occupation',
  'g5-club-activities': 'sport',
  'g5-special-days': 'sport',
};

/**
 * PRD 5.1 Table B - per-word overrides that beat the topic class
 * (e.g. `chef` is an occupation living in `g2-kitchen`; `skateboard` is an
 * object noun in `g2-sports`).
 */
const WORD_ID_OVERRIDES: Readonly<Record<string, SentenceClass>> = {
  chef: 'occupation',
  moon: 'the-noun',
  ocean: 'the-noun',
  fire: 'the-noun',
  skateboard: 'countable',
  // CR-07 Table B extension.
  'video-game': 'countable',
  volunteer: 'occupation',
  recorder: 'countable',
  cycle: 'action',
  'wake-up': 'action',
  'brush-teeth': 'action',
  breakfast: 'mass',
  lunch: 'mass',
  dinner: 'mass',
  homework: 'mass',
  spring: 'mass',
  summer: 'mass',
  autumn: 'mass',
  winter: 'mass',
};

/** BR-16 precedence: word-id override -> actions topic -> topic class -> countable/mass. */
export function sentenceClassFor(word: VocabWord): SentenceClass {
  const override = WORD_ID_OVERRIDES[word.id];
  if (override) {
    return override;
  }
  if (word.topicId === ACTIONS_TOPIC_ID) {
    return 'action';
  }
  const topicClass = TOPIC_CLASSES[word.topicId];
  if (topicClass) {
    return topicClass;
  }
  return word.countable ? 'countable' : 'mass';
}

function templatesForWord(word: VocabWord): readonly SentenceTemplate[] {
  return CLASS_TEMPLATES[sentenceClassFor(word)];
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
        wordId: word.id,
        sentence,
        displaySentence: blankOutWord(sentence, word.word),
        explanation: word.explanation,
      });
    });
  }

  return questions;
}
