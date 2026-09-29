import { useEffect, useState } from 'react';
import { EmojiVisual } from '../EmojiVisual';
import type { Sticker } from '../../lib/engagement/store';

interface ChestRevealProps {
  chestStars: number;
  totalStars: number;
  newStickers: Sticker[];
}

/**
 * CR-10 DS-R4: batch-end treasure chest - wiggles open, "+N sao" pops
 * with a spring overshoot, and newly earned sticker chips slide in.
 * Reduced-motion renders the final state (open chest + full count).
 */
export default function ChestReveal({ chestStars, totalStars, newStickers }: ChestRevealProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setShown(chestStars);
      return;
    }
    const timers = Array.from({ length: chestStars }, (_, i) =>
      window.setTimeout(() => setShown(i + 1), 500 + i * 220),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [chestStars]);

  return (
    <div data-testid="chest-reveal" className="mb-4 flex flex-col items-center">
      <div className="relative">
        <span className="chest-wiggle inline-block text-6xl">
          <EmojiVisual emoji="🎁" />
        </span>
        {shown > 0 && (
          <span
            data-testid="chest-stars-pop"
            className="stars-pop absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-2xl font-extrabold text-amber-600"
          >
            +{shown} sao
          </span>
        )}
      </div>
      <p className="mt-2 text-base font-bold text-sky-700">
        Tổng kho sao của em: <span className="text-amber-600">{totalStars} sao</span>
      </p>
      {newStickers.length > 0 && (
        <div data-testid="new-stickers" className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {newStickers.map((s, i) => (
            <span
              key={s.id}
              className="sticker-chip inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-2 text-base font-bold text-amber-900 ring-2 ring-amber-300"
              style={{ animationDelay: `${300 + i * 160}ms` }}
            >
              <EmojiVisual emoji={s.emoji} /> Huy hiệu mới: {s.nameVi}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
