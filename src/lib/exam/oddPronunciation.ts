import type { OddPronunciationQuestion } from '../../types/exam';
import type { VocabWord } from '../../types';
import { getRhymeGroup, rhymesWith } from '../phonics/rhymes';
import { getInitialSound, soundsSharePhoneme } from '../phonics/initialSounds';
import { getFinalSound } from '../phonics/finalSounds';
import { pickDistinct, seededShuffleIndices } from '../prng';

/**
 * CR-24 - "Tìm từ phát âm khác" (IOE odd-one-out). Three options share a
 * pronunciation family, one does not. Three dimensions:
 *   - rhyme:   same rhyme family (cat/hat/bat vs dog)
 *   - initial: same starting phoneme (pen/pig/park vs sun)
 *   - final:   same ending phoneme (book/look/sit? - checked via
 *              getFinalSound, which returns the sounded final letter)
 * Only single-token words participate: the sound helpers are defined on
 * words, and two-word entries would make "which sounds different"
 * ambiguous.
 */

function singleToken(word: string): boolean {
  return /^[a-z'-]+$/i.test(word.trim()) && !word.trim().includes(' ');
}

type Dimension = OddPronunciationQuestion['dimension'];

function familyKey(word: string, dimension: Dimension): string {
  switch (dimension) {
    case 'rhyme':
      return `r:${getRhymeGroup(word)}`;
    case 'initial':
      return `i:${getInitialSound(word)}`;
    case 'final':
      return `f:${getFinalSound(word)}`;
  }
}

const DIMENSION_LABEL_VI: Record<Dimension, string> = {
  rhyme: 'vần',
  initial: 'âm đầu',
  final: 'âm cuối',
};

function sameSound(a: string, b: string, dimension: Dimension): boolean {
  if (dimension === 'rhyme') {
    return rhymesWith(a, b);
  }
  const key = (w: string) => (dimension === 'initial' ? getInitialSound(w) : getFinalSound(w));
  const ka = key(a);
  const kb = key(b);
  if (ka === kb) return true;
  // initial sounds have explicit phoneme equivalences (c/k, f/ph, ...)
  if (dimension === 'initial') {
    return soundsSharePhoneme(ka, kb);
  }
  return false;
}

/**
 * Builds every valid odd-one-out set: for each word, 3 family siblings +
 * the odd word out. Yields at most `maxPerWord` variants per odd word to
 * keep the pool curated.
 */
export function generateOddPronunciationQuestions(
  words: readonly VocabWord[],
): OddPronunciationQuestion[] {
  const singles = words.filter((w) => singleToken(w.word));
  const questions: OddPronunciationQuestion[] = [];
  const seenSignatures = new Set<string>();

  const dimensions: Dimension[] = ['rhyme', 'initial', 'final'];

  for (const dimension of dimensions) {
    // Group by family key, keeping only families with >= 3 members.
    const families = new Map<string, VocabWord[]>();
    for (const word of singles) {
      const key = familyKey(word.word, dimension);
      if (key.endsWith(':') || key.includes('solo:')) continue;
      const list = families.get(key) ?? [];
      list.push(word);
      families.set(key, list);
    }

    for (const [key, members] of families) {
      if (members.length < 3) continue;

      for (const odd of singles) {
        if (sameSound(members[0]!.word, odd.word, dimension)) continue;
        // Skip if odd accidentally rhymes/shares sound with any member
        if (members.some((m) => sameSound(m.word, odd.word, dimension))) continue;

        const trio = pickDistinct(members, (w) => w.id, [], 3, `${key}-${odd.id}`);
        if (trio.length < 3) continue;

        const candidateWords = [...trio.map((w) => w.word), odd.word];
        // The odd one out must be UNIQUE: none of the trio members may
        // share a sound with `odd`, already enforced above; also require
        // distinct display strings.
        if (new Set(candidateWords.map((w) => w.toLowerCase())).size !== 4) continue;

        const signature = [...candidateWords.map((w) => w.toLowerCase())].sort().join('|') + dimension;
        if (seenSignatures.has(signature)) continue;
        seenSignatures.add(signature);

        const order = seededShuffleIndices(4, `odd-${signature}`);
        const options = order.map((i) => candidateWords[i]!) as [string, string, string, string];
        const correctIndex = order.indexOf(3) as 0 | 1 | 2 | 3;

        questions.push({
          id: `q-odd-${dimension}-${questions.length}`,
          topicId: odd.topicId,
          kind: 'odd-pronunciation',
          dimension,
          options,
          correctIndex,
          explanation: `"${odd.word}" có ${DIMENSION_LABEL_VI[dimension]} khác với ${trio
            .map((w) => `"${w.word}"`)
            .join(', ')}.`,
        });
      }
    }
  }

  return questions;
}
