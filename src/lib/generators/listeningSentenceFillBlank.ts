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
  | 'country'
  | 'time'
  | 'season'
  | 'substance'
  | 'she-noun'
  | 'place';

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

/** CR-15: clock-face words ("one o'clock") read as time expressions. */
const TIME_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `It's ${word}.`,
  (word) => `I get up at ${word}.`,
];

/** CR-16: seasons are neither consumables ("I want some spring" was
    nonsense) nor "the"-nouns - they take plain like/it-is frames. */
const SEASON_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I like ${word}.`,
  (word) => `It is ${word}.`,
];

/** CR-16: non-consumable mass nouns (blood, DNA, coral...) - "I want some
    blood" is wrong; existential "there is" reads naturally for all. */
const SUBSTANCE_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `There is some ${word}.`,
  (word) => `I can see ${word}.`,
];

/** CR-16: female-coded person nouns - "He is a bride"/"I have a bride" are
    both wrong; "She is a ..." is grammatical and pedagogically clean. */
const SHE_NOUN_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `She is ${article(word)} ${word}.`,
  (word) => `I can see ${article(word)} ${word}.`,
];

/** CR-16: places kids visit - "I have a bank" was nonsense; "I go to the
    ..." teaches real usage (go to school / go to the park). */
const PLACE_TEMPLATES: readonly SentenceTemplate[] = [
  (word) => `I go to the ${word}.`,
  (word) => `I can see the ${word}.`,
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
  time: TIME_TEMPLATES,
  season: SEASON_TEMPLATES,
  substance: SUBSTANCE_TEMPLATES,
  'she-noun': SHE_NOUN_TEMPLATES,
  place: PLACE_TEMPLATES,
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
  'g4-seasons': 'season',
  // CR-16: place topics teach "I go to the ..." instead of "I have a bank".
  'g2-places': 'place',
  'g3-rooms': 'place',
  'g4-city-places': 'place',
  'g4-homes': 'place',
  'g4-facilities': 'place',
  'g5-places': 'place',
  'g4-abilities': 'action',
  'g4-jobs': 'occupation',
  'g5-countries': 'country',
  'g5-future-jobs': 'occupation',
  'g5-club-activities': 'sport',
  'g5-special-days': 'sport',
  // CR-15 expansion-pack topic classes. g3-xp-people is mostly character/
  // person nouns that fit the occupation frames ("He is a ...", "I want to
  // be a ..."); exceptions ride on WORD_ID_OVERRIDES below.
  'g3-xp-feelings': 'feeling',
  'g3-xp-people': 'occupation',
  'g3-xp-sports': 'sport',
  'g3-xp-places': 'the-noun',
  'g4-xp-nature': 'the-noun',
  'g4-xp-time': 'time',
  'g4-xp-flags-europe': 'country',
  'g5-xp-flags-asia': 'country',
  'g5-xp-flags-americas': 'country',
  'g5-xp-flags-africa': 'country',
  'g5-xp-flags-oceania': 'country',
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
  // CR-16: seasons are not consumables - "I want some spring" was the
  // bug a user hit in production. They get their own class.
  spring: 'season',
  summer: 'season',
  autumn: 'season',
  winter: 'season',
  // CR-15 expansion-pack word overrides.
  // g3-xp-feelings holds verbs as well as adjectives - verbs take action frames.
  grin: 'action',
  giggle: 'action',
  wink: 'action',
  yawn: 'action',
  drool: 'action',
  sob: 'action',
  scream: 'action',
  frown: 'action',
  celebrate: 'action',
  hug: 'action',
  think: 'action',
  sigh: 'action',
  kiss: 'action',
  liar: 'occupation',
  // g3-xp-people exceptions to the occupation topic class.
  person: 'countable',
  skull: 'countable',
  couple: 'the-noun',
  family: 'family',
  // g3-xp-sports object nouns among the sport names.
  sled: 'countable',
  parachute: 'countable',
  boomerang: 'countable',
  frisbee: 'countable',
  joker: 'countable',
  golfer: 'occupation',
  // g4-xp-gestures verbs.
  pray: 'action',
  'point-left': 'action',
  'point-up': 'action',
  'point-down': 'action',
  // g4-xp-signs numbers and the non-countable checkpoint.
  hundred: 'number',
  zero: 'number',
  // g1-xp-nature nouns that need "the" (and a/an would misfire on Earth).
  earth: 'the-noun',
  sunrise: 'the-noun',
  sunset: 'the-noun',
  // g4-xp-tech words whose article() output would be wrong: "a hourglass"
  // and "a X-ray" - route them to the "the" frames instead.
  hourglass: 'the-noun',
  'x-ray': 'the-noun',
  // g4-xp-health body nouns read better with the body-part frames.
  tongue: 'body-part',
  lip: 'body-part',
  // g5-xp-advanced activities and the flag-like symbol.
  yoga: 'sport',
  massage: 'sport',
  'skull-and-crossbones': 'the-noun',
  // "a/an" misfires: UFO and euro start with a consonant SOUND (/ju:/),
  // not the vowel letter article() checks. The "the" frames are safe.
  ufo: 'the-noun',
  euro: 'the-noun',
  // Female-coded roles would get "He is a ..." from the occupation class;
  // the "She is a ..." frames are both gender-correct and grammatical.
  policewoman: 'she-noun',
  bride: 'she-noun',
  mermaid: 'she-noun',
  // CR-15 wave 2.
  salute: 'action',
  'baggage-claim': 'the-noun',
  infinity: 'number',
  wifi: 'the-noun',
  // CR-16 semantics sweep - "I want some X" is only right for consumables.
  // Activities and routines take the sport/like frames instead.
  homework: 'sport',
  shopping: 'sport',
  sightseeing: 'sport',
  photography: 'sport',
  'roller-skating': 'sport',
  cheer: 'sport',
  sauna: 'place',
  weekend: 'the-noun',
  'good-luck': 'sport',
  // Non-consumable mass nouns.
  blood: 'substance',
  dna: 'substance',
  coral: 'substance',
  // Transport system, not a consumable.
  'light-rail': 'the-noun',
  // Places that live inside mixed countable topics.
  mall: 'place',
  bakery: 'place',
  bookshop: 'place',
  station: 'place',
  // g3-xp-places members where "go to" beats "like the".
  factory: 'place',
  'convenience-store': 'place',
  hotel: 'place',
  church: 'place',
  mosque: 'place',
  synagogue: 'place',
  'petrol-station': 'place',
  atm: 'place',
  elevator: 'place',
  'construction-site': 'place',
  'passport-control': 'place',
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
