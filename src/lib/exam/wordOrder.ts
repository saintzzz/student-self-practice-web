import type { WordOrderQuestion } from '../../types/exam';
import type { VocabWord } from '../../types';
import { seededShuffleIndices } from '../prng';
import { sentencesForWord } from '../generators/listeningSentenceFillBlank';

const MIN_TOKENS = 4;
const MAX_TOKENS = 8;
/** CR-26 - authored sentences may run longer (real IOE reorders hit
 * 9-10 words); template sentences stay capped at MAX_TOKENS. */
const AUTHORED_MAX_TOKENS = 10;

/** Splits into tap tiles, keeping punctuation glued to its word. */
export function tokenizeSentence(sentence: string): string[] {
  return sentence.trim().split(/\s+/);
}

/**
 * Shuffles token order deterministically; retries seeded variants until
 * the scrambled order differs from the original (a "shuffled" sentence
 * that lands in the correct order would be a free point).
 */
function scramble(tokens: readonly string[], seed: string): string[] {
  for (let attempt = 0; attempt < 8; attempt++) {
    const order = seededShuffleIndices(tokens.length, `${seed}-wo-${attempt}`);
    const tiles = order.map((i) => tokens[i]!);
    if (tiles.join(' ') !== tokens.join(' ')) {
      return tiles;
    }
  }
  // Sentences with many identical tokens can refuse to shuffle (e.g.
  // "I I I"); fall back to a rotated order which can never equal the
  // original for n > 1 unless all tokens are identical.
  return [...tokens.slice(1), tokens[0]!];
}

/**
 * One word-order question per word/template pair, built on the same
 * curated sentence bank as listening-sentence-fill-blank so generated
 * sentences are guaranteed grammatical.
 */
export function generateWordOrderQuestions(words: readonly VocabWord[]): WordOrderQuestion[] {
  const questions: WordOrderQuestion[] = [];

  for (const word of words) {
    const sentences = sentencesForWord(word);
    sentences.forEach((sentence, index) => {
      const tokens = tokenizeSentence(sentence);
      if (tokens.length < MIN_TOKENS || tokens.length > MAX_TOKENS) {
        return;
      }
      let tiles = scramble(tokens, `${word.id}-${index}`);
      // A scramble that lands on an accepted alternate is a free point.
      for (let retry = 0; retry < 8 && isWordOrderCorrect(sentence, tiles); retry++) {
        tiles = scramble(tokens, `${word.id}-${index}-r${retry}`);
      }
      questions.push({
        id: `q-wo-${word.id}-${index}`,
        topicId: word.topicId,
        kind: 'word-order',
        sentence,
        tiles,
        explanation: `Sắp xếp đúng: "${sentence}" ${word.explanation}`,
      });
    });
  }

  return questions;
}

/** CR-65 - so sanh bo qua dau cau cuoi va hoa/thuong: mot so row V6
 * co cau dich "I love father." nhung bank tu vung khong kem dau cham,
 * nen cau khong the nao dung. */
function normalizeForCompare(s: string): string {
  // Strip trailing punctuation AND whitespace - tiles like ["home", "."]
  // join to "home ." and the space left after dropping "." must not fail
  // the comparison (external-review r4).
  // Compare on letters+spacing only. Internal punctuation tiles (","
  // standing alone) join as "Yesterday , I" while the sentence reads
  // "Yesterday, I" - both must normalize identically (r5).
  return s.trim().toLowerCase().replace(/[.,!?;:'"’]+/gu, '').replace(/\s+/g, ' ').trim();
}

/** Words that can head a movable sentence-final adjunct phrase. */
const ADJUNCT_HEADS = new Set([
  'at', 'in', 'on', 'by', 'before', 'after', 'during', 'for', 'with',
  'every', 'last', 'next', 'this', 'twice', 'once', 'now', 'tonight',
  'behind', 'near', 'beside', 'under', 'inside', 'outside', 'around',
]);

/** Sentences opening with a wh-word cannot invert across it:
 * "How many students are there" -> *"Are how many students there". */
const WH_WORDS = new Set(['what', 'where', 'when', 'who', 'why', 'how', 'which', 'whose', 'whom']);

/** Openers that are not subjects - "Yes, I can." must not invert to
 * "can yes i". */
const PARTICLE_OPENERS = new Set(['yes', 'no', 'please', 'ok', 'okay', 'well']);

/** Medial adverbs a child can legitimately front. "Usually I get up" is
 * fine; "Never I eat meat" / "Always I go" are not, so the list is kept
 * to the truly frontable frequency adverbs. */
const MEDIAL_ADVERBS = new Set(['usually', 'often', 'sometimes']);

/** Auxiliaries that invert forward (declarative -> question). Only be
 * forms and modals: "I have a dog" must not produce "Have I a dog" -
 * have/do as main verbs are excluded. bareToken strips apostrophes, so
 * contractions are listed in their bare form ("can't" -> "cant"). */
const FORWARD_AUX = new Set([
  'is', 'are', 'was', 'were', 'am', 'can', 'cant', 'cannot', 'could',
  'couldnt', 'should', 'shouldnt', 'will', 'would', 'wouldnt', 'must',
  'mustnt', 'may', 'wont', 'isnt', 'arent', 'wasnt', 'werent',
]);

/** Auxiliaries recognized when DE-inverting an authored question
 * ("Do you like art?" -> "you do like art"). Includes do/have forms -
 * the question mark is what licenses them here. */
const REVERSE_AUX = new Set([
  ...FORWARD_AUX,
  'has', 'have', 'had', 'do', 'does', 'did',
  'dont', 'doesnt', 'didnt', 'havent', 'hasnt', 'hadnt',
]);

/** Pronouns/determiners that can start a real subject NP - used to keep
 * forward inversion from grabbing an auxiliary inside a subordinate
 * clause ("I think it is big" -> *"is i think it big"). */
const SUBJECT_OPENERS = new Set([
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'there',
  'a', 'an', 'the', 'my', 'his', 'her', 'our', 'their', 'its', 'your',
  'this', 'that', 'these', 'those', 'some', 'any', 'each', 'every',
]);

const DETERMINERS = new Set([
  'a', 'an', 'the', 'my', 'his', 'her', 'our', 'their', 'its', 'your',
  'this', 'that', 'these', 'those', 'some', 'any', 'no', 'each', 'every',
]);

/** Function words that can legitimately precede a swappable conjunct:
 * verbs, auxiliaries, prepositions, connectives. "I like English and
 * maths" can swap because 'like' bounds the NP; "a red pen and blue
 * ruler" cannot because 'red' binds 'pen' into a bigger NP. Kept
 * deliberately narrow - under-accepting is safe, over-accepting was the
 * r19-02 defect. */
const CONJUNCT_BOUNDARY_LEFT = new Set([
  'like', 'love', 'hate', 'enjoy', 'prefer', 'want', 'need', 'have', 'has',
  'had', 'play', 'study', 'learn', 'teach', 'speak', 'read', 'write',
  'draw', 'sing', 'dance', 'eat', 'drink', 'watch', 'see', 'saw', 'buy',
  'use', 'make', 'do', 'does', 'did', 'is', 'are', 'am', 'was', 'were',
  'be', 'been', 'get', 'got', 'take', 'took', 'bring', 'give', 'meet',
  'met', 'know', 'visit', 'collect', 'find', 'found', 'choose', 'wear',
  'wash', 'cook', 'clean', 'help', 'open', 'close', 'go', 'went', 'come',
  'came', 'to', 'and', 'or', 'but', 'not', 'than', 'as', 'with', 'of',
  'at', 'in', 'on', 'by', 'about', 'from', 'for',
]);

/** Function words that can legitimately FOLLOW a swappable conjunct:
 * verbs, auxiliaries, conjunctions, adjunct heads, frequency adverbs.
 * "maths and English are fun" / "cats and dogs every day" can swap; a
 * content noun/adjective right after means it belongs to the conjunct. */
const CONJUNCT_BOUNDARY_RIGHT = new Set([
  'is', 'are', 'am', 'was', 'were', 'be', 'do', 'does', 'did', 'have',
  'has', 'had', 'can', 'could', 'will', 'would', 'shall', 'should', 'may',
  'might', 'must', 'and', 'or', 'but', 'to', 'of', 'with', 'about',
  'in', 'on', 'at', 'by', 'from', 'for', 'after', 'before', 'during',
  'every', 'each', 'both', 'usually', 'often', 'sometimes', 'not',
]);

/** Determiner check used ONLY by adjunct fronting. 'her' is ambiguous -
 * in "I will visit her next week" it is an object pronoun and "next
 * week" is a real adjunct, so it is left out here (it stays in
 * DETERMINERS for the conjunct-swap check). */
const ADJUNCT_DETERMINERS = new Set([...DETERMINERS].filter((t) => t !== 'her'));

const BE_FORMS = new Set(['am', 'is', 'are', 'was', 'were']);

/** "verb preposition" bonds where the PP is a COMPLEMENT, not a movable
 * adjunct: "I look at a cat" must not produce "At a cat I look". Built
 * from the verb+prep pairs the bank actually uses, expanded to s/ed/ing
 * forms plus the irregular pasts that show up. External-review r19-01. */
const PP_COMPLEMENT_BONDS = (() => {
  const verbPreps: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['look', ['at', 'for', 'after']], ['listen', ['to']], ['play', ['with']],
    ['wait', ['for']], ['live', ['in', 'at']], ['sit', ['on', 'in', 'at']],
    ['stand', ['on', 'in', 'at']], ['walk', ['to', 'with', 'in', 'on']],
    ['run', ['to', 'with', 'in']], ['go', ['to', 'with', 'in', 'on', 'for']],
    ['come', ['to', 'from', 'with', 'for']], ['arrive', ['at', 'in']],
    ['point', ['at', 'to']], ['laugh', ['at']], ['talk', ['to', 'with', 'about']],
    ['speak', ['to', 'with', 'about']], ['read', ['about', 'to']],
    ['write', ['about', 'to']], ['learn', ['about', 'from']],
    ['think', ['about', 'of']], ['dream', ['about', 'of']],
    ['work', ['on', 'with', 'at', 'for']], ['stay', ['at', 'in', 'with']],
    ['study', ['for', 'with', 'at']], ['ride', ['to', 'in']], ['fly', ['to']],
    ['swim', ['in']], ['sleep', ['in', 'on']], ['belong', ['to']],
    ['ask', ['for', 'about']], ['search', ['for']], ['shout', ['at']],
    ['cry', ['for', 'about']], ['worry', ['about']],
  ];
  const irregularPast: Record<string, string[]> = {
    go: ['went'], come: ['came'], sit: ['sat'], stand: ['stood'],
    run: ['ran'], write: ['wrote'], speak: ['spoke'], read: [],
    fly: ['flew'], ride: ['rode'], think: ['thought'], dream: ['dreamt'],
  };
  const bonds = new Set<string>();
  for (const [verb, preps] of verbPreps) {
    const forms = [verb, `${verb}s`, `${verb}ed`, `${verb}ing`, ...(irregularPast[verb] ?? [])];
    for (const form of forms) {
      for (const prep of preps) bonds.add(`${form} ${prep}`);
    }
  }
  return bonds;
})();

/** Past participles that let "was born in ..." front its adjunct (the be
 * is passive, not a locative complement). Covers the irregular forms the
 * bank actually uses plus -en/-n endings. */
const KNOWN_PARTICIPLES = new Set([
  'born', 'broken', 'gone', 'done', 'seen', 'known', 'given', 'taken',
  'eaten', 'written', 'chosen', 'spoken', 'made', 'told', 'built',
  'found', 'lost', 'won', 'worn', 'drawn', 'grown', 'thrown', 'driven',
  'ridden', 'hidden', 'forgotten',
]);

/** Fixed "X and Y" phrases/names that must never swap: "Trinidad and
 * Tobago" is one name, "hide and seek" one game, "fish and chips" one
 * dish. Checked against the sentence, not the output. */
const FIXED_AND_PHRASES = [
  'hide and seek', 'seek and hide', 'trinidad and tobago', 'tobago and trinidad',
  'kitts and nevis', 'nevis and kitts', 'vincent and the grenadines',
  'turks and caicos', 'caicos and turks', 'sao tome and principe',
  'bosnia and herzegovina', 'antigua and barbuda', 'fish and chips',
  'bread and butter', 'mac and cheese', 'rock and roll', 'trial and error',
  'ups and downs', 'back and forth', 'day and night', 'on and off',
  'now and then', 'cat and mouse', 'black and white', 'salt and pepper',
  'mom and dad', 'mum and dad', 'bed and breakfast', 'knife and fork',
];

function bareToken(token: string): string {
  return token.toLowerCase().replace(/[.,!?;:'"’]+/gu, '');
}

/**
 * All grammatically valid orderings of the authored sentence that the
 * scorer accepts: the authored order, adjunct-fronted variants, medial-
 * adverb fronting, subject-auxiliary inversion, and conjunct swaps.
 * (Content audit 2026-10: 27/32 authored sentences had at least one valid
 * alternate that used to score wrong - e.g. "Usually, I get up at six
 * o'clock." or "Every day my father drives me to school.")
 */
export function acceptedWordOrders(sentence: string): string[] {
  const tokens = tokenizeSentence(sentence);
  const bare = tokens.map(bareToken);
  const accepted = new Set<string>([bare.join(' ')]);

  // Adjunct fronting: move any suffix that starts with an adjunct head to
  // the front ("... every day" -> "Every day ...").
  for (let i = 1; i < tokens.length - 1; i++) {
    if (!ADJUNCT_HEADS.has(bare[i]!)) continue;
    // A determiner before the head means the word is inside a noun
    // phrase, not an adjunct: "I read the last page" must not produce
    // "last page I read the".
    if (ADJUNCT_DETERMINERS.has(bare[i - 1]!)) continue;
    // A preposition bound to the preceding verb is a complement, not an
    // adjunct: "I look at a cat" -> *"At a cat I look".
    if (PP_COMPLEMENT_BONDS.has(`${bare[i - 1]} ${bare[i]}`)) continue;
    // If the clause's verb is a plain be-form, the phrase is a complement
    // ("Our classroom is on the second floor" -> *"On the second floor
    // our classroom is"). Be used as a passive/progressive auxiliary is
    // fine ("I was born in 2015" / "She is reading in the library"), and
    // existential "there is" fronting is grammatical too.
    const beIdx = bare.findIndex((t, idx) => idx < i && BE_FORMS.has(t));
    if (beIdx > 0 && bare[0] !== 'there') {
      const afterBe = bare[beIdx + 1] ?? '';
      const participle = /(ing|ed|en)$/.test(afterBe) || KNOWN_PARTICIPLES.has(afterBe);
      if (!participle) continue;
    }
    accepted.add([...bare.slice(i), ...bare.slice(0, i)].join(' '));
  }

  // Medial adverb fronting: "Lan usually helps" -> "usually Lan helps".
  // Wh-questions cannot take a fronted adverb before the wh-word.
  if (!WH_WORDS.has(bare[0]!)) {
    for (let i = 1; i < tokens.length; i++) {
      if (MEDIAL_ADVERBS.has(bare[i]!)) {
        accepted.add([bare[i]!, ...bare.slice(0, i), ...bare.slice(i + 1)].join(' '));
      }
    }
  }

  // Subject-auxiliary inversion, declarative -> question. The aux must sit
  // at position 1 or 2 (simple subject), the head must not be a wh-word or
  // a particle, and multiword subjects must open with a pronoun or
  // determiner so "I think it is big" cannot grab the embedded 'is'.
  if (!WH_WORDS.has(bare[0]!) && !PARTICLE_OPENERS.has(bare[0]!)) {
    for (let i = 1; i <= Math.min(2, tokens.length - 1); i++) {
      if (FORWARD_AUX.has(bare[i]!)) {
        if (i === 1 || SUBJECT_OPENERS.has(bare[0]!)) {
          accepted.add([bare[i]!, ...bare.slice(0, i), ...bare.slice(i + 1)].join(' '));
        }
        break; // invert the first auxiliary only
      }
    }
  }
  // Question -> declarative: only a real question mark licenses this, so
  // imperatives like "Have a nice day." cannot produce *"a have nice day".
  if (/[?]\s*$/.test(sentence) && tokens.length > 1 && REVERSE_AUX.has(bare[0]!)) {
    accepted.add([bare[1]!, bare[0]!, ...bare.slice(2)].join(' '));
  }

  // Conjunct swap: "English and maths" <-> "maths and English". Both
  // conjuncts must be single BARE words, and each needs a boundary: the
  // left conjunct must follow a verb/aux/preposition/pronoun (or start the
  // sentence), the right conjunct must be followed by end-of-sentence or
  // a function word. "a red pen and blue ruler" must not produce
  // "a red blue and pen ruler" (external-review r19-02). Determiners and
  // fixed phrases still block earlier.
  const andIdx = bare.indexOf('and');
  if (andIdx > 0 && andIdx < tokens.length - 1) {
    const sentenceText = bare.join(' ');
    const isFixed = FIXED_AND_PHRASES.some((phrase) => sentenceText.includes(phrase));
    const leftBoundary = andIdx - 2 < 0 || CONJUNCT_BOUNDARY_LEFT.has(bare[andIdx - 2]!);
    const rightTail = bare[andIdx + 2];
    const rightBoundary = rightTail === undefined || CONJUNCT_BOUNDARY_RIGHT.has(rightTail);
    if (
      !isFixed &&
      leftBoundary &&
      rightBoundary &&
      !DETERMINERS.has(bare[andIdx - 1]!) &&
      !DETERMINERS.has(bare[andIdx + 1]!)
    ) {
      const swapped = bare.slice();
      [swapped[andIdx - 1], swapped[andIdx + 1]] = [swapped[andIdx + 1]!, swapped[andIdx - 1]!];
      accepted.add(swapped.join(' '));
    }
  }

  return [...accepted];
}

export function isWordOrderCorrect(sentence: string, pickedTokens: readonly string[]): boolean {
  const picked = normalizeForCompare(pickedTokens.join(' '));
  return acceptedWordOrders(sentence).some((order) => normalizeForCompare(order) === picked);
}

/**
 * CR-26 - authored reorder sentences for grade 3+ (reorderBank). Real
 * IOE reorders are longer and use grammar the word templates never
 * reach, so these take the authored slot in the word-order quota.
 */
export function generateAuthoredWordOrderQuestions(
  gradeId: string,
  sentences: readonly string[],
): WordOrderQuestion[] {
  const questions: WordOrderQuestion[] = [];
  sentences.forEach((sentence, index) => {
    const tokens = tokenizeSentence(sentence);
    if (tokens.length < MIN_TOKENS || tokens.length > AUTHORED_MAX_TOKENS) {
      return;
    }
    let tiles = scramble(tokens, `${gradeId}-authored-${index}`);
    // Same free-point guard for authored reorders.
    for (let retry = 0; retry < 8 && isWordOrderCorrect(sentence, tiles); retry++) {
      tiles = scramble(tokens, `${gradeId}-authored-${index}-r${retry}`);
    }
    questions.push({
      id: `q-wo-a-${gradeId}-${index}`,
      topicId: 'reorder',
      kind: 'word-order',
      sentence,
      tiles,
      explanation: `Sắp xếp đúng: "${sentence}"`,
    });
  });
  return questions;
}
