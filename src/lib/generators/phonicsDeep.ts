import type {
  PhonicsBlendChoiceQuestion,
  PhonicsFinalChoiceQuestion,
  PhonicsRhymeChoiceQuestion,
  VocabWord,
} from '../../types';
import { pickDistinct, seededShuffleIndices } from '../prng';
import { equivalentSounds } from '../phonics/initialSounds';
import { getFinalSound } from '../phonics/finalSounds';
import { getInitialBlend } from '../phonics/blends';
import { getRhymeGroup, rhymesWith } from '../phonics/rhymes';

const DISTRACTOR_COUNT = 3;
const FINAL_VARIANT_SEEDS = ['a', 'b'] as const;
const BLEND_VARIANT_SEEDS = ['a', 'b'] as const;
const RHYME_VARIANT_SEEDS = ['a', 'b'] as const;

function buildFinalChoiceVariant(
  word: VocabWord,
  soundUniverse: readonly string[],
  variantSeed: string,
): PhonicsFinalChoiceQuestion | null {
  const sound = getFinalSound(word.word);
  if (sound === '') {
    return null;
  }
  const distractors = pickDistinct(
    soundUniverse,
    (s) => s,
    [sound, ...equivalentSounds(sound)],
    DISTRACTOR_COUNT,
    `${word.id}-pfc-${variantSeed}`,
  );
  if (distractors.length < DISTRACTOR_COUNT) {
    return null;
  }

  const candidateSounds = [sound, ...distractors];
  const order = seededShuffleIndices(4, `${word.id}-pfc-${variantSeed}-order`);
  const options = order.map((i) => candidateSounds[i]!) as [string, string, string, string];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-pfc-${word.id}-${variantSeed}`,
    topicId: word.topicId,
    kind: 'phonics-final-choice',
    word: word.word,
    wordId: word.id,
    emoji: word.emoji,
    sound,
    options,
    correctIndex,
    explanation: `Từ "${word.word}" kết thúc bằng âm "${sound}".`,
  };
}

function buildBlendChoiceVariant(
  word: VocabWord,
  blendUniverse: readonly string[],
  variantSeed: string,
): PhonicsBlendChoiceQuestion | null {
  const blend = getInitialBlend(word.word);
  if (blend === null) {
    return null;
  }
  const distractors = pickDistinct(
    blendUniverse,
    (s) => s,
    [blend],
    DISTRACTOR_COUNT,
    `${word.id}-pbc-${variantSeed}`,
  );
  if (distractors.length < DISTRACTOR_COUNT) {
    return null;
  }

  const candidateBlends = [blend, ...distractors];
  const order = seededShuffleIndices(4, `${word.id}-pbc-${variantSeed}-order`);
  const options = order.map((i) => candidateBlends[i]!) as [string, string, string, string];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-pbc-${word.id}-${variantSeed}`,
    topicId: word.topicId,
    kind: 'phonics-blend-choice',
    word: word.word,
    wordId: word.id,
    emoji: word.emoji,
    blend,
    options,
    correctIndex,
    explanation: `Từ "${word.word}" bắt đầu bằng cụm "${blend}".`,
  };
}

function buildRhymeChoiceVariant(
  word: VocabWord,
  partnerIds: ReadonlyMap<string, readonly string[]>,
  wordsById: ReadonlyMap<string, VocabWord>,
  distractorPool: readonly VocabWord[],
  variantSeed: string,
): PhonicsRhymeChoiceQuestion | null {
  const group = getRhymeGroup(word.word);
  const partners = partnerIds.get(word.id) ?? [];
  const correct = seededShuffleIndices(partners.length, `${word.id}-prc-${variantSeed}-partner`)
    .map((i) => wordsById.get(partners[i]!))
    .find((w): w is VocabWord => w !== undefined);
  if (!correct) {
    return null;
  }

  // Distractors must NOT share the target's rhyme group - a same-group
  // word is a second correct answer. Words that merely CONTAIN the target
  // (e.g. "notebook" for "book") are already non-rhymes by rhymesWith's
  // containment rule, but they reveal the correct answer visually, so keep
  // them out of distractors too.
  const targetTokens = word.word.trim().toLowerCase().split(/\s+/);
  const blocked = new Set<string>([word.id, correct.id]);
  const pool = pickDistinct(
    distractorPool,
    (w) => w.id,
    [...blocked],
    Math.min(distractorPool.length - 2, 12),
    `${word.id}-prc-${variantSeed}-pool`,
  );
  const distractors = pool
    .filter((w) => {
      if (getRhymeGroup(w.word) === group) {
        return false;
      }
      const wTokens = w.word.trim().toLowerCase().split(/\s+/);
      const contained =
        targetTokens.some((t) => wTokens.some((wt) => wt === t || wt.includes(t) || t.includes(wt))) ||
        wTokens.some((wt) => targetTokens.includes(wt));
      return !contained;
    })
    .slice(0, DISTRACTOR_COUNT);
  if (distractors.length < DISTRACTOR_COUNT) {
    return null;
  }

  const candidateWords = [correct, ...distractors];
  const order = seededShuffleIndices(4, `${word.id}-prc-${variantSeed}-order`);
  const options = order.map((i) => candidateWords[i]!.word) as [string, string, string, string];
  const optionWordIds = order.map((i) => candidateWords[i]!.id) as [string, string, string, string];
  const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;

  return {
    id: `q-prc-${word.id}-${variantSeed}`,
    topicId: word.topicId,
    kind: 'phonics-rhyme-choice',
    word: word.word,
    wordId: word.id,
    emoji: word.emoji,
    rhymeGroup: group,
    options,
    optionWordIds,
    correctIndex,
    explanation: `"${correct.word}" có vần giống "${word.word}".`,
  };
}

/**
 * CR-06 phonics generators (PRD section 15.2) - same pool shape as
 * generators/phonics.ts: every eligible word gets up to 2 deterministic
 * variants; the Round 4 composer draws a seeded slice via stratifiedSample.
 *
 * - final-choice: word + picture shown, student picks the final sound.
 *   Distractors come from the bank-derived final-sound universe and exclude
 *   same-phoneme keys (reuse of soundsSharePhoneme), same as sound-choice.
 * - blend-choice: only words where getInitialBlend is non-null generate;
 *   distractors are other blends that exist in the bank.
 * - rhyme-choice: only words with at least one real rhyme partner
 *   (rhymesWith - same group, no containment) generate; exactly one option
 *   rhymes with the prompt.
 */
export function generatePhonicsFinalChoiceQuestions(words: readonly VocabWord[]): PhonicsFinalChoiceQuestion[] {
  const soundUniverse = [...new Set(words.map((w) => getFinalSound(w.word)).filter((s) => s !== ''))];
  const questions: PhonicsFinalChoiceQuestion[] = [];

  for (const word of words) {
    for (const variantSeed of FINAL_VARIANT_SEEDS) {
      const question = buildFinalChoiceVariant(word, soundUniverse, variantSeed);
      if (question) {
        questions.push(question);
      }
    }
  }
  return questions;
}

export function generatePhonicsBlendChoiceQuestions(words: readonly VocabWord[]): PhonicsBlendChoiceQuestion[] {
  const blendUniverse = [
    ...new Set(words.map((w) => getInitialBlend(w.word)).filter((b): b is string => b !== null)),
  ];
  const questions: PhonicsBlendChoiceQuestion[] = [];

  for (const word of words) {
    for (const variantSeed of BLEND_VARIANT_SEEDS) {
      const question = buildBlendChoiceVariant(word, blendUniverse, variantSeed);
      if (question) {
        questions.push(question);
      }
    }
  }
  return questions;
}

export function generatePhonicsRhymeChoiceQuestions(words: readonly VocabWord[]): PhonicsRhymeChoiceQuestion[] {
  const wordsById = new Map(words.map((w) => [w.id, w]));
  // partnerIds: word.id -> ids of bank words that genuinely rhyme with it
  // (same group, no containment, not itself). Words with an empty partner
  // list are skipped entirely - a rhyme question needs a correct option.
  const partnerIds = new Map<string, string[]>();
  for (const word of words) {
    const partners = words.filter((candidate) => candidate.id !== word.id && rhymesWith(word.word, candidate.word));
    if (partners.length > 0) {
      partnerIds.set(word.id, partners.map((p) => p.id));
    }
  }

  const questions: PhonicsRhymeChoiceQuestion[] = [];
  for (const word of words) {
    if (!partnerIds.has(word.id)) {
      continue;
    }
    for (const variantSeed of RHYME_VARIANT_SEEDS) {
      const question = buildRhymeChoiceVariant(word, partnerIds, wordsById, words, variantSeed);
      if (question) {
        questions.push(question);
      }
    }
  }
  return questions;
}
