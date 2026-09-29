import { describe, expect, it } from 'vitest';
import { equivalentSounds, getInitialSound, getSoundUtterance, soundsSharePhoneme } from './initialSounds';
import { ALL_WORDS } from '../../data/vocabulary';

describe('getInitialSound', () => {
  it('returns the first lowercase letter for regular words', () => {
    expect(getInitialSound('cat')).toBe('c');
    expect(getInitialSound('Apple')).toBe('a');
    expect(getInitialSound('dog')).toBe('d');
  });

  it('maps consonant digraphs to their own sound group', () => {
    expect(getInitialSound('chicken')).toBe('ch');
    expect(getInitialSound('chair')).toBe('ch');
    expect(getInitialSound('sheep')).toBe('sh');
    expect(getInitialSound('ship')).toBe('sh');
    expect(getInitialSound('three')).toBe('th');
  });

  it('resolves multi-word entries on the first token', () => {
    expect(getInitialSound('hot dog')).toBe('h');
    expect(getInitialSound('bubble tea')).toBe('b');
  });

  it('collapses wh- to the w group (the /w/ sound Grade 2 teaches)', () => {
    expect(getInitialSound('white')).toBe('w');
    expect(getInitialSound('whale')).toBe('w');
  });

  it('applies the spelling-vs-sound exceptions for bank words', () => {
    expect(getInitialSound('chef')).toBe('sh');
    expect(getInitialSound('giraffe')).toBe('j');
    expect(getInitialSound('circle')).toBe('s');
    expect(getInitialSound('write')).toBe('r');
    expect(getInitialSound('one')).toBe('w');
  });

  it('every word in the real bank resolves to a valid sound key', () => {
    for (const word of ALL_WORDS) {
      expect(
        getInitialSound(word.word),
        `word "${word.word}" must resolve to a letter or digraph`,
      ).toMatch(/^(ch|sh|th|[a-z])$/);
    }
  });

  it('bank sound coverage: digraph groups are non-empty (ch/sh/th words exist)', () => {
    const sounds = new Set(ALL_WORDS.map((w) => getInitialSound(w.word)));
    expect(sounds.has('ch')).toBe(true);
    expect(sounds.has('sh')).toBe(true);
    expect(sounds.has('th')).toBe(true);
  });
});

describe('soundsSharePhoneme / equivalentSounds', () => {
  it('a key shares a phoneme with itself', () => {
    expect(soundsSharePhoneme('c', 'c')).toBe(true);
    expect(soundsSharePhoneme('sh', 'sh')).toBe(true);
  });

  it('c and k share the /k/ phoneme, but not with other keys', () => {
    expect(soundsSharePhoneme('c', 'k')).toBe(true);
    expect(soundsSharePhoneme('k', 'c')).toBe(true);
    expect(soundsSharePhoneme('c', 'ch')).toBe(false);
    expect(soundsSharePhoneme('k', 'q')).toBe(false);
    expect(soundsSharePhoneme('s', 'sh')).toBe(false);
  });

  it('equivalentSounds returns the other keys of the same phoneme group', () => {
    expect(equivalentSounds('c')).toEqual(['k']);
    expect(equivalentSounds('k')).toEqual(['c']);
    expect(equivalentSounds('a')).toEqual([]);
    expect(equivalentSounds('sh')).toEqual([]);
  });
});

describe('getSoundUtterance', () => {
  it('speaks "key, as in example" instead of the bare letter name', () => {
    expect(getSoundUtterance('c')).toBe('c, as in cat');
    expect(getSoundUtterance('ch')).toBe('ch, as in chicken');
    expect(getSoundUtterance('sh')).toBe('sh, as in ship');
    expect(getSoundUtterance('th')).toBe('th, as in three');
  });

  it('every mapped example word itself starts with that sound', () => {
    // The utterance only makes sense if the example word genuinely
    // belongs to the sound group it illustrates.
    for (const sound of new Set(ALL_WORDS.map((w) => getInitialSound(w.word)))) {
      const utterance = getSoundUtterance(sound);
      const match = utterance.match(/as in (.+)$/);
      expect(match, `no "as in" example for sound "${sound}"`).not.toBeNull();
      expect(getInitialSound(match![1]!)).toBe(sound);
    }
  });
});
