import { describe, expect, it } from 'vitest';
import { getFinalSound } from './finalSounds';
import { ALL_WORDS } from '../../data/vocabulary';

describe('getFinalSound', () => {
  it('returns the last letter for regular consonant-final words', () => {
    expect(getFinalSound('cat')).toBe('t');
    expect(getFinalSound('dog')).toBe('g');
    expect(getFinalSound('pen')).toBe('n');
    expect(getFinalSound('book')).toBe('k');
    expect(getFinalSound('red')).toBe('d');
  });

  it('collapses -ck to the k group (duck is not a separate "ck" sound)', () => {
    expect(getFinalSound('duck')).toBe('k');
    expect(getFinalSound('truck')).toBe('k');
    expect(getFinalSound('clock')).toBe('k');
  });

  it('maps final digraphs to their own groups', () => {
    expect(getFinalSound('fish')).toBe('sh');
    expect(getFinalSound('jellyfish')).toBe('sh');
    expect(getFinalSound('watch')).toBe('ch');
    expect(getFinalSound('peach')).toBe('ch');
    expect(getFinalSound('mouth')).toBe('th');
    expect(getFinalSound('sing')).toBe('ng');
    expect(getFinalSound('swimming')).toBe('ng');
  });

  it('collapses doubled final letters (ball->l, dress->s, egg->g)', () => {
    expect(getFinalSound('ball')).toBe('l');
    expect(getFinalSound('dress')).toBe('s');
    expect(getFinalSound('egg')).toBe('g');
    expect(getFinalSound('glass')).toBe('s');
  });

  it('strips silent -e and returns the sounded final letter', () => {
    expect(getFinalSound('cake')).toBe('k');
    expect(getFinalSound('snake')).toBe('k');
    expect(getFinalSound('five')).toBe('v');
    expect(getFinalSound('nine')).toBe('n');
    expect(getFinalSound('plane')).toBe('n');
    expect(getFinalSound('home')).toBe('m');
    expect(getFinalSound('grape')).toBe('p');
    expect(getFinalSound('slide')).toBe('d');
    expect(getFinalSound('blue')).toBe('u');
    expect(getFinalSound('shoe')).toBe('o');
  });

  it('applies soft-c and soft-g after the silent-e strip (dice->s, orange->j)', () => {
    expect(getFinalSound('dice')).toBe('s');
    expect(getFinalSound('rice')).toBe('s');
    expect(getFinalSound('juice')).toBe('s');
    expect(getFinalSound('ice')).toBe('s');
    expect(getFinalSound('orange')).toBe('j');
    expect(getFinalSound('cabbage')).toBe('j');
  });

  it('keeps -se/-ee endings sounding like their letter-level groups', () => {
    expect(getFinalSound('nose')).toBe('s');
    expect(getFinalSound('mouse')).toBe('s');
    expect(getFinalSound('house')).toBe('s');
    expect(getFinalSound('cheese')).toBe('s');
    expect(getFinalSound('tree')).toBe('e');
    expect(getFinalSound('three')).toBe('e');
    expect(getFinalSound('bee')).toBe('e');
  });

  it('handles doubled letters exposed by the silent-e strip (giraffe->f, apple->l)', () => {
    expect(getFinalSound('giraffe')).toBe('f');
    expect(getFinalSound('apple')).toBe('l');
    expect(getFinalSound('purple')).toBe('l');
    expect(getFinalSound('bottle')).toBe('l');
  });

  it('resolves multi-word entries on the last token', () => {
    expect(getFinalSound('hot dog')).toBe('g');
    expect(getFinalSound('teddy bear')).toBe('r');
    expect(getFinalSound('palm tree')).toBe('e');
  });

  it('applies the exceptions table (eye->e, climb->m, laugh->f)', () => {
    expect(getFinalSound('eye')).toBe('e');
    expect(getFinalSound('climb')).toBe('m'); // silent b
    expect(getFinalSound('laugh')).toBe('f'); // -augh sounds /f/
  });

  it('every word in the real bank resolves to a letter or digraph key', () => {
    for (const word of ALL_WORDS) {
      expect(
        getFinalSound(word.word),
        `word "${word.word}" must resolve to a letter or digraph`,
      ).toMatch(/^(sh|ch|th|ng|[a-z])$/);
    }
  });

  it('bank final-sound coverage: at least 4 distinct keys exist (a usable distractor universe)', () => {
    const sounds = new Set(ALL_WORDS.map((w) => getFinalSound(w.word)));
    expect(sounds.size).toBeGreaterThanOrEqual(4);
    // The audit's hot groups must all exist.
    for (const key of ['k', 't', 'n', 'd', 'g', 's', 'l', 'r']) {
      expect(sounds.has(key), `bank must produce final-sound key "${key}"`).toBe(true);
    }
  });
});
