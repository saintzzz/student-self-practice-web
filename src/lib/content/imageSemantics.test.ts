import { describe, expect, it } from 'vitest';
import { isLiteralImageWord } from './imageSemantics';
import type { VocabWord } from '../../types';

function w(id: string): VocabWord {
  return { id, word: id, emoji: '📷', topicId: 't', countable: true } as VocabWord;
}

describe('isLiteralImageWord', () => {
  it('rejects the user-reported figurative mapping: camera for "vlog"', () => {
    expect(isLiteralImageWord(w('vlog'))).toBe(false);
  });

  it('rejects other abstract/activity words where the emoji shows a related object', () => {
    for (const id of ['photography', 'shopping', 'sightseeing', 'dream', 'weekend', 'festival', 'wifi', 'picnic']) {
      expect(isLiteralImageWord(w(id)), id).toBe(false);
    }
  });

  it('keeps direct object mappings a child can name from one picture', () => {
    for (const id of ['apple', 'cat', 'keyboard', 'printer', 'school', 'banana']) {
      expect(isLiteralImageWord(w(id)), id).toBe(true);
    }
  });

  it('rejects flag emojis - a flag thumbnail cannot be identified from the picture (CR-39)', () => {
    const flag = (id: string, emoji: string): VocabWord => ({ id, word: id, emoji, topicId: 't', countable: false }) as VocabWord;
    for (const word of [
      flag('guam', '🇬🇺'),
      flag('mayotte', '🇾🇹'),
      flag('western-sahara', '🇪🇭'),
      flag('fiji', '🇫🇯'),
      flag('laos', '🇱🇦'),
    ]) {
      expect(isLiteralImageWord(word), word.id).toBe(false);
    }
    // Non-flag pictographs that merely contain variation selectors stay.
    expect(isLiteralImageWord(flag('white-flag', '🏳️'))).toBe(true);
    expect(isLiteralImageWord(flag('skull-and-crossbones', '☠️'))).toBe(true);
  });
});
