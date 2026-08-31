/**
 * Pure pronunciation-attempt scoring (Round 3 - plan.md v5 "Round 3 -
 * Pronunciation Recording"). This is explicitly an approximation based on
 * text similarity between the SpeechRecognition transcript and the target
 * word - NOT phoneme-level pronunciation analysis like a dedicated
 * pronunciation-coaching product. The UI discloses this plainly next to the
 * record control (see PronunciationRecordingQuestion.tsx).
 *
 * Scoring curve (documented per the task's "your judgment, document it"):
 * - Empty/whitespace-only transcript -> score 0, incorrect. Covers both a
 *   genuine "no speech detected" recognition outcome and an explicit skip
 *   (mic-permission-denied / unsupported-browser fallback).
 * - Exact match after normalization -> score 100, correct (full credit).
 * - Otherwise -> score = round((1 - editDistance / maxLength) * 100),
 *   clamped to [0, 100]. Levenshtein edit distance is a cheap, well-known
 *   proxy for "how close are these two strings" - a transcript that is one
 *   letter off from the target scores much higher than a totally different
 *   word, which is the right shape of "partial credit for a close attempt".
 * - isCorrect = score >= PRONUNCIATION_CORRECT_THRESHOLD (70). A 7-year-old
 *   reading a 3-4 letter word aloud, transcribed with minor STT noise (e.g.
 *   "kat" heard for "cat"), should still be graded as correct - grading
 *   letter-perfect would punish transcription noise, not real pronunciation
 *   mistakes.
 */
export const PRONUNCIATION_CORRECT_THRESHOLD = 70;

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

export interface PronunciationScoreResult {
  score: number;
  isCorrect: boolean;
}

/** Scores one pronunciation attempt - see the module doc comment for the curve. */
export function scorePronunciationAttempt(targetWord: string, transcript: string): PronunciationScoreResult {
  const normalizedTarget = normalizeForPronunciationComparison(targetWord);
  const normalizedTranscript = normalizeForPronunciationComparison(transcript);

  if (normalizedTranscript.length === 0) {
    return { score: 0, isCorrect: false };
  }

  if (normalizedTarget === normalizedTranscript) {
    return { score: 100, isCorrect: true };
  }

  const distance = levenshteinDistance(normalizedTarget, normalizedTranscript);
  const maxLength = Math.max(normalizedTarget.length, normalizedTranscript.length);
  const similarity = maxLength === 0 ? 0 : Math.max(0, 1 - distance / maxLength);
  const score = Math.round(similarity * 100);

  return { score, isCorrect: score >= PRONUNCIATION_CORRECT_THRESHOLD };
}
