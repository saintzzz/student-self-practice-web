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

/* Emoji-codepoint -> bespoke art override: the stock Twemoji/Noto glyph
   depicts the wrong counted unit (🍇 U+1F347 renders a bunch while the
   word 'grape' counts single berries). The key resolves to our
   single-berry concept art so every static render tier shows one grape;
   lottie is suppressed for overridden keys (the animated bunch has the
   same unit bug - r246 counting-fallback fix). */
const SVG_OVERRIDES: Readonly<Record<string, string>> = {
  '1f347': 'images/concepts/concept-grape-fc24e5.webp',
};

export function svgUrl(key: string): string {
  const override = SVG_OVERRIDES[key];
  return override ? `${baseUrl()}${override}` : `${baseUrl()}emoji/svg/${key}.svg`;
}

export function lottieUrl(key: string): string {
  return `${baseUrl()}emoji/lottie/${key}.json`;
}

/** Whether a Noto Animated Emoji Lottie exists for this Twemoji key (ADR-4). */
export function hasLottie(key: string): boolean {
  return !(key in SVG_OVERRIDES) && LOTTIE_KEYS.has(key);
}
