import { describe, expect, it } from 'vitest';
import { initialMode, modeAfterImageError, type EmojiModeInput } from './renderMode';

const WITH_LOTTIE = () => true;
const NO_LOTTIE = () => false;

function input(overrides: Partial<EmojiModeInput> = {}): EmojiModeInput {
  return {
    emoji: '✨',
    count: 1,
    animated: false,
    prefersReducedMotion: false,
    lottieDisabledForSession: false,
    hasLottie: WITH_LOTTIE,
    ...overrides,
  };
}

describe('initialMode (design-spec 3.3)', () => {
  it('count > 1 forces svg (repeated context, AC-2.3/AC-5.5)', () => {
    expect(initialMode(input({ count: 3, animated: true, imageUrl: '/x.webp' }))).toBe('svg');
  });

  it('imageUrl wins for single-picture contexts (AC-5.1)', () => {
    expect(initialMode(input({ imageUrl: '/images/vocab/cat.webp', animated: true }))).toBe(
      'image',
    );
  });

  it('animated + lottie available -> lottie', () => {
    expect(initialMode(input({ animated: true }))).toBe('lottie');
  });

  it('default -> svg', () => {
    expect(initialMode(input())).toBe('svg');
  });

  it('reduced motion skips lottie (AC-2.7)', () => {
    expect(initialMode(input({ animated: true, prefersReducedMotion: true }))).toBe('svg');
  });

  it('session breaker skips lottie (DS-9)', () => {
    expect(initialMode(input({ animated: true, lottieDisabledForSession: true }))).toBe('svg');
  });

  it('no lottie asset -> svg', () => {
    expect(initialMode(input({ animated: true, hasLottie: NO_LOTTIE }))).toBe('svg');
  });
});

describe('modeAfterImageError (AC-5.3)', () => {
  it('photo error with animated emoji -> lottie', () => {
    expect(modeAfterImageError(input({ imageUrl: '/x.webp', animated: true }))).toBe('lottie');
  });

  it('photo error without animation -> svg', () => {
    expect(modeAfterImageError(input({ imageUrl: '/x.webp' }))).toBe('svg');
  });

  it('never returns image again', () => {
    expect(modeAfterImageError(input({ imageUrl: '/x.webp' }))).not.toBe('image');
  });
});
