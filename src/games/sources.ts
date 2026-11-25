import { seededPickN, seededShuffleIndices, hashString } from '../lib/prng';
import { getWordsByGrade } from '../lib/content/contentBank';
import { isLiteralImageWord, isFlagEmoji } from '../lib/content/imageSemantics';
import { COUNTING_ART } from '../lib/content/countingArt';
import { getRhymeGroup } from '../lib/phonics/rhymes';
import { getInitialSound } from '../lib/phonics/initialSounds';
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

/** CR-144 content guard (teacher audit + PO G-2): word ids that must
 *  never enter any game - negative-aspiration/tone-flagged vocab the
 *  teacher review marked unsafe for kids, and non-lexis badge labels
 *  that are not teachable vocabulary. Games amplify whatever the bank
 *  holds (SentenceScramble builds "I want to be a liar" from `liar`),
 *  so the pool gate sits here, at the single entry point. */
const GAME_BLOCKED_WORDS = new Set([
  'liar', 'villain', 'crazy', 'woozy', 'kiss', 'santa-claus', 'billiards',
  'pinata', 'aland',
  'ok-badge', 'new-badge', 'free-badge', 'vs-badge',
]);

/** Literal-emoji words only - every game shows the picture, so figurative
 *  entries (📹 for "vlog") would be unanswerable, same rule as generators.
 *  CR-144: minus the blocked ids above. */
function gameWordPool(gradeId: string): VocabWord[] {
  return getWordsByGrade(gradeId).filter(
    (w) => isLiteralImageWord(w) && !GAME_BLOCKED_WORDS.has(w.id),
  );
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
export function spellableWords(gradeId: string, seed: string, n: number, minLen = 3): VocabWord[] {
  const isG12 = gradeId === 'grade-1' || gradeId === 'grade-2';
  const maxLen = isG12 ? 6 : 8;
  const pool = gameWordPool(gradeId).filter(
    (w) => /^[a-zA-Z]+$/.test(w.word) && w.word.length >= minLen && w.word.length <= maxLen,
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
  // Filter BEFORE sampling (r158-1): sampling n then dropping <4-letter
  // words could return an empty run - the game would render blank and
  // never end.
  const words = spellableWords(gradeId, `${seed}:ml`, n, 4);
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
    // 3 distinct distractors (r158-3) - deduped; the pad fallback is a
    // repeated consonant run that can't collide with a real masked run.
    const options: string[] = [missing];
    for (let i = 0; options.length < 4 && i < 40; i++) {
      const d = distractorRun(missing, `${seed}:${word.id}:d${i}`);
      if (!options.includes(d)) options.push(d);
    }
    for (let c = 0; options.length < 4; c++) {
      const d = String.fromCharCode(98 + (c % 25)).repeat(missing.length);
      if (!options.includes(d)) options.push(d);
    }
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

/* ------------------------------------------------------------------ */
/* CR-147 sources - the three PO games (GAMEFI-DESIGN 3.4).             */
/* ------------------------------------------------------------------ */

/** Number words the Counting Shop answers with (g1-2 numbers unit). */
const NUM_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'] as const;

/** One counting-shop tray: a bespoke scene image of `count` objects. */
export interface CountingTray {
  slug: string;
  count: number;
  imageUrl: string;
}

/** One Counting Shop round: 1-2 trays to count, 4 number-word options. */
export interface CountingShopRound {
  trays: readonly CountingTray[];
  /** Total objects across trays - the answer. */
  total: number;
  options: readonly string[];
  correctIndex: number;
}

function countingTrays(gradeId: string): CountingTray[] {
  const g = `g${gradeId.replace(/\D/g, '')}`;
  const out: CountingTray[] = [];
  for (const [key, imageUrl] of Object.entries(COUNTING_ART)) {
    if (!imageUrl.includes(`/counting/${g}/`)) continue;
    const [slug, countStr] = key.split('|');
    const count = Number(countStr);
    if (slug && Number.isInteger(count) && count >= 1 && count <= 9) {
      out.push({ slug, count, imageUrl });
    }
  }
  return out;
}

/**
 * CR-147 "Cửa hàng của Heo" - count the objects on the tray, pick the
 * number word. L1 shows one tray; L2+ shows two trays and the child
 * counts the TOTAL (off-by-one distractors +-1/+-2, clamped 1..10).
 * Content is safe by construction: the answer lives inside the audited
 * image, so countability edge cases cannot leak in (GAMEFI G-NEW-1).
 */
export function countingShopRounds(gradeId: string, seed: string, n: number, trays = 1): CountingShopRound[] {
  const pool = countingTrays(gradeId);
  const picks = seededPickN(pool, Math.min(n * trays, pool.length), `${seed}:cs`);
  const rounds: CountingShopRound[] = [];
  for (let i = 0; i < Math.floor(picks.length / trays); i++) {
    const group = picks.slice(i * trays, i * trays + trays);
    const total = group.reduce((a, t) => a + t.count, 0);
    const candidates = new Set<number>([total, total - 1, total + 1, total - 2, total + 2]);
    const usable = [...candidates].filter((c) => c >= 1 && c <= 10 && c !== total);
    const optionNums: number[] = [total, ...seededPickN(usable, Math.min(3, usable.length), `${seed}:cs${i}:d`)];
    /* Totals near the 1..10 rail can yield <3 off-by-one distractors -
       pad with plain distant numbers so the field always holds 4. */
    for (let c = 1; optionNums.length < 4 && c <= 10; c++) {
      if (!optionNums.includes(c)) optionNums.push(c);
    }
    if (optionNums.length < 4) continue;
    const order = seededShuffleIndices(4, `${seed}:cs${i}:o`);
    const options = order.map((idx) => NUM_WORDS[optionNums[idx]! - 1]!);
    rounds.push({ trays: group, total, options, correctIndex: options.indexOf(NUM_WORDS[total - 1]!) });
  }
  return rounds;
}

/** One Rhyme Pond round: target word + 4 lily pads, exactly 1 mate. */
export interface RhymeRound {
  target: VocabWord;
  options: readonly VocabWord[];
  correctIndex: number;
  /** 'rhyme' matches the rime family; 'initial' matches first sound. */
  mode: 'rhyme' | 'initial';
}

/**
 * CR-147 "Ao vần" - hear the target word, pick the lily pad whose word
 * rhymes (L1/L3) or shares its initial sound (L2). Pool = the grade's
 * literal-image words minus blocked ids; correctness comes ONLY from
 * `rhymes.ts` + `initialSounds.ts` - blends/finals are never touched
 * (G-6: a wrong phonics game is worse than none).
 */
export function rhymeRounds(gradeId: string, seed: string, n: number, level = 1): RhymeRound[] {
  const pool = gameWordPool(gradeId).filter((w) => /^[a-zA-Z]+$/.test(w.word));
  const mode: 'rhyme' | 'initial' = level === 2 ? 'initial' : 'rhyme';
  const match = (a: string, b: string) =>
    mode === 'rhyme'
      ? getRhymeGroup(a) === getRhymeGroup(b) && !getRhymeGroup(a).startsWith('solo:')
      : getInitialSound(a) === getInitialSound(b) && getInitialSound(a) !== '';
  const rounds: RhymeRound[] = [];
  for (let attempt = 0; attempt < n * 8 && rounds.length < n; attempt++) {
    const [target] = seededPickN(pool, 1, `${seed}:rp${attempt}:t`);
    if (!target) continue;
    const mates = pool.filter((w) => w.id !== target.id && match(w.word, target.word));
    if (mates.length < 1) continue;
    const distractors = pool.filter((w) => w.id !== target.id && !match(w.word, target.word));
    const [mate] = seededPickN(mates, 1, `${seed}:rp${attempt}:m`);
    const picks = seededPickN(distractors, 3, `${seed}:rp${attempt}:d`);
    if (!mate || picks.length < 3) continue;
    const options4 = [...picks, mate];
    const order = seededShuffleIndices(4, `${seed}:rp${attempt}:o`);
    const shuffled = order.map((i) => options4[i]!);
    rounds.push({ target, options: shuffled, correctIndex: shuffled.indexOf(mate), mode });
  }
  return rounds;
}

/** CR-147 flag pool excludes (F6/F8 + non-sovereign territories). */
const FLAG_VOYAGE_EXCLUDE: ReadonlySet<string> = new Set([
  'european-union',
  'taiwan', 'hong-kong', 'macau', 'kosovo',
  'aland', 'guernsey', 'faroe-islands', 'gibraltar',
]);

/** One Flag Voyage round: "I am from ___" -> pick the flag. */
export interface FlagRound {
  word: VocabWord;
  options: readonly VocabWord[];
  correctIndex: number;
}

/**
 * CR-147 "Chuyến tàu cờ" (G4-5 only) - the ONLY surface allowed to
 * render flags. flagPool bypasses the global isFlagEmoji exclusion on
 * purpose (G-5); every other game keeps the ban.
 */
export function flagPool(gradeId: string): VocabWord[] {
  return getWordsByGrade(gradeId).filter(
    (w) => isFlagEmoji(w.emoji) && !FLAG_VOYAGE_EXCLUDE.has(w.id),
  );
}

export function flagRounds(gradeId: string, seed: string, n: number): FlagRound[] {
  const pool = flagPool(gradeId);
  const targets = seededPickN(pool, Math.min(n, pool.length), `${seed}:fv:t`);
  const rounds: FlagRound[] = [];
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const distractors = seededPickN(
      pool.filter((w) => w.id !== target.id),
      3,
      `${seed}:fv${i}:d`,
    );
    if (distractors.length < 3) continue;
    const options4 = [...distractors, target];
    const order = seededShuffleIndices(4, `${seed}:fv${i}:o`);
    const shuffled = order.map((i2) => options4[i2]!);
    rounds.push({ word: target, options: shuffled, correctIndex: shuffled.indexOf(target) });
  }
  return rounds;
}
