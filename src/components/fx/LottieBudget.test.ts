import { describe, expect, it } from 'vitest';
import { allocateLottie, type LottieBoardState } from './LottieBudget';

/**
 * CR-82 (D-20, FF-19): the whole-screen Lottie cap - <=1 player before
 * answering, <=2 after, and every suppressed owner keeps a static twin.
 * allocateLottie is pure; these rows are the D-20 table.
 */
const base: LottieBoardState = {
  answered: false,
  promptEligible: false,
  feedbackEligible: false,
  sheetPerch: false,
  reducedMotion: false,
};

const count = (slots: Record<string, boolean>) => Object.values(slots).filter(Boolean).length;

describe('allocateLottie (D-20 budget matrix)', () => {
  it('unanswered + eligible prompt -> prompt owns the slot, mascot static', () => {
    const slots = allocateLottie({ ...base, promptEligible: true });
    expect(slots).toEqual({ prompt: true, mascot: false, feedback: false, reward: false });
    expect(count(slots)).toBe(1);
  });

  it('unanswered + ineligible prompt -> mascot gets the idle/thinking slot', () => {
    const slots = allocateLottie(base);
    expect(slots).toEqual({ prompt: false, mascot: true, feedback: false, reward: false });
    expect(count(slots)).toBe(1);
  });

  it('answered + sheet perch -> mascot plus eligible feedback picture (max 2)', () => {
    const slots = allocateLottie({
      ...base,
      answered: true,
      sheetPerch: true,
      promptEligible: true,
      feedbackEligible: true,
    });
    expect(slots).toEqual({ prompt: false, mascot: true, feedback: true, reward: false });
    expect(count(slots)).toBe(2);
  });

  it('answered + sheet perch + ineligible feedback -> mascot alone', () => {
    const slots = allocateLottie({ ...base, answered: true, sheetPerch: true });
    expect(slots.mascot).toBe(true);
    expect(slots.feedback).toBe(false);
    expect(count(slots)).toBe(1);
  });

  it('answered at short landscape -> inline mascot static, feedback keeps its slot (max 1)', () => {
    const slots = allocateLottie({ ...base, answered: true, sheetPerch: false, feedbackEligible: true });
    expect(slots).toEqual({ prompt: false, mascot: false, feedback: true, reward: false });
    expect(count(slots)).toBe(1);
  });

  it('reduced motion -> zero players everywhere', () => {
    for (const answered of [false, true]) {
      const slots = allocateLottie({
        ...base,
        answered,
        promptEligible: true,
        feedbackEligible: true,
        sheetPerch: true,
        reducedMotion: true,
      });
      expect(count(slots)).toBe(0);
    }
  });
});
