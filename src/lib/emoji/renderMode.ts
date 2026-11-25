/**
 * Pure render-mode state machine for EmojiVisual (ADR-1, design-spec 3.3).
 * One-way chain: image -> lottie -> svg -> native. Kept free of DOM/React so
 * the full truth table is unit-testable in plain vitest.
 */
import { toEmojiKey } from './emojiKey';

export type EmojiRenderMode = 'image' | 'lottie' | 'svg' | 'native';

export interface EmojiModeInput {
  emoji: string;
  /** >= 1. count > 1 hard-forces static rendering (repeated contexts). */
  count: number;
  animated: boolean;
  imageUrl?: string;
  prefersReducedMotion: boolean;
  /** Session circuit breaker (ADR-6): once tripped, lottie never starts again. */
  lottieDisabledForSession: boolean;
  hasLottie: (key: string) => boolean;
}

export function initialMode(input: EmojiModeInput): EmojiRenderMode {
  /* CR-145 r225: imageUrl wins over the count>1 static rule - image mode
     renders `count` copies of the picture (concept art x N = "N objects"
     for the counting/describe option tiles). Callers that still want
     repeated Twemoji simply omit imageUrl. */
  if (input.imageUrl) {
    return 'image';
  }
  if (input.count > 1) {
    return 'svg';
  }
  if (
    input.animated &&
    !input.prefersReducedMotion &&
    !input.lottieDisabledForSession &&
    input.hasLottie(toEmojiKey(input.emoji))
  ) {
    return 'lottie';
  }
  return 'svg';
}

/**
 * Where a photo load error takes us: lottie if the emoji would have animated
 * anyway, else svg. 'image' is never a target again for this mount.
 */
export function modeAfterImageError(input: EmojiModeInput): Exclude<EmojiRenderMode, 'image'> {
  const next = initialMode({ ...input, imageUrl: undefined });
  return next === 'image' ? 'svg' : next;
}
