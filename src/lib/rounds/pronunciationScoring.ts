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
import { WORD_IPA } from '../../data/ipaMap';

export const PRONUNCIATION_CORRECT_THRESHOLD = 70;
/**
 * Pass bar for a server 'assess' accuracy verdict. Stricter than the
 * transcript threshold: the provider heard the audio, and the CR-90
 * corpus shows correct speech clusters at 95-100 while wrong words and
 * distorted attempts cluster at 40-80. 85 splits the bands cleanly.
 */
export const ASSESS_PASS_MIN = 85;

/** Text similarity carries most of the weight; phonetic similarity is a fairness boost, not a dominant signal. */
const TEXT_SIMILARITY_WEIGHT = 0.7;
const PHONETIC_SIMILARITY_WEIGHT = 0.3;

/** At confidence 0 a non-exact score is reduced by at most 15%; at confidence 1 there is no reduction. */
const CONFIDENCE_MIN_FACTOR = 0.85;

/**
 * CR-75: server-side STT (Whisper/Gemini) digitizes number words - a
 * child saying "one" comes back as "1.", which scored 0% against the
 * target "one" (edit distance 3 + empty phonetic code). Digit tokens map
 * back to their word forms before comparison. Covers the vocabulary's
 * one-ten plus the rest of 0-20 and the tens for safety.
 */
const DIGIT_TO_WORD: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
  '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
  '18': 'eighteen', '19': 'nineteen', '20': 'twenty', '30': 'thirty',
  '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy',
  '80': 'eighty', '90': 'ninety', '100': 'hundred', '1000': 'thousand',
};

/** Lowercases, trims, maps pure digit tokens to words ("1." -> "one"), then strips remaining
 *  punctuation and unmappable digits so "Cat!" -> "cat" and "1.0" can never fuse into "ten". */
export function normalizeForPronunciationComparison(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((token) => {
      // r25: digits + trailing sentence punctuation map ("1." -> "one");
      // digits fused with interior punctuation ("1.0", "3:30") must NOT
      // become a different number word after stripping.
      const digits = token.match(/^(\d+)[.,!?;:]*$/)?.[1];
      return digits !== undefined ? (DIGIT_TO_WORD[digits] ?? '') : token;
    })
    .join(' ')
    .replace(/[^a-z\s]/g, '')
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

/**
 * CR-90 phoneme layer. Both sides of the comparison normalize into ONE
 * compact phoneme code alphabet, so every token is comparable:
 *   - words present in WORD_IPA (the vocab bank, ~1.1k words) use their
 *     curated American IPA -> symbols folded to single-char codes;
 *   - out-of-vocabulary tokens (whatever the recognizer heard - "cut",
 *     "Kate", "elegant") go through a small rule-based grapheme->phoneme
 *     (`g2pCode`) that keeps vowel quality and digraphs.
 * The Soundex-style code above drops every vowel, so it is blind to the
 * exact errors Vietnamese kids make most (ship/sheep, bad/bed). This
 * code keeps them: ʃɪp -> "Sip" vs ʃip -> "SIp" now differ.
 */

/** IPA symbol -> code char. Longest match wins while scanning. */
const IPA_CODE_MAP: Record<string, string> = {
  'tʃ': 'C', 'ʧ': 'C', 'dʒ': 'J', 'ʤ': 'J',
  'iː': 'I', 'uː': 'u', 'ɜːr': 'R', 'ɜr': 'R', 'ər': 'R', 'ɚ': 'R',
  'aɪ': 'Y', 'aʊ': 'W', 'ɔɪ': 'Q', 'eɪ': 'A', 'oʊ': 'O',
  'ɪ': 'i', 'i': 'I', 'ɛ': 'E', 'e': 'E', 'æ': 'a',
  // schwa folds INTO the e-class so "elephant"/"elephent" spellings agree.
  'ʌ': 'V', 'ə': 'E', 'ɑː': 'o', 'ɑ': 'o', 'ɔː': 'o', 'ɔ': 'o', 'ɒ': 'o',
  'ʊ': 'U', 'u': 'u', 'o': 'O',
  'ʃ': 'S', 'ʒ': 'Z', 'θ': 'T', 'ð': 'D', 'ŋ': 'N', 'j': 'j',
  'ˈ': '', 'ˌ': '', 'ː': '', ' ': ' ', "'": '', '.': '',
};

function ipaToCode(ipa: string): string {
  let out = '';
  let i = 0;
  while (i < ipa.length) {
    let matched = false;
    for (const len of [3, 2]) {
      const sym = ipa.slice(i, i + len);
      const code = IPA_CODE_MAP[sym];
      if (code !== undefined) {
        out += code;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = ipa[i]!;
      out += IPA_CODE_MAP[ch] ?? (/[a-z]/.test(ch) ? ch : '');
      i += 1;
    }
  }
  return out;
}

/**
 * Compact rule-based grapheme->phoneme for OOV transcript words. Not a
 * real G2P - it only needs to be CONSISTENT with `ipaToCode` on common
 * words, so digraphs + short/long vowels + silent-e suffice. Applied to
 * lowercased a-z text.
 */
function g2pCode(word: string): string {
  // silent-e lengthens the preceding vowel (rate/kite/hope/cute)
  let w = word.replace(/([aeiou])([bcdfgjklmnpqrstvwxz]{1,2})e\b/g, (_m, v: string, c: string) => {
    const long: Record<string, string> = { a: 'A', e: 'I', i: 'Y', o: 'O', u: 'ju' };
    return (long[v] ?? v) + c;
  });
  // digraphs/trigraphs first (longest patterns before single letters)
  const rules: [RegExp, string][] = [
    [/tch/g, 'C'], [/dge/g, 'J'], [/sch/g, 'sk'],
    [/ph/g, 'f'], [/th/g, 'T'], [/sh/g, 'S'], [/ch/g, 'C'],
    [/ck/g, 'k'], [/qu/g, 'kw'], [/ng/g, 'N'], [/wh/g, 'w'],
    [/wr/g, 'r'], [/kn/g, 'n'], [/gn/g, 'n'], [/mb\b/g, 'm'], [/igh/g, 'Y'], [/gh/g, 'g'],
    [/ee/g, 'I'], [/ea/g, 'I'], [/ey/g, 'I'], [/ie/g, 'I'],
    [/ai/g, 'A'], [/ay/g, 'A'], [/oa/g, 'O'], [/ow/g, 'O'],
    [/oo/g, 'u'], [/ou/g, 'W'], [/au/g, 'o'], [/aw/g, 'o'],
    [/oi/g, 'Q'], [/oy/g, 'Q'],
    [/eer/g, 'ir'], [/ear/g, 'ir'], [/oor/g, 'or'],
    [/ar/g, 'Or'], [/or/g, 'or'], [/er/g, 'e'], [/ir/g, 'e'], [/ur/g, 'e'],
    [/c(?=[eiy])/g, 's'], [/g(?=[eiy])/g, 'J'],
    [/c/g, 'k'], [/x/g, 'ks'], [/y/g, 'i'],
  ];
  for (const [re, rep] of rules) w = w.replace(re, rep);
  // remaining single vowels -> short codes
  return w
    .replace(/a/g, 'a').replace(/e/g, 'E').replace(/i/g, 'i')
    .replace(/o/g, 'o').replace(/u/g, 'V')
    .replace(/(.)\1+/g, '$1'); // collapse doubled consonants (ll, ss)
}

/** One phoneme code per token; WORD_IPA when curated, else g2pCode. */
export function phonemeCode(word: string): string {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!lower) return '';
  const ipa = WORD_IPA[lower];
  return ipa ? ipaToCode(ipa) : g2pCode(lower);
}

/**
 * Phoneme-level similarity in [0,1] - the best token pair across both
 * sides (a transcript like "a cat" still matches target "cat"). A final
 * plural -s/-z on the heard word is scored both ways ("cats" ~ "cat" =
 * perfect) since a correctly pronounced word is often transcribed with
 * a stray plural marker.
 */
export function phonemeSimilarity(target: string, candidate: string): number {
  const tCodes = target.split(' ').map(phonemeCode).filter(Boolean);
  const cCodes = candidate.split(' ').map(phonemeCode).filter(Boolean);
  if (tCodes.length === 0 || cCodes.length === 0) return 0;

  let best = 0;
  for (const t of tCodes) {
    for (const c of cCodes) {
      for (const cv of [c, c.replace(/[sz]$/, '')]) {
        if (!cv) continue;
        const distance = levenshteinDistance(t, cv);
        best = Math.max(best, 1 - distance / Math.max(t.length, cv.length));
      }
    }
  }
  return best;
}

/**
 * Whole-utterance phoneme identity: the JOINED phoneme codes of target
 * and candidate must match exactly (a trailing stray -s/-z tolerated).
 * Best-pair `phonemeSimilarity` is lenient by design (it rescues "a cat"
 * for "cat"), but the homophone floor must NOT - it must reject partial
 * phrases ("red" for "red apple"), reordered words ("apple red"), and
 * dropped repetitions ("know" for "no no"). r49 + r51.
 */
function phonemeCompleteMatch(target: string, candidate: string): boolean {
  const tJoin = target.split(' ').map(phonemeCode).filter(Boolean).join('');
  const cJoin = candidate.split(' ').map(phonemeCode).filter(Boolean).join('');
  if (!tJoin || !cJoin) return false;
  // r52: strict identity - a 0.99 ratio would let one edit slip past
  // once the joined stream reaches ~100 characters.
  return [cJoin, cJoin.replace(/[sz]$/, '')].some((v) => v !== '' && v === tJoin);
}

/**
 * A candidate that is a phonemically DIFFERENT word below this floor is a
 * miss, not a near-success - otherwise text similarity alone lets "sheep"
 * pass for "ship". Homophones (two/too, eight/ate) resolve to identical
 * codes and sail through at 1.0 - correct behavior.
 */
const IPA_ACCEPT_MIN = 0.8;

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
 * - `serverScore`: pronunciation accuracy (0-100) returned by the
 *   practice-transcribe 'assess' mode - the provider listened to the
 *   audio directly, so it is a real pronunciation judgment that text
 *   similarity can never produce. When present it IS the score and the
 *   local similarity math is skipped entirely.
 */
export interface PronunciationScoringOptions {
  alternatives?: string[];
  confidence?: number;
  serverScore?: number;
}

/**
 * CR-90 follow-up (r60): the assess grader's top-3 "heard" guesses are
 * NOT independent acoustic evidence - the same target-aware model emits
 * them, so a listed target can be self-fulfilling. Promoting a failed
 * accuracy to a pass on that basis inflates scores (the hen/pen minimal
 * pair cuts both ways). What the signal legitimately supports is a
 * RETRY: the verdict was ambiguous (accuracy in the grey band, the
 * grader itself listed a target-sounding alternative), so the attempt
 * deserves a free re-read instead of an instant fail - same affordance
 * as the CR-83 mishear guard. The caller (recording hook) routes true
 * to the retryable error phase; the scorer itself keeps the provider
 * verdict untouched.
 */
export const ASSESS_AMBIGUOUS_MIN = 50;
export function assessAmbiguousRetry(
  targetWord: string,
  serverScore: number | undefined,
  alternatives: string[] | undefined,
): boolean {
  if (typeof serverScore !== 'number' || !Number.isFinite(serverScore)) return false;
  if (serverScore >= ASSESS_PASS_MIN || serverScore < ASSESS_AMBIGUOUS_MIN) return false;
  if (!alternatives?.length) return false;
  const normalizedTarget = normalizeForPronunciationComparison(targetWord);
  if (!normalizedTarget) return false;
  return alternatives.some(
    (alt) =>
      normalizeForPronunciationComparison(alt).length > 0 &&
      phonemeCompleteMatch(normalizedTarget, normalizeForPronunciationComparison(alt)),
  );
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
  // CR-90: phoneme-level similarity (WORD_IPA + g2p fallback) replaces the
  // vowel-blind Soundex code - it is the signal that actually hears
  // ship-vs-sheep.
  const phoneme = phonemeSimilarity(normalizedTarget, normalizedCandidate);

  let combinedSimilarity = TEXT_SIMILARITY_WEIGHT * textSimilarity + PHONETIC_SIMILARITY_WEIGHT * phoneme;

  if (confidence !== undefined) {
    const clampedConfidence = Math.min(1, Math.max(0, confidence));
    const confidenceFactor = CONFIDENCE_MIN_FACTOR + (1 - CONFIDENCE_MIN_FACTOR) * clampedConfidence;
    combinedSimilarity *= confidenceFactor;
  }

  let score = Math.round(Math.min(1, Math.max(0, combinedSimilarity)) * 100);
  // CR-90: identical phoneme codes mean the recognizer heard the SAME
  // pronunciation with a different spelling ("eight" -> "ate") - that is
  // a correct utterance whatever the edit distance says. Requires every
  // target token covered (r49: "red" must not floor for "red apple").
  // The floor rides the same confidence factor so an unsure hypothesis
  // is still softer than a confident one.
  if (phoneme >= 0.99 && phonemeCompleteMatch(normalizedTarget, normalizedCandidate)) {
    const confidenceFactor =
      confidence === undefined
        ? 1
        : CONFIDENCE_MIN_FACTOR + (1 - CONFIDENCE_MIN_FACTOR) * Math.min(1, Math.max(0, confidence));
    score = Math.max(score, Math.round(95 * confidenceFactor));
  }
  // CR-90 hard gate: a transcript that is a phonemically different real
  // word (below the phoneme floor) is a miss, not a near-success.
  if (phoneme < IPA_ACCEPT_MIN) {
    score = Math.min(score, PRONUNCIATION_CORRECT_THRESHOLD - 1);
  }
  return score;
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
  // CR-90: a server 'assess' verdict short-circuits text similarity - the
  // provider heard the audio and graded it against the target directly.
  // Corpus calibration (48 synthetic clips, CR-90 eval): clearly-correct
  // speech lands 95-100 while wrong words / distorted attempts sit at
  // 60-80, so the pass bar for audio-graded attempts is stricter than the
  // transcript path's 70.
  const server = options?.serverScore;
  if (typeof server === 'number' && Number.isFinite(server)) {
    const score = Math.round(Math.min(100, Math.max(0, server)));
    return { score, isCorrect: score >= ASSESS_PASS_MIN };
  }

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
