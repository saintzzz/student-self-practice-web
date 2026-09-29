import type { PhonicsSoundChoiceQuestion, PhonicsWordChoiceQuestion, VocabWord } from '../../types';
import { pickDistinct, seededShuffleIndices } from '../prng';
import { equivalentSounds, getInitialSound, soundsSharePhoneme } from '../phonics/initialSounds';

const SOUND_DISTRACTOR_COUNT = 3;
const WORD_DISTRACTOR_COUNT = 3;
const SOUND_VARIANT_SEEDS = ['a', 'b'] as const;
const WORD_VARIANT_SEEDS = ['a', 'b'] as const;

function buildSoundChoiceVariant(
  word: VocabWord,
  soundUniverse: readonly string[],
  variantSeed: string,
): PhonicsSoundChoiceQuestion | null {
  const sound = getInitialSound(word.word);
  // Exclude same-phoneme keys too: a 'c' option under a 'k' answer (or
  // the reverse) is phonetically a second correct answer for a child
  // answering by ear.
  const distractors = pickDistinct(
    soundUniverse,
    (s) => s,
    [sound, ...equivalentSounds(sound)],
    SOUND_DISTRACTOR_COUNT,
    `${word.id}-psc-${variantSeed}`,
  );
  if (distractors.length < SOUND_DISTRACTOR_COUNT) {
    return null;
  }

  const candidateSounds = [sound, ...distractors];
  const order = seededShuffleIndices(4, `${word.id}-psc-${variantSeed}-order`);
  const options = order.map((i) => candidateSounds[i]!) as [string, string, string, string];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-psc-${word.id}-${variantSeed}`,
    topicId: word.topicId,
    kind: 'phonics-sound-choice',
    word: word.word,
    wordId: word.id,
    emoji: word.emoji,
    sound,
    options,
    correctIndex,
    explanation: `Từ "${word.word}" bắt đầu bằng âm "${sound}".`,
  };
}

/**
 * Draws 3 distractor words whose initial sound differs from `targetSound`
 * and whose emojis are all distinct (the options ARE pictures, so identical
 * emojis would silently break "pick 1 of 4" - same rule as CR-01 and
 * listeningImageChoice.ts). Draws an oversized deterministic candidate
 * slice first so sound filtering can still reach 3 words.
 */
function pickWordDistractors(
  word: VocabWord,
  words: readonly VocabWord[],
  targetSound: string,
  variantSeed: string,
): VocabWord[] {
  const candidates = pickDistinct(
    words,
    (w) => w.id,
    [word.id],
    Math.min(words.length - 1, 12),
    `${word.id}-pwc-${variantSeed}-pool`,
  );

  const seenEmojis = new Set<string>([word.emoji]);
  const distractors = candidates.filter(
    (w) => !soundsSharePhoneme(getInitialSound(w.word), targetSound) && !seenEmojis.has(w.emoji) && seenEmojis.add(w.emoji),
  );
  return distractors.slice(0, WORD_DISTRACTOR_COUNT);
}

function buildWordChoiceVariant(
  word: VocabWord,
  words: readonly VocabWord[],
  variantSeed: string,
): PhonicsWordChoiceQuestion | null {
  const sound = getInitialSound(word.word);
  const distractors = pickWordDistractors(word, words, sound, variantSeed);
  if (distractors.length < WORD_DISTRACTOR_COUNT) {
    return null;
  }

  const candidateWords = [word, ...distractors];
  const order = seededShuffleIndices(4, `${word.id}-pwc-${variantSeed}-order`);
  const options = order.map((i) => candidateWords[i]!.emoji) as [string, string, string, string];
  const optionWordIds = order.map((i) => candidateWords[i]!.id) as [string, string, string, string];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-pwc-${word.id}-${variantSeed}`,
    topicId: word.topicId,
    kind: 'phonics-word-choice',
    sound,
    word: word.word,
    wordId: word.id,
    options,
    optionWordIds,
    correctIndex,
    explanation: `"${word.word}" bắt đầu bằng âm "${sound}".`,
  };
}

/**
 * CR-03 phonics generators, both directions (human ruling D-Ph2):
 *
 * - sound-choice: word + picture shown, student picks the initial sound out
 *   of 4. Distractors are other sounds that actually exist in the bank (the
 *   sound universe is derived from `words`, not a hardcoded alphabet) so a
 *   distractor never names a sound no vocabulary word has.
 * - word-choice: sound shown/spoken, student picks the word picture whose
 *   initial sound matches. All 3 distractors must start with a *different*
 *   sound (only 1 of 4 is correct) and have distinct emojis.
 *
 * Generated per-word over the full pool, same shape as the other
 * generators; Round 4 draws a seeded slice via stratifiedSample.
 */
export function generatePhonicsSoundChoiceQuestions(words: readonly VocabWord[]): PhonicsSoundChoiceQuestion[] {
  const soundUniverse = [...new Set(words.map((w) => getInitialSound(w.word)))];
  const questions: PhonicsSoundChoiceQuestion[] = [];

  for (const word of words) {
    for (const variantSeed of SOUND_VARIANT_SEEDS) {
      const question = buildSoundChoiceVariant(word, soundUniverse, variantSeed);
      if (question) {
        questions.push(question);
      }
    }
  }
  return questions;
}

export function generatePhonicsWordChoiceQuestions(words: readonly VocabWord[]): PhonicsWordChoiceQuestion[] {
  const questions: PhonicsWordChoiceQuestion[] = [];

  for (const word of words) {
    for (const variantSeed of WORD_VARIANT_SEEDS) {
      const question = buildWordChoiceVariant(word, words, variantSeed);
      if (question) {
        questions.push(question);
      }
    }
  }
  return questions;
}
