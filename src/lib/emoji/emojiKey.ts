/**
 * Twemoji-style asset key for an emoji string (ADR-3, BR-06): lowercase hex
 * code points joined by '-'. If the sequence contains no ZWJ (U+200D),
 * every variation selector U+FE0F is stripped; with a ZWJ present, FE0F is
 * kept (Twemoji file-name rule).
 *
 * Examples: "🐱" -> "1f431", "🐿️" -> "1f43f", "✈️" -> "2708",
 * "1️⃣" -> "31-20e3", "🧑‍🍳" -> "1f9d1-200d-1f373".
 *
 * Kept in sync with scripts/lib/emojiKey.mjs by emojiKey.test.ts parity tests.
 */
export function toEmojiKey(emoji: string): string {
  const codePoints = [...emoji].map((ch) => ch.codePointAt(0)!.toString(16));
  const hasZwj = codePoints.includes('200d');
  return codePoints.filter((cp) => hasZwj || cp !== 'fe0f').join('-');
}
