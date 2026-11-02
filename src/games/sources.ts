import { seededPickN, seededShuffleIndices, hashString } from '../lib/prng';
import { getWordsByGrade } from '../lib/content/contentBank';
import { isLiteralImageWord } from '../lib/content/imageSemantics';
import { generateImageChoiceQuestions } from '../lib/generators/imageChoice';
import { generateListeningImageChoiceQuestions } from '../lib/generators/listeningImageChoice';
import { generateWordOrderQuestions } from '../lib/exam/wordOrder';
import type { WordOrderQuestion } from '../types/exam';
import type {
  ImageChoiceQuestion,
  ListeningImageChoiceQuestion,
  VocabWord,
} from '../types';

/**
 * CR-83 QuestionSource adapters - games draw from the SAME vocabulary
 * pool + generators the Batch and Exam use, just seeded per play so a
 * replay is a fresh draw. No separate game question format exists; every
 * round object is a real `Question` union member.
 */

/** Literal-emoji words only - every game shows the picture, so figurative
 *  entries (📹 for "vlog") would be unanswerable, same rule as generators. */
function gameWordPool(gradeId: string): VocabWord[] {
  return getWordsByGrade(gradeId).filter(isLiteralImageWord);
}

/** Seeded pick of `n` usable words for a run. */
export function pickGameWords(gradeId: string, seed: string, n: number): VocabWord[] {
  return seededPickN(gameWordPool(gradeId), n, `${seed}:words`);
}

/**
 * `n` picture->word MCQ rounds (Racing/Tic-tac-toe). The generator gets
 * the full grade pool for fair distractors; we then pick one variant per
 * seeded word so each round has a distinct prompt word.
 */
export function imageChoiceRounds(
  gradeId: string,
  seed: string,
  n: number,
): ImageChoiceQuestion[] {
  const pool = gameWordPool(gradeId);
  const all = generateImageChoiceQuestions(pool as VocabWord[]);
  const words = seededPickN(pool, Math.min(n, pool.length), `${seed}:ic-words`);
  return words
    .map((w) => all.find((q) => q.wordId === w.id))
    .filter((q): q is ImageChoiceQuestion => !!q);
}

/** `n` audio->picture rounds (Balloon Pop). Same per-word slicing. */
export function listeningImageRounds(
  gradeId: string,
  seed: string,
  n: number,
): ListeningImageChoiceQuestion[] {
  const pool = gameWordPool(gradeId);
  const all = generateListeningImageChoiceQuestions(pool);
  const words = seededPickN(pool, Math.min(n, pool.length), `${seed}:lic-words`);
  return words
    .map((w) => all.find((q) => q.word === w.word))
    .filter((q): q is ListeningImageChoiceQuestion => !!q);
}

/**
 * `n` spellable words for Letter Catch - single alphabetic word, capped
 * length so bubbles fit the strip (G1-2 shorter, G3-5 longer).
 */
export function spellableWords(gradeId: string, seed: string, n: number): VocabWord[] {
  const isG12 = gradeId === 'grade-1' || gradeId === 'grade-2';
  const maxLen = isG12 ? 6 : 8;
  const pool = gameWordPool(gradeId).filter(
    (w) => /^[a-zA-Z]+$/.test(w.word) && w.word.length >= 3 && w.word.length <= maxLen,
  );
  return seededPickN(pool, Math.min(n, pool.length), `${seed}:spell`);
}

/* ------------------------------------------------------------------ */
/* CR-119 sources - three skill-gap games.                              */
/* ------------------------------------------------------------------ */

/** One missing-letter round: the masked display + the missing run. */
export interface MissingLetterRound {
  word: VocabWord;
  /** Letters still shown, with '_' placeholders kept spaced. */
  maskedWord: string;
  /** The letter run the child must pick, e.g. "in" in "w_ _dow" style. */
  missing: string;
  /** 4 options - the run + 3 distractor runs of equal length. */
  options: readonly string[];
  correctIndex: number;
}

const DISTRACT_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** Deterministic distractor letter run of `len`, excluding `answer`. */
function distractorRun(answer: string, key: string): string {
  const len = answer.length;
  for (let attempt = 0; attempt < 20; attempt++) {
    const order = seededShuffleIndices(26, `${key}:${attempt}`);
    const run = order.slice(0, len).map((i) => DISTRACT_LETTERS[i]!).join('');
    if (run !== answer) return run;
  }
  return 'qz';
}

/**
 * CR-119 "Điền chữ khuyết" - a picture+speaker prompt shows the word
 * with a contiguous internal run blanked (same masking philosophy as
 * the CR-24 exam generator: first and last letters always visible).
 * Options are 4 letter runs of equal length; one pick per round.
 */
export function missingLetterRounds(gradeId: string, seed: string, n: number): MissingLetterRound[] {
  const words = spellableWords(gradeId, `${seed}:ml`, n).filter((w) => w.word.length >= 4);
  const rounds: MissingLetterRound[] = [];
  for (const word of words) {
    const w = word.word.toLowerCase();
    // Run length: 4-6 letter words mask 1, 7+ mask 1-2 (mirrors the
    // exam generator's mild scaling).
    const runLen = w.length >= 7 ? 1 + (hashString(`${word.id}-mlen`) % 2) : 1;
    const maxStart = w.length - runLen - 1;
    const start = 1 + (hashString(`${word.id}-mstart`) % Math.max(1, maxStart));
    const missing = w.slice(start, start + runLen);
    const maskedWord = `${w.slice(0, start)}${'_ '.repeat(runLen).trim()}${w.slice(start + runLen)}`;
    const options = [
      missing,
      distractorRun(missing, `${seed}:${word.id}:d1`),
      distractorRun(missing, `${seed}:${word.id}:d2`),
      distractorRun(missing, `${seed}:${word.id}:d3`),
    ];
    const order = seededShuffleIndices(4, `${seed}:${word.id}:ord`);
    const shuffled = order.map((i) => options[i]!);
    rounds.push({
      word,
      maskedWord,
      missing,
      options: shuffled,
      correctIndex: shuffled.indexOf(missing),
    });
  }
  return rounds;
}

/**
 * CR-119 "Xếp câu" - word-order rounds straight from the CR-26 exam
 * generator + scorer (accepted alternates included), deduped by
 * sentence and seeded per play.
 */
export function wordOrderRounds(gradeId: string, seed: string, n: number): WordOrderQuestion[] {
  const pool = gameWordPool(gradeId);
  const all = generateWordOrderQuestions(pool);
  const seen = new Set<string>();
  const unique = all.filter((q) => {
    if (seen.has(q.sentence)) return false;
    seen.add(q.sentence);
    return true;
  });
  return seededPickN(unique, Math.min(n, unique.length), `${seed}:wo`);
}

/** One odd-one-out round: 3 same-topic words + 1 intruder. */
export interface OddOneOutRound {
  /** The four words shown (art + label), already ordered. */
  words: readonly VocabWord[];
  /** Index of the different-topic word. */
  correctIndex: number;
  /** The shared topic of the three in-group words. */
  groupTopicId: string;
}

/**
 * CR-119 "Chọn từ khác nhóm" - pick a topic with >=3 words in the
 * grade pool, take 3, add 1 word from a different topic. The seeded
 * shuffle decides which slot holds the intruder.
 */
export function oddOneOutRounds(gradeId: string, seed: string, n: number): OddOneOutRound[] {
  const pool = gameWordPool(gradeId);
  const byTopic = new Map<string, VocabWord[]>();
  for (const w of pool) {
    const list = byTopic.get(w.topicId) ?? [];
    list.push(w);
    byTopic.set(w.topicId, list);
  }
  const topics = [...byTopic.entries()].filter(([, ws]) => ws.length >= 3);
  if (topics.length < 2) return [];
  const rounds: OddOneOutRound[] = [];
  const topicOrder = seededShuffleIndices(topics.length, `${seed}:topic`);
  for (let i = 0; i < n && i < topics.length; i++) {
    // Deterministic topic choice without repeats in one run.
    const topicIdx = topicOrder[i % topics.length]!;
    const [topicId, members] = topics[topicIdx]!;
    const group = seededPickN(members, 3, `${seed}:${topicId}:g${i}`);
    // Intruder: any word from a different topic, seeded.
    const outsiders = pool.filter((w) => w.topicId !== topicId);
    const [intruder] = seededPickN(outsiders, 1, `${seed}:${topicId}:x${i}`);
    if (!intruder || group.length < 3) continue;
    const words = [...group, intruder];
    const order = seededShuffleIndices(4, `${seed}:${topicId}:o${i}`);
    const shuffled = order.map((idx) => words[idx]!);
    rounds.push({
      words: shuffled,
      correctIndex: shuffled.indexOf(intruder),
      groupTopicId: topicId,
    });
  }
  return rounds;
}
