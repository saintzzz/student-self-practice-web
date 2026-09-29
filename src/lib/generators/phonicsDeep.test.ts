import { describe, expect, it } from 'vitest';
import { ALL_WORDS } from '../../data/vocabulary';
import {
  generatePhonicsBlendChoiceQuestions,
  generatePhonicsFinalChoiceQuestions,
  generatePhonicsRhymeChoiceQuestions,
} from './phonicsDeep';
import { getFinalSound } from '../phonics/finalSounds';
import { getInitialBlend } from '../phonics/blends';
import { soundsSharePhoneme } from '../phonics/initialSounds';
import { rhymesWith } from '../phonics/rhymes';

const FINAL_QUESTIONS = generatePhonicsFinalChoiceQuestions(ALL_WORDS);
const BLEND_QUESTIONS = generatePhonicsBlendChoiceQuestions(ALL_WORDS);
const RHYME_QUESTIONS = generatePhonicsRhymeChoiceQuestions(ALL_WORDS);

describe('generatePhonicsFinalChoiceQuestions', () => {
  it('produces a non-empty pool over the real bank', () => {
    expect(FINAL_QUESTIONS.length).toBeGreaterThan(0);
  });

  it('every question has 4 options with exactly one correct index', () => {
    for (const q of FINAL_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size, `${q.id}: options must be distinct`).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    }
  });

  it('the correct option is the word\'s derived final sound', () => {
    for (const q of FINAL_QUESTIONS) {
      expect(q.options[q.correctIndex], q.id).toBe(getFinalSound(q.word));
      expect(q.sound).toBe(getFinalSound(q.word));
    }
  });

  it('no distractor shares the correct phoneme (c/k equivalence guard)', () => {
    for (const q of FINAL_QUESTIONS) {
      for (const [i, option] of q.options.entries()) {
        if (i === q.correctIndex) continue;
        expect(
          soundsSharePhoneme(option, q.sound),
          `${q.id}: option "${option}" shares a phoneme with answer "${q.sound}"`,
        ).toBe(false);
      }
    }
  });

  it('is deterministic per word/variant and carries valid ids', () => {
    const again = generatePhonicsFinalChoiceQuestions(ALL_WORDS);
    expect(again.map((q) => q.id)).toEqual(FINAL_QUESTIONS.map((q) => q.id));
    for (const q of FINAL_QUESTIONS) {
      expect(q.id).toMatch(/^q-pfc-/);
      expect(q.wordId.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.kind).toBe('phonics-final-choice');
    }
  });
});

describe('generatePhonicsBlendChoiceQuestions', () => {
  it('produces a non-empty pool over the real bank', () => {
    expect(BLEND_QUESTIONS.length).toBeGreaterThan(0);
  });

  it('only blend-bearing words generate questions', () => {
    for (const q of BLEND_QUESTIONS) {
      expect(getInitialBlend(q.word), `${q.id}: "${q.word}" has no blend`).not.toBeNull();
    }
  });

  it('the correct option is the word\'s derived blend and all 4 options are distinct clusters', () => {
    for (const q of BLEND_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size, `${q.id}: options must be distinct`).toBe(4);
      expect(q.options[q.correctIndex], q.id).toBe(getInitialBlend(q.word));
      expect(q.blend).toBe(getInitialBlend(q.word));
      for (const option of q.options) {
        expect(option, `${q.id}: "${option}" is not a 2-3 letter cluster`).toMatch(/^[a-z]{2,3}$/);
      }
    }
  });

  it('is deterministic and carries valid ids/explanations', () => {
    const again = generatePhonicsBlendChoiceQuestions(ALL_WORDS);
    expect(again.map((q) => q.id)).toEqual(BLEND_QUESTIONS.map((q) => q.id));
    for (const q of BLEND_QUESTIONS) {
      expect(q.id).toMatch(/^q-pbc-/);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.kind).toBe('phonics-blend-choice');
    }
  });
});

describe('generatePhonicsRhymeChoiceQuestions', () => {
  it('produces a non-empty pool over the real bank', () => {
    expect(RHYME_QUESTIONS.length).toBeGreaterThan(0);
  });

  it('exactly one option rhymes with the prompt word', () => {
    for (const q of RHYME_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size, `${q.id}: options must be distinct words`).toBe(4);
      const rhyming = q.options.filter((option) => rhymesWith(q.word, option));
      expect(rhyming, `${q.id}: expected exactly 1 rhyming option, got ${rhyming.length}`).toHaveLength(1);
      expect(rhyming[0]).toBe(q.options[q.correctIndex]);
    }
  });

  it('the prompt word never appears among its own options', () => {
    for (const q of RHYME_QUESTIONS) {
      expect(q.options).not.toContain(q.word);
    }
  });

  it('is deterministic and carries valid ids/explanations', () => {
    const again = generatePhonicsRhymeChoiceQuestions(ALL_WORDS);
    expect(again.map((q) => q.id)).toEqual(RHYME_QUESTIONS.map((q) => q.id));
    for (const q of RHYME_QUESTIONS) {
      expect(q.id).toMatch(/^q-prc-/);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.kind).toBe('phonics-rhyme-choice');
      expect(q.optionWordIds).toHaveLength(4);
    }
  });

  it('known audit families produce questions (a real-world coverage smoke test)', () => {
    const promptWords = new Set(RHYME_QUESTIONS.map((q) => q.word));
    // -ake/-ook/-og are among the bank's richest true-rhyme families.
    expect(promptWords.has('snake') || promptWords.has('cake')).toBe(true);
    expect(promptWords.has('book') || promptWords.has('cook')).toBe(true);
    expect(promptWords.has('frog') || promptWords.has('dog')).toBe(true);
  });
});
