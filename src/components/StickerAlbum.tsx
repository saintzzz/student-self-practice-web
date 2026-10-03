import { STICKERS } from '../lib/engagement/store';
import { EmojiVisual } from './EmojiVisual';

interface StickerAlbumProps {
  earnedIds: readonly string[];
  onClose: () => void;
}

/** CR-37: album grouped into themed shelves. */
const CATEGORIES: readonly { id: string; label: string }[] = [
  { id: 'luyen', label: 'Luyện tập' },
  { id: 'skill', label: 'Kỹ năng' },
  { id: 'streak', label: 'Chuỗi ngày' },
  { id: 'arena', label: 'Đấu trường' },
  { id: 'quest', label: 'Nhiệm vụ' },
  { id: 'pet', label: 'Bạn đồng hành' },
];

/**
 * CR-10 s16.4: achievement album - earned stickers in color, locked
 * ones greyed with a mystery name. Compact popover under the album
 * chip; the button keeps focus/close ownership.
 */
export default function StickerAlbum({ earnedIds, onClose }: StickerAlbumProps) {
  return (
    <div
      data-testid="sticker-album"
      role="dialog"
      aria-label="Bộ sưu tập huy hiệu"
      className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-2xl bg-[#0E1F42]/95 p-4 text-left shadow-2xl ring-2 ring-amber-300 backdrop-blur-sm"
    >
      <p className="mb-3 font-display text-lg font-extrabold text-amber-100">Huy hiệu của em</p>
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {CATEGORIES.map((cat) => {
          const items = STICKERS.filter((s) => s.category === cat.id);
          const earnedCount = items.filter((s) => earnedIds.includes(s.id)).length;
          return (
            <div key={cat.id}>
              <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-sky-300">
                {cat.label} ({earnedCount}/{items.length})
              </p>
              <ul className="space-y-2">
                {items.map((s) => {
                  const earned = earnedIds.includes(s.id);
                  return (
                    <li
                      key={s.id}
                      data-testid={`sticker-${s.id}`}
                      className={`flex items-center gap-3 rounded-xl p-2 ${
                        earned ? 'bg-amber-500/15 ring-1 ring-amber-400/40' : 'opacity-50'
                      }`}
                    >
                      <span className={`text-2xl ${earned ? '' : 'grayscale'}`}>
                        <EmojiVisual emoji={s.emoji} />
                      </span>
                      <span className={`text-base font-bold ${earned ? 'text-amber-100' : 'text-slate-400'}`}>
                        {earned ? s.nameVi : '???'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        data-testid="sticker-album-close"
        onClick={onClose}
        className="mt-3 w-full rounded-xl bg-sky-500/20 py-2 text-sm font-bold text-sky-200 transition hover:bg-sky-500/30 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
      >
        Đóng
      </button>
    </div>
  );
}
