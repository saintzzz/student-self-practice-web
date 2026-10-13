import { useState } from 'react';
import { ownedHomeItems } from '../lib/engagement/store';
import { CARD } from '../lib/ui/tokens';
import { EmojiVisual } from './EmojiVisual';

/**
 * kids-UX AC-4.2 / external-review r1 #4: the gift-box decorations
 * ("đã vào nhà của em") need a persistent home - this shelf sits inside
 * the launchpad's home tile so a child can revisit what they earned.
 * Read-only; the box picker is the only mutation path.
 */
export default function HomeShelf() {
  const [items] = useState(() => ownedHomeItems());

  return (
    <div data-testid="home-shelf" className={`mt-4 ${CARD} text-left`}>
      <h2 className="font-display text-xl font-extrabold text-amber-300">🏡 Nhà của em</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-slate-300">
          Chưa có đồ chơi nào - hoàn thành bài luyện để mở hộp quà nhé!
        </p>
      ) : (
        <>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Đồ chơi em đã nhận">
            {items.map((item) => (
              <li
                key={item.id}
                data-testid={`home-item-${item.id}`}
                title={item.nameVi}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-2xl ring-1 ring-white/15"
              >
                <EmojiVisual emoji={item.emoji} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-bold text-slate-400">
            {items.length} món đồ trong nhà
          </p>
        </>
      )}
    </div>
  );
}
