import { beforeAll, describe, expect, it } from 'vitest';
import type { CountingImageOption, VocabWord } from '../../types';
import { ensureContentBank, allWords } from './contentBank';
import { getWordVisual } from '../emoji/wordVisual';
import { generateCountingImageQuestions } from '../generators/countingImage';
import { generateDescribeAndChooseImageQuestions } from '../generators/describeAndChooseImage';
import {
  countingArtKey,
  countingOptionArtUrl,
  resolveCountingGroupArt,
} from './countingArtResolve';

const opt = (word: string, count: number, wordId?: string): CountingImageOption => ({
  word,
  plural: `${word}s`,
  emoji: '❓',
  count,
  wordId,
});

beforeAll(async () => {
  await ensureContentBank();
});

describe('resolveCountingGroupArt (CR-145 r225)', () => {
  it('returns "single" only when EVERY option has bespoke counting art', () => {
    /* Manifest keys that exist today: cat|4, notebook|2, notebook|4,
       vet|2 - a set where every option is covered. */
    const covered = [opt('cat', 4), opt('notebook', 2), opt('notebook', 4), opt('vet', 2)];
    expect(resolveCountingGroupArt(covered)).toBe('single');
    /* One option outside the manifest drops the whole group tier. */
    const partial = [opt('cat', 4), opt('cat', 2), opt('notebook', 4), opt('vet', 2)];
    expect(resolveCountingGroupArt(partial)).not.toBe('single');
  });

  it('returns "repeat" when every option resolves concept art (wordId or word text)', () => {
    const byId = [opt('cat', 4, 'cat'), opt('cat', 2, 'cat'), opt('dog', 4, 'dog'), opt('apple', 3, 'apple')];
    expect(resolveCountingGroupArt(byId)).toBe('repeat');
    /* Legacy bank rows carry no wordId - word text resolves the id. */
    const byText = [opt('cat', 4), opt('cat', 2), opt('dog', 4), opt('apple', 3)];
    expect(resolveCountingGroupArt(byText)).toBe('repeat');
  });

  it('returns null when an option resolves no art at all', () => {
    const withUnknown = [opt('cat', 4, 'cat'), opt('dog', 2, 'dog'), opt('zz-no-such-word', 3)];
    expect(resolveCountingGroupArt(withUnknown)).toBeNull();
    expect(resolveCountingGroupArt([])).toBeNull();
  });

  it('countingOptionArtUrl serves the bespoke asset in single mode, concept art in repeat mode', () => {
    const cat4 = opt('cat', 4, 'cat');
    expect(countingOptionArtUrl(cat4, 'single')).toBe('/images/counting/g1/count-g1-cat-4-889749.webp');
    expect(countingOptionArtUrl(cat4, 'repeat')).toBe(getWordVisual('cat')?.imageUrl);
  });

  it('key slug matches the manifest format for multi-word options', () => {
    expect(countingArtKey(opt('bullet train', 3, 'x'))).toBe('bullet-train|3');
  });
});

describe('generated-question art coverage (CR-145 r225 proof)', () => {
  /* The r225 finding: 0/3,130 counting and 0/3,749 describe questions had
     bespoke art for every option. The repeat tier must make art actually
     reachable on the real bank. */
  const topics = (): Map<string, VocabWord[]> => {
    const map = new Map<string, VocabWord[]>();
    for (const w of allWords()) {
      const list = map.get(w.topicId) ?? [];
      list.push(w);
      map.set(w.topicId, list);
    }
    return map;
  };

  it('counting-image options resolve art for the large majority of generated questions', () => {
    let total = 0;
    let covered = 0;
    for (const words of topics().values()) {
      for (const q of generateCountingImageQuestions(words)) {
        if (q.direction !== 'count-to-image') continue;
        total += 1;
        if (resolveCountingGroupArt(q.options) !== null) covered += 1;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(covered / total).toBeGreaterThan(0.8);
  });

  it('describe-and-choose-image options resolve art for the large majority of generated questions', () => {
    let total = 0;
    let covered = 0;
    for (const words of topics().values()) {
      for (const q of generateDescribeAndChooseImageQuestions(words)) {
        total += 1;
        if (resolveCountingGroupArt(q.options) !== null) covered += 1;
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(covered / total).toBeGreaterThan(0.8);
  });
});
