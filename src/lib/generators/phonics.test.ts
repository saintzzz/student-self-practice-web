import { describe, expect, it } from 'vitest';
import {
  generatePhonicsSoundChoiceQuestions,
  generatePhonicsWordChoiceQuestions,
} from './phonics';
import { getInitialSound, soundsSharePhoneme } from '../phonics/initialSounds';
import { ALL_WORDS } from '../../data/vocabulary';
import type { VocabWord } from '../../types';

function makeWords(count: number, soundWordPairs: [string, string][]): VocabWord[] {
  const words: VocabWord[] = [];
  for (const [sound, wordText] of soundWordPairs) {
    for (let i = 0; i < count; i++) {
      words.push({
        id: `${sound}-${i}-${wordText}`,
        topicId: `t-${sound}`,
        word: `${wordText}${i === 0 ? '' : `-${i}`}`,
        emoji: `emoji-${sound}-${i}`,
        countable: true,
        explanation: `explanation for ${wordText}`,
      });
    }
  }
  return words;
}

describe('generatePhonicsSoundChoiceQuestions', () => {
  it('generates 2 variants per word over the real bank', () => {
    const questions = generatePhonicsSoundChoiceQuestions(ALL_WORDS);
    expect(questions).toHaveLength(ALL_WORDS.length * 2);
  });

  it('the target sound is always the correct option, and all 4 options are distinct sounds', () => {
    const questions = generatePhonicsSoundChoiceQuestions(ALL_WORDS);

    for (const q of questions) {
      expect(q.options[q.correctIndex]).toBe(q.sound);
      expect(q.sound).toBe(getInitialSound(q.word));
      expect(new Set(q.options).size, `${q.id} has duplicate sound options`).toBe(4);
    }
  });

  it('distractor sounds always exist in the bank (sound universe is derived, not hardcoded)', () => {
    const bankSounds = new Set(ALL_WORDS.map((w) => getInitialSound(w.word)));
    const questions = generatePhonicsSoundChoiceQuestions(ALL_WORDS);

    for (const q of questions) {
      for (const option of q.options) {
        expect(bankSounds, `${q.id} offers sound "${option}" no bank word has`).toContain(option);
      }
    }
  });

  it('never offers a same-phoneme distractor (c and k are both /k/)', () => {
    const questions = generatePhonicsSoundChoiceQuestions(ALL_WORDS);

    for (const q of questions) {
      for (const option of q.options) {
        if (option === q.sound) continue;
        expect(
          soundsSharePhoneme(option, q.sound),
          `${q.id} offers "${option}" which is the same phoneme as "${q.sound}"`,
        ).toBe(false);
      }
    }
  });

  it('skips a variant when 3 different-sound distractors cannot be drawn', () => {
    // Pool with only sounds a,b,c,k: a 'c' word excludes c AND k
    // (same phoneme), leaving only a,b -> fewer than 3 -> no question.
    const words = makeWords(1, [
      ['a', 'apple'],
      ['b', 'ball'],
      ['c', 'cat'],
      ['k', 'kite'],
    ]);

    const questions = generatePhonicsSoundChoiceQuestions(words);
    expect(questions.every((q) => q.sound !== 'c' && q.sound !== 'k')).toBe(true);
    expect(questions.some((q) => q.sound === 'a')).toBe(true);
  });

  it('carries wordId and emoji for the visual + feedback chain', () => {
    const questions = generatePhonicsSoundChoiceQuestions(ALL_WORDS);

    for (const q of questions) {
      const word = ALL_WORDS.find((w) => w.id === q.wordId)!;
      expect(word.word).toBe(q.word);
      expect(q.emoji).toBe(word.emoji);
      expect(q.explanation).toContain(q.word);
      expect(q.explanation).toContain(q.sound);
    }
  });

  it('is deterministic for the same word pool', () => {
    const first = generatePhonicsSoundChoiceQuestions(ALL_WORDS.slice(0, 40)).map((q) => q.id + q.options.join());
    const second = generatePhonicsSoundChoiceQuestions(ALL_WORDS.slice(0, 40)).map((q) => q.id + q.options.join());
    expect(first).toEqual(second);
  });
});

describe('generatePhonicsWordChoiceQuestions', () => {
  it('generates variants over the real bank and every question has exactly one matching-sound option', () => {
    const questions = generatePhonicsWordChoiceQuestions(ALL_WORDS);
    expect(questions.length).toBeGreaterThan(0);

    for (const q of questions) {
      const optionWords = q.optionWordIds.map((id) => ALL_WORDS.find((w) => w.id === id)!);
      const matching = optionWords.filter((w) => getInitialSound(w.word) === q.sound);
      expect(matching, `${q.id} must have exactly 1 option starting with "${q.sound}"`).toHaveLength(1);
      expect(optionWords[q.correctIndex]!.word).toBe(q.word);
      expect(getInitialSound(q.word)).toBe(q.sound);
    }
  });

  it('no distractor shares a phoneme with the target sound', () => {
    const questions = generatePhonicsWordChoiceQuestions(ALL_WORDS);

    for (const q of questions) {
      const optionWords = q.optionWordIds.map((id) => ALL_WORDS.find((w) => w.id === id)!);
      const samePhoneme = optionWords.filter((w) => soundsSharePhoneme(getInitialSound(w.word), q.sound));
      expect(samePhoneme, `${q.id} must have exactly 1 same-phoneme option`).toHaveLength(1);
      expect(samePhoneme[0]!.id).toBe(q.wordId);
    }
  });

  it('all 4 picture options have distinct emojis', () => {
    const questions = generatePhonicsWordChoiceQuestions(ALL_WORDS);

    for (const q of questions) {
      expect(new Set(q.options).size, `${q.id} has duplicate picture options`).toBe(4);
    }
  });

  it('optionWordIds parallel options (same emoji on both)', () => {
    const questions = generatePhonicsWordChoiceQuestions(ALL_WORDS);

    for (const q of questions) {
      for (let i = 0; i < 4; i++) {
        const word = ALL_WORDS.find((w) => w.id === q.optionWordIds[i])!;
        expect(word.emoji).toBe(q.options[i]);
      }
    }
  });

  it('is deterministic for the same word pool', () => {
    const first = generatePhonicsWordChoiceQuestions(ALL_WORDS.slice(0, 40)).map((q) => q.id + q.options.join());
    const second = generatePhonicsWordChoiceQuestions(ALL_WORDS.slice(0, 40)).map((q) => q.id + q.options.join());
    expect(first).toEqual(second);
  });

  it('skips a variant (returns no question) when 3 different-sound distractors cannot be drawn', () => {
    // 2 words with sound 'a' + 1 word each with 'b','c' => 'a'-words can
    // only find 2 different-sound distractors -> no question generated.
    const words = makeWords(0, []).concat([
      { id: 'a1', topicId: 't', word: 'apple', emoji: 'emoji-a1', countable: true, explanation: 'x' },
      { id: 'a2', topicId: 't', word: 'ant', emoji: 'emoji-a2', countable: true, explanation: 'x' },
      { id: 'b1', topicId: 't', word: 'ball', emoji: 'emoji-b1', countable: true, explanation: 'x' },
      { id: 'c1', topicId: 't', word: 'cat', emoji: 'emoji-c1', countable: true, explanation: 'x' },
    ]);

    const questions = generatePhonicsWordChoiceQuestions(words);
    expect(questions.every((q) => q.sound !== 'a')).toBe(true);
  });
});
