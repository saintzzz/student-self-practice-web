import { useState } from 'react';
import { EmojiVisual } from './EmojiVisual';

/**
 * Collectible art image - bespoke webp (stickers/home items/pets) with
 * the emoji glyph as the keyed fallback. Renderers stay dumb: pass the
 * def's `art` and `emoji`, and a missing/unbuilt image degrades to the
 * EmojiVisual instead of a broken img. Callers put `key={art}` on the
 * element when the source can change so the failure flag resets.
 */
export function ArtImg({
  src,
  emoji,
  size = 40,
  grayscale = false,
}: {
  src?: string;
  emoji: string;
  size?: number;
  grayscale?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span aria-hidden="true" style={{ fontSize: size * 0.6, lineHeight: 1 }}>
        <EmojiVisual emoji={emoji} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={`select-none rounded-lg bg-amber-50/95 object-contain p-0.5 ring-1 ring-amber-200/60 ${grayscale ? 'grayscale' : ''}`}
      style={{ width: size, height: size }}
    />
  );
}
