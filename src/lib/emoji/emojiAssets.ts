/**
 * Same-origin emoji asset URLs (ADR-3, BR-07). All assets live under
 * `public/emoji/` and are committed to the repo; the app never requests a
 * third-party origin at runtime (constitution #4, AC-2.6).
 */
import { toEmojiKey } from './emojiKey';
import lottieKeysJson from './lottieKeys.generated.json';

export { toEmojiKey };

const LOTTIE_KEYS: ReadonlySet<string> = new Set(lottieKeysJson as string[]);

function baseUrl(): string {
  return import.meta.env.BASE_URL ?? '/';
}

export function svgUrl(key: string): string {
  return `${baseUrl()}emoji/svg/${key}.svg`;
}

export function lottieUrl(key: string): string {
  return `${baseUrl()}emoji/lottie/${key}.json`;
}

/** Whether a Noto Animated Emoji Lottie exists for this Twemoji key (ADR-4). */
export function hasLottie(key: string): boolean {
  return LOTTIE_KEYS.has(key);
}
