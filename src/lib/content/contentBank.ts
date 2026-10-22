import type { VocabWord } from '../../types';

/**
 * On-demand content bank (CR-103).
 *
 * The vocabulary barrel (~290KB source), WORD_IPA (~33KB) and
 * COMMON_ENGLISH_WORDS (~51KB) are static data pulled into the eager
 * index chunk by every screen that merely wanted GRADES. This module
 * moves them behind ONE dynamic-import boundary:
 *
 *   - `ensureContentBank()` - await at a session/screen entry that is
 *     already async (grade pick prefetch, batch start, exam begin,
 *     game route mount, flashcard/placement mount). Idempotent +
 *     single-flight.
 *   - `warmupContentBank()` - fire-and-forget prefetch (grade select).
 *   - Sync proxies (`getWordsByGrade`, `allWords`, `wordIpa`,
 *     `isCommonEnglishWord`) keep the existing sync call sites unchanged
 *     - the sync state machine (batchSession, games/sources, placement,
 *     question renderers) is untouched.
 *
 * Invariant: every path that can reach a sync proxy first passes an
 * `await ensureContentBank()`. An unloaded read returns empty data and
 * logs once in dev - a loud signal in tests/e2e instead of a crash.
 */
type VocabModule = typeof import('../../data/vocabulary');

let vocab: VocabModule | null = null;
let ipaMap: Record<string, string> | null = null;
let commonWords: ReadonlySet<string> | null = null;
let inflight: Promise<void> | null = null;
let warnedUnloaded = false;

export function ensureContentBank(): Promise<void> {
  inflight ??= Promise.all([
    import('../../data/vocabulary'),
    import('../../data/ipaMap'),
    import('../../data/commonEnglishWords'),
  ]).then(([v, i, c]) => {
    vocab = v;
    ipaMap = i.WORD_IPA;
    commonWords = c.COMMON_ENGLISH_WORDS;
  }).then(() => undefined)
    .catch((err: unknown) => {
      /* r100: clear the cached rejection so a retry (flashcard rebuild,
         next session entry) can actually reload - a rejected inflight
         kept forever would make every later ensure fail identically. */
      inflight = null;
      throw err;
    });
  return inflight;
}

/** Prefetch without blocking - safe to call on every grade pick. A failed
 *  prefetch is ignored: the real session entries retry and handle it. */
export function warmupContentBank(): void {
  void ensureContentBank().catch(() => {});
}

export function contentBankReady(): boolean {
  return vocab !== null;
}

function unloaded(): void {
  // Test mode throws: a describe-scope or otherwise-unawaited read must
  // fail loudly here, never degrade to a vacuous pass on an empty pool.
  if (import.meta.env.MODE === 'test') {
    throw new Error(
      '[contentBank] sync read before ensureContentBank() resolved - ' +
      'call inside a test/beforeEach, or await the bank first',
    );
  }
  if (warnedUnloaded || !import.meta.env.DEV) return;
  warnedUnloaded = true;
  // eslint-disable-next-line no-console
  console.error(
    '[contentBank] sync read before ensureContentBank() resolved - ' +
    'a session entry point is missing the await (see contentBank.ts docblock)',
  );
}

const NO_WORDS: VocabWord[] = [];

export function getWordsByGrade(gradeId: string): VocabWord[] {
  if (!vocab) { unloaded(); return NO_WORDS; }
  return vocab.getWordsByGrade(gradeId);
}

export function getWordsByTopic(topicId: string): VocabWord[] {
  if (!vocab) { unloaded(); return NO_WORDS; }
  return vocab.getWordsByTopic(topicId);
}

export function allWords(): readonly VocabWord[] {
  if (!vocab) { unloaded(); return NO_WORDS; }
  return vocab.ALL_WORDS;
}

export function wordIpa(word: string): string | undefined {
  /* r100: null map = bank not loaded yet, not "word has no IPA" - guard
     so test-mode catches a missing ensure like the other proxies. */
  if (!ipaMap) { unloaded(); return undefined; }
  return ipaMap[word];
}

export function isCommonEnglishWord(word: string): boolean {
  if (!commonWords) { unloaded(); return false; }
  return commonWords.has(word);
}
