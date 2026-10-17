import type { ListeningSentenceFillBlankQuestion, VocabWord } from '../../types';
import { blankOutWord, sentencesForWord } from '../generators/listeningSentenceFillBlank';
import { seededShuffleIndices } from '../prng';
import { GAP_BANK_TOPICS, HOMOPHONE_PAIRS } from './gapBankTopics';

/**
 * CR-82 (DESIGN-SPEC-v5 s13.5, R-v5-08 / R2-1): the G1-2 gap word-bank
 * validator. A bank is offered only when EVERY distractor is plausible
 * in isolation (reads as a correct, natural sentence in the displayed
 * stem - V2 frame match + V3 reviewed semantic group) yet contradicted
 * by the spoken sentence (V1/V4/V5/V7). Failing any of V0-V7 makes the
 * item typed-only; V8 (playback failure) is enforced by the component
 * at play time, not here.
 */

/** s13.5 step 1: NFC, trim, lowercase, strip everything that is not a
 *  letter/digit/inner space, collapse space runs. */
export function norm(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Whole-word containment on normalized text (words are separated by
 *  single spaces after norm, so boundary = string edge or a space). */
function containsWholeWord(haystack: string, needle: string): number {
  if (needle === '') return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return count;
    const before = at === 0 || haystack[at - 1] === ' ';
    const after = at + needle.length === haystack.length || haystack[at + needle.length] === ' ';
    if (before && after) count += 1;
    from = at + 1;
  }
}

/** s13.5 V5 inline Levenshtein (no dependency). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

function isHomophonePair(a: string, b: string): boolean {
  return HOMOPHONE_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

/** V4 plural check: `x.word`'s norm equals `y`'s declared plural, or the
 *  naive +s/+es spelling of `y.word` (covers fixture words with no
 *  plural field). */
function isPluralOf(x: VocabWord, y: VocabWord): boolean {
  const xNorm = norm(x.word);
  const yNorm = norm(y.word);
  if (xNorm === '' || yNorm === '') return false;
  if (y.plural && xNorm === norm(y.plural)) return true;
  return xNorm === `${yNorm}s` || xNorm === `${yNorm}es`;
}

export interface GapBankValidationInput {
  question: ListeningSentenceFillBlankQuestion;
  /** The VocabWord behind question.wordId (needed for topic + plural). */
  answer: VocabWord;
  /** Exactly the proposed bank distractors (answer excluded). */
  distractors: readonly VocabWord[];
  /** 'sentence' when the item really plays the sentence audio (V7). */
  audio: 'sentence' | 'none';
}

export interface GapBankValidation {
  eligible: boolean;
  reasons: string[];
}

export function validateGapBank(input: GapBankValidationInput): GapBankValidation {
  const { question, answer, distractors, audio } = input;
  const reasons: string[] = [];

  /* V0 - shape / minimum size: exactly 2 distractors (bank = 3 options),
     each non-empty after norm. */
  if (distractors.length !== 2) {
    reasons.push(`V0: expected exactly 2 distractors, got ${distractors.length}`);
  } else {
    distractors.forEach((d, i) => {
      if (norm(d.word) === '') reasons.push(`V0: distractor ${i} ("${d.word}") is empty after norm`);
    });
  }

  /* V1 - audio identity: the sentence contains the answer exactly once
     as a whole word and blankOutWord reproduces displaySentence. */
  const answerOccurrences = containsWholeWord(norm(question.sentence), norm(question.word));
  if (answerOccurrences !== 1) {
    reasons.push(`V1: sentence contains the answer ${answerOccurrences} times (expected exactly once)`);
  }
  if (blankOutWord(question.sentence, question.word) !== question.displaySentence) {
    reasons.push('V1: blankOutWord(sentence, word) does not reproduce displaySentence');
  }

  /* V2 - frame match: each distractor's own sentence set must produce
     this exact blanked stem (rejects class/article/countability
     mismatches like chef/owl/salt). */
  for (const d of distractors) {
    const frames = sentencesForWord(d).map((s) => blankOutWord(s, d.word));
    if (!frames.includes(question.displaySentence)) {
      reasons.push(`V2: "${d.word}" never yields the stem "${question.displaySentence}"`);
    }
  }

  /* V3 - reviewed topic allowlist (+ optional semantic groups). */
  const topicEntry = GAP_BANK_TOPICS[answer.topicId];
  if (!topicEntry) {
    reasons.push(`V3: topic "${answer.topicId}" is not in GAP_BANK_TOPICS`);
  } else if (topicEntry.groups) {
    const group = topicEntry.groups.find(
      (g) => g.includes(answer.id) && distractors.every((d) => g.includes(d.id)),
    );
    if (!group) {
      reasons.push(`V3: answer and distractors are not in one reviewed group of ${answer.topicId}`);
    }
  }

  /* V4 - pairwise distinct: norm differs, not a plural pair, not a
     homophone pair - over all 3 options. */
  const all: readonly VocabWord[] = [answer, ...distractors];
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i]!;
      const b = all[j]!;
      if (norm(a.word) === norm(b.word)) {
        reasons.push(`V4: "${a.word}" and "${b.word}" normalize to the same option`);
      }
      if (isPluralOf(a, b) || isPluralOf(b, a)) {
        reasons.push(`V4: "${a.word}" / "${b.word}" are a plural pair`);
      }
      if (isHomophonePair(norm(a.word), norm(b.word))) {
        reasons.push(`V4: "${a.word}" / "${b.word}" are a homophone pair`);
      }
    }
  }

  /* V5 - audible contrast: every option pair keeps Levenshtein >= 2
     (one-letter minimal pairs like cat/hat are not fair to G1-2 ears). */
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const distance = levenshtein(norm(all[i]!.word), norm(all[j]!.word));
      if (distance < 2) {
        reasons.push(`V5: "${all[i]!.word}" / "${all[j]!.word}" are only ${distance} edit(s) apart`);
      }
    }
  }

  /* V6 - no stem leak: neither distractor nor the answer may appear
     elsewhere in the displayed (blanked) sentence. */
  const stem = norm(question.displaySentence);
  for (const w of all) {
    if (containsWholeWord(stem, norm(w.word)) > 0) {
      reasons.push(`V6: "${w.word}" already appears in the displayed stem`);
    }
  }

  /* V7 - audio required: a context-only (silent) variant is never
     bank-eligible (without audio the frame-matched distractors are
     mutually valid - Workstream A F2). */
  if (audio !== 'sentence' || norm(question.sentence) === '') {
    reasons.push('V7: item has no sentence audio');
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Generator walk (s13.5 step 2): candidates = same-topic pool words in
 * seeded order; the first pair passing validateGapBank becomes the bank,
 * shuffled with the answer under the question's seed. Returns null when
 * no pair validates - banks are never padded or partially filled.
 */
export function pickGapBank(
  question: ListeningSentenceFillBlankQuestion,
  pool: readonly VocabWord[],
  seed: string,
): { options: readonly [string, string, string]; optionWordIds: readonly [string, string, string] } | null {
  const answer = pool.find((w) => w.id === question.wordId);
  if (!answer) return null;

  const sameTopic = pool.filter((w) => w.topicId === answer.topicId && w.id !== answer.id);
  const order = seededShuffleIndices(sameTopic.length, `${seed}-gap-candidates`);

  for (let i = 0; i < order.length; i += 1) {
    for (let j = i + 1; j < order.length; j += 1) {
      const pair: readonly VocabWord[] = [sameTopic[order[i]!]!, sameTopic[order[j]!]!];
      const verdict = validateGapBank({ question, answer, distractors: pair, audio: 'sentence' });
      if (verdict.eligible) {
        const trio = [answer, pair[0], pair[1]] as const;
        const shuffle = seededShuffleIndices(3, `${seed}-gap-options`);
        const options = shuffle.map((k) => trio[k]!.word) as unknown as readonly [string, string, string];
        const optionWordIds = shuffle.map((k) => trio[k]!.id) as unknown as readonly [string, string, string];
        return { options, optionWordIds };
      }
      if (import.meta.env?.DEV && import.meta.env?.MODE !== 'test' && i < 3) {
        /* Dev-only reason logging (s13.5 step 4) - keeps production and
           the vitest output silent (thousands of candidates per sweep). */
        console.debug(`[gapBank] ${question.id} pair ${pair[0].id}+${pair[1].id} rejected`, verdict.reasons);
      }
    }
  }
  return null;
}
