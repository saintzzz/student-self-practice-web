import { describe, expect, it } from 'vitest';
import { getRhymeGroup, rhymesWith } from './rhymes';
import { ALL_WORDS } from '../../data/vocabulary';

describe('getRhymeGroup', () => {
  it('groups same-spelling rime families together', () => {
    expect(getRhymeGroup('cake')).toBe(getRhymeGroup('snake'));
    expect(getRhymeGroup('book')).toBe(getRhymeGroup('cook'));
    expect(getRhymeGroup('cat')).toBe(getRhymeGroup('hat'));
    expect(getRhymeGroup('sheep')).toBe(getRhymeGroup('sleep'));
    expect(getRhymeGroup('goat')).toBe(getRhymeGroup('boat'));
  });

  it('splits look-alike spellings that do not actually rhyme (overrides)', () => {
    // The audit's documented false-positives.
    expect(rhymesWith('mountain', 'rain')).toBe(false);
    expect(rhymesWith('elephant', 'ant')).toBe(false);
    expect(rhymesWith('two', 'piano')).toBe(false);
    expect(rhymesWith('shoe', 'piano')).toBe(false);
    expect(rhymesWith('cow', 'snow')).toBe(false);
    expect(rhymesWith('hot', 'parrot')).toBe(false);
    expect(rhymesWith('fly', 'happy')).toBe(false);
    expect(rhymesWith('chocolate', 'skate')).toBe(false);
    expect(rhymesWith('read', 'bread')).toBe(false);
    expect(rhymesWith('cookie', 'pie')).toBe(false);
    expect(rhymesWith('lion', 'onion')).toBe(false);
    expect(rhymesWith('scared', 'red')).toBe(false);
    expect(rhymesWith('foot', 'boot')).toBe(false);
    expect(rhymesWith('one', 'saxophone')).toBe(false);
    expect(rhymesWith('ear', 'bear')).toBe(false);
    expect(rhymesWith('juice', 'dice')).toBe(false);
  });

  it('merges true rhymes across different spellings', () => {
    expect(rhymesWith('plane', 'rain')).toBe(true);
    expect(rhymesWith('plane', 'train')).toBe(true);
    expect(rhymesWith('square', 'bear')).toBe(true);
    expect(rhymesWith('chair', 'pear')).toBe(true);
    expect(rhymesWith('one', 'sun')).toBe(true);
    expect(rhymesWith('one', 'run')).toBe(true);
    expect(rhymesWith('bread', 'red')).toBe(true);
    expect(rhymesWith('bread', 'bed')).toBe(true);
    expect(rhymesWith('two', 'shoe')).toBe(true);
    expect(rhymesWith('two', 'canoe')).toBe(true);
    expect(rhymesWith('two', 'blue')).toBe(true);
    expect(rhymesWith('two', 'kangaroo')).toBe(true);
    expect(rhymesWith('cry', 'fly')).toBe(true);
    expect(rhymesWith('cry', 'butterfly')).toBe(true);
    // fly vs butterfly share the i-rime group but 'fly' is embedded in
    // 'butterfly' - the containment exclusion keeps them apart (like
    // hot dog/dog) so the answer is never visible inside an option.
    expect(rhymesWith('fly', 'butterfly')).toBe(false);
  });

  it('resolves multi-word entries on the last token', () => {
    expect(rhymesWith('hot dog', 'frog')).toBe(true);
    expect(rhymesWith('teddy bear', 'pear')).toBe(true);
    expect(rhymesWith('palm tree', 'bee')).toBe(true);
  });
});

describe('rhymesWith - containment exclusion', () => {
  it('a word never rhymes with itself', () => {
    expect(rhymesWith('dog', 'dog')).toBe(false);
  });

  it('excludes pairs where one word contains the other as a token or embedded compound', () => {
    expect(rhymesWith('dog', 'hot dog')).toBe(false);
    expect(rhymesWith('tennis', 'table tennis')).toBe(false);
    expect(rhymesWith('fish', 'jellyfish')).toBe(false);
    expect(rhymesWith('tree', 'palm tree')).toBe(false);
    expect(rhymesWith('bear', 'teddy bear')).toBe(false);
    expect(rhymesWith('book', 'notebook')).toBe(false);
    expect(rhymesWith('cake', 'pancake')).toBe(false);
    expect(rhymesWith('ball', 'basketball')).toBe(false);
  });

  it('still rhymes genuinely distinct words inside the same spelled family', () => {
    expect(rhymesWith('frog', 'dog')).toBe(true);
    expect(rhymesWith('hedgehog', 'frog')).toBe(true);
    expect(rhymesWith('basketball', 'volleyball')).toBe(true);
    expect(rhymesWith('book', 'cook')).toBe(true);
    expect(rhymesWith('notebook', 'cook')).toBe(true);
  });
});

describe('rhyme coverage over the real bank', () => {
  it('at least 10 words have a real rhyme partner (a usable question pool)', () => {
    const withPartners = ALL_WORDS.filter((w) =>
      ALL_WORDS.some((other) => other.id !== w.id && rhymesWith(w.word, other.word)),
    );
    expect(withPartners.length).toBeGreaterThanOrEqual(10);
  });

  it('rhymesWith is symmetric on every bank pair', () => {
    for (const a of ALL_WORDS) {
      for (const b of ALL_WORDS) {
        expect(rhymesWith(a.word, b.word), `rhymesWith("${a.word}","${b.word}") must equal its mirror`).toBe(
          rhymesWith(b.word, a.word),
        );
      }
    }
  });
});
