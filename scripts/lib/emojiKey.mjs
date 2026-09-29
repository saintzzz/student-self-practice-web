/**
 * Script-side copy of the Twemoji asset-key rule (ADR-3). Kept identical to
 * src/lib/emoji/emojiKey.ts; emojiKey.test.ts asserts parity over every
 * bank emoji plus the design-spec examples so the two cannot drift.
 */
export function toEmojiKey(emoji) {
  const codePoints = [...emoji].map((ch) => ch.codePointAt(0).toString(16));
  const hasZwj = codePoints.includes('200d');
  return codePoints.filter((cp) => hasZwj || cp !== 'fe0f').join('-');
}

/**
 * Normalize a Noto Animated Emoji `codepoint` field ('_'-joined, e.g.
 * '263a_fe0f' or '1f9d1_200d_1f373') to the same Twemoji key.
 */
export function notoCodepointToKey(codepoint) {
  const parts = String(codepoint).toLowerCase().split('_');
  const hasZwj = parts.includes('200d');
  return parts.filter((cp) => hasZwj || cp !== 'fe0f').join('-');
}
