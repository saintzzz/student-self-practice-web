import { describe, expect, it } from 'vitest';
import { getInitialBlend } from './blends';
import { getInitialSound } from './initialSounds';
import { ALL_WORDS } from '../../data/vocabulary';

describe('getInitialBlend', () => {
  it('returns the 2-letter blend for regular blend-initial words', () => {
    expect(getInitialBlend('blue')).toBe('bl');
    expect(getInitialBlend('brown')).toBe('br');
    expect(getInitialBlend('cloud')).toBe('cl');
    expect(getInitialBlend('dress')).toBe('dr');
    expect(getInitialBlend('frog')).toBe('fr');
    expect(getInitialBlend('green')).toBe('gr');
    expect(getInitialBlend('train')).toBe('tr');
    expect(getInitialBlend('snake')).toBe('sn');
    expect(getInitialBlend('swan')).toBe('sw');
    expect(getInitialBlend('twelve')).toBe('tw');
  });

  it('returns the 3-letter blend when the cluster has 3 letters (checked before 2-letter prefixes)', () => {
    expect(getInitialBlend('street')).toBe('str');
    expect(getInitialBlend('three')).toBe('thr');
    expect(getInitialBlend('squirrel')).toBe('squ');
    expect(getInitialBlend('school')).toBe('sch');
  });

  it('returns null for single-consonant and vowel onsets', () => {
    expect(getInitialBlend('cat')).toBeNull();
    expect(getInitialBlend('dog')).toBeNull();
    expect(getInitialBlend('apple')).toBeNull();
    expect(getInitialBlend('monkey')).toBeNull();
  });

  it('returns null for digraph onsets - a digraph is one sound, not a blend', () => {
    expect(getInitialBlend('ship')).toBeNull();
    expect(getInitialBlend('sheep')).toBeNull();
    expect(getInitialBlend('chicken')).toBeNull();
    expect(getInitialBlend('chair')).toBeNull();
    expect(getInitialBlend('whale')).toBeNull();
    expect(getInitialBlend('phone')).toBeNull();
    // 'th' as in "thin" is a digraph; only "three"-style 'thr' is a blend.
    expect(getInitialBlend('thin')).toBeNull();
  });

  it('resolves multi-word entries on the first token', () => {
    expect(getInitialBlend('hot dog')).toBeNull();
    expect(getInitialBlend('teddy bear')).toBeNull();
    expect(getInitialBlend('palm tree')).toBeNull(); // 'palm' has no blend
    expect(getInitialBlend('green tea')).toBe('gr');
  });

  it('never disagrees with getInitialSound on the same word (blend implies the cluster, not a different sound)', () => {
    // For blend words the initial sound is the blend's FIRST letter
    // (street: blend 'str', initial sound 's'; three: blend 'thr',
    // initial sound 'th' digraph - the blend contains the digraph).
    for (const word of ALL_WORDS) {
      const blend = getInitialBlend(word.word);
      if (blend === null) continue;
      const initial = getInitialSound(word.word);
      expect(
        blend.startsWith(initial),
        `"${word.word}": blend "${blend}" must start with initial sound "${initial}"`,
      ).toBe(true);
    }
  });

  it('bank blend coverage: the audit-found clusters exist and at least 4 distinct blends are present', () => {
    const blends = new Set(
      ALL_WORDS.map((w) => getInitialBlend(w.word)).filter((b): b is string => b !== null),
    );
    expect(blends.size).toBeGreaterThanOrEqual(4);
    for (const cluster of ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'gr', 'st', 'tr', 'str']) {
      expect(blends.has(cluster), `bank must contain an "${cluster}-" word`).toBe(true);
    }
  });
});
