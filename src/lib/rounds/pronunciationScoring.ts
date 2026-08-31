/**
 * Pure pronunciation-attempt scoring (Round 3 - plan.md v5 "Round 3 -
 * Pronunciation Recording", enhanced per v8 "Round 3 Enhancement: Better
 * Pronunciation Scoring" / AC33). This is explicitly an approximation based
 * on text and phonetic-PATTERN similarity between the SpeechRecognition
 * transcript(s) and the target word - NOT phoneme-level IPA analysis or
 * acoustic/audio feature analysis like a dedicated pronunciation-coaching
 * product. The UI discloses this plainly next to the record control (see
 * PronunciationRecordingQuestion.tsx).
 *
 * ## Signals combined
 * 1. Text similarity - Levenshtein edit distance (unchanged from the v5
 *    version), normalized to [0, 1] by dividing by the longer string's
 *    length. This is the primary signal: it directly reflects what the
 *    recognizer actually heard.
 * 2. Phonetic similarity - a lightweight, hand-rolled Soundex/Metaphone-
 *    inspired consonant-sound code (see `simplifiedPhoneticCode`). Two
 *    words that are spelled differently but share the same consonant
 *    "skeleton" (e.g. "cat" vs "kat", "phone" vs "fone") get a high
 *    phonetic-similarity score even though their edit distance is poor.
 *    This is a secondary signal, weighted lower than text similarity, so a
 *    phonetically-plausible-but-textually-unrelated transcript can never
 *    reach "correct" on phonetic similarity alone.
 * 3. Recognition confidence (optional) - if the caller passes a
 *    `confidence` in [0, 1] (as reported by the browser's
 *    SpeechRecognitionAlternative.confidence), it nudges non-exact-match
 *    scores down by up to `1 - CONFIDENCE_MIN_FACTOR` (15%) at confidence 0,
 *    with no adjustment at confidence 1. This is a minor secondary nudge,
 *    not a dominant factor: low confidence on an otherwise-plausible match
 *    is itself a signal the recognizer struggled, which is informative
 *    feedback, but it should not by itself flip a good match to "wrong".
 * 4. Multiple alternative transcripts (optional) - if the caller passes
 *    `alternatives`, every non-empty candidate (the primary `transcript`
 *    plus each alternative) is scored independently and the BEST-scoring
 *    candidate wins. This handles the common case where a recognizer's
 *    top-ranked guess is slightly off but a lower-ranked alternative is a
 *    close or exact match.
 *
 * ## Scoring curve
 * - No non-empty candidate transcript at all (empty `transcript` AND no
 *   non-empty `alternatives`) -> score 0, incorrect. Covers "no speech
 *   detected" and an explicit skip (mic-permission-denied / unsupported-
 *   browser fallback).
 * - Exact match after normalization, for any candidate -> score 100,
 *   correct (full credit, confidence nudge does NOT apply - an exact
 *   transcript match is full credit regardless of the recognizer's
 *   self-reported confidence).
 * - Otherwise, per candidate: combinedSimilarity =
 *     TEXT_SIMILARITY_WEIGHT (0.7) * textSimilarity +
 *     PHONETIC_SIMILARITY_WEIGHT (0.3) * phoneticSimilarity
 *   then, if a confidence value was supplied, combinedSimilarity is
 *   multiplied by a confidenceFactor in [CONFIDENCE_MIN_FACTOR, 1] (linear
 *   in confidence). The final per-candidate score is
 *   round(combinedSimilarity * 100), clamped to [0, 100]. The best score
 *   across all candidates is returned.
 * - isCorrect = score >= PRONUNCIATION_CORRECT_THRESHOLD (70), unchanged.
 */
export const PRONUNCIATION_CORRECT_THRESHOLD = 70;

/** Text similarity carries most of the weight; phonetic similarity is a fairness boost, not a dominant signal. */
const TEXT_SIMILARITY_WEIGHT = 0.7;
const PHONETIC_SIMILARITY_WEIGHT = 0.3;

/** At confidence 0 a non-exact score is reduced by at most 15%; at confidence 1 there is no reduction. */
const CONFIDENCE_MIN_FACTOR = 0.85;

/** Lowercases, trims, and strips punctuation so "Cat!" and "cat" compare equal. */
export function normalizeForPronunciationComparison(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Classic Levenshtein edit distance (insertion/deletion/substitution), O(a.length * b.length). */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) distances[i]![0] = i;
  for (let j = 0; j < cols; j++) distances[0]![j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i]![j] = Math.min(
        distances[i - 1]![j]! + 1,
        distances[i]![j - 1]! + 1,
        distances[i - 1]![j - 1]! + substitutionCost,
      );
    }
  }

  return distances[rows - 1]![cols - 1]!;
}

/** Consonant-sound groups, Soundex-style. Vowels (and 'y') carry no code and are dropped. */
const PHONETIC_GROUP_MAP: Record<string, string> = {
  b: '1', f: '1', p: '1', v: '1',
  c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
  d: '3', t: '3',
  l: '4',
  m: '5', n: '5',
  r: '6',
};

/**
 * A lightweight, hand-rolled phonetic code inspired by Soundex/Metaphone -
 * NOT a faithful implementation of either, and NOT phoneme/IPA analysis.
 * Unlike classic Soundex, the first letter is also mapped to its consonant
 * group (rather than preserved literally), so common homophone-style
 * spelling variants that start with different letters for the same sound
 * (e.g. "cat"/"kat", "phone"/"fone") produce the same code. Steps:
 *   1. Keep letters only (a-z), lowercase.
 *   2. Normalize a handful of common English digraphs to their dominant
 *      sound ("ph"->"f", "wr"->"r", "kn"->"n", "gn"->"n", "ck"->"k",
 *      "qu"->"kw"). This list is deliberately small and not exhaustive.
 *   3. Map each remaining letter to its consonant group digit; vowels
 *      (and 'h', 'w', 'y') are dropped entirely.
 *   4. Collapse consecutive duplicate digits (e.g. "kk" -> "k"'s digit once).
 * The result is a variable-length digit string compared via edit distance
 * in `phoneticSimilarity` - simplified on purpose, and does not model every
 * real-world phonetic nuance (e.g. digraphs like "sh"/"ch"/"th" are not
 * distinguished from their component letters).
 */
export function simplifiedPhoneticCode(word: string): string {
  const letters = word
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/ph/g, 'f')
    .replace(/wr/g, 'r')
    .replace(/kn/g, 'n')
    .replace(/gn/g, 'n')
    .replace(/ck/g, 'k')
    .replace(/qu/g, 'kw');

  let digits = '';
  for (const letter of letters) {
    const digit = PHONETIC_GROUP_MAP[letter];
    if (digit) digits += digit;
  }

  return digits.replace(/(.)\1+/g, '$1');
}

/**
 * Phonetic similarity in [0, 1] between two (already-normalized) words,
 * based on edit distance between their `simplifiedPhoneticCode`s. Words
 * with no consonant sounds at all (e.g. purely vowel strings) are treated
 * as a neutral non-disagreement (1) rather than penalized for lack of
 * signal; if only one side has no consonant code, similarity is 0 since
 * there is nothing comparable.
 */
export function phoneticSimilarity(target: string, candidate: string): number {
  const targetCode = simplifiedPhoneticCode(target);
  const candidateCode = simplifiedPhoneticCode(candidate);

  if (targetCode.length === 0 && candidateCode.length === 0) return 1;
  if (targetCode.length === 0 || candidateCode.length === 0) return 0;

  const distance = levenshteinDistance(targetCode, candidateCode);
  const maxLength = Math.max(targetCode.length, candidateCode.length);
  return Math.max(0, 1 - distance / maxLength);
}

export interface PronunciationScoreResult {
  score: number;
  isCorrect: boolean;
}

/**
 * Optional richer-input signals for `scorePronunciationAttempt`. Both
 * fields are optional and additive - omitting this parameter entirely
 * preserves the original two-argument (targetWord, transcript) behavior.
 *
 * To use the enhanced scoring, a future caller needs to pass:
 * - `alternatives`: the other candidate transcripts from
 *   `SpeechRecognitionResult` (index 1+ when `maxAlternatives > 1`), as
 *   plain strings. Order does not matter - every candidate (the primary
 *   `transcript` plus each alternative) is scored and the best one wins.
 * - `confidence`: the `SpeechRecognitionAlternative.confidence` value
 *   (0-1) for the transcript being scored, if the browser reports one.
 */
export interface PronunciationScoringOptions {
  alternatives?: string[];
  confidence?: number;
}

/** Scores a single normalized candidate transcript against the normalized target. Returns a score in [0, 100]. */
function scoreCandidate(normalizedTarget: string, normalizedCandidate: string, confidence: number | undefined): number {
  if (normalizedCandidate.length === 0) {
    return 0;
  }

  if (normalizedTarget === normalizedCandidate) {
    return 100;
  }

  const distance = levenshteinDistance(normalizedTarget, normalizedCandidate);
  const maxLength = Math.max(normalizedTarget.length, normalizedCandidate.length);
  const textSimilarity = maxLength === 0 ? 0 : Math.max(0, 1 - distance / maxLength);
  const phoneticSimilarityScore = phoneticSimilarity(normalizedTarget, normalizedCandidate);

  let combinedSimilarity = TEXT_SIMILARITY_WEIGHT * textSimilarity + PHONETIC_SIMILARITY_WEIGHT * phoneticSimilarityScore;

  if (confidence !== undefined) {
    const clampedConfidence = Math.min(1, Math.max(0, confidence));
    const confidenceFactor = CONFIDENCE_MIN_FACTOR + (1 - CONFIDENCE_MIN_FACTOR) * clampedConfidence;
    combinedSimilarity *= confidenceFactor;
  }

  return Math.round(Math.min(1, Math.max(0, combinedSimilarity)) * 100);
}

/**
 * Scores one pronunciation attempt - see the module doc comment for the
 * curve. `options` is optional and backward compatible: existing callers
 * using `scorePronunciationAttempt(targetWord, transcript)` are unaffected.
 */
export function scorePronunciationAttempt(
  targetWord: string,
  transcript: string,
  options?: PronunciationScoringOptions,
): PronunciationScoreResult {
  const normalizedTarget = normalizeForPronunciationComparison(targetWord);
  const candidateTranscripts = [transcript, ...(options?.alternatives ?? [])];

  const normalizedCandidates = candidateTranscripts
    .map((candidate) => normalizeForPronunciationComparison(candidate))
    .filter((candidate) => candidate.length > 0);

  if (normalizedCandidates.length === 0) {
    return { score: 0, isCorrect: false };
  }

  const bestScore = Math.max(
    ...normalizedCandidates.map((candidate) => scoreCandidate(normalizedTarget, candidate, options?.confidence)),
  );

  return { score: bestScore, isCorrect: bestScore >= PRONUNCIATION_CORRECT_THRESHOLD };
}
