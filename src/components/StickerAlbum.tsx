import { STICKERS } from '../lib/engagement/store';
import { EmojiVisual } from './EmojiVisual';

interface StickerAlbumProps {
  earnedIds: readonly string[];
  onClose: () => void;
}

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
      className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-2xl bg-white p-4 text-left shadow-xl ring-2 ring-amber-300"
    >
      <p className="mb-3 font-display text-lg font-extrabold text-amber-900">Huy hiệu của em</p>
      <ul className="space-y-2">
        {STICKERS.map((s) => {
          const earned = earnedIds.includes(s.id);
          return (
            <li
              key={s.id}
              data-testid={`sticker-${s.id}`}
              className={`flex items-center gap-3 rounded-xl p-2 ${
                earned ? 'bg-amber-50 ring-1 ring-amber-200' : 'opacity-50'
              }`}
            >
              <span className={`text-2xl ${earned ? '' : 'grayscale'}`}>
                <EmojiVisual emoji={s.emoji} />
              </span>
              <span className={`text-base font-bold ${earned ? 'text-amber-900' : 'text-slate-500'}`}>
                {earned ? s.nameVi : '???'}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        data-testid="sticker-album-close"
        onClick={onClose}
        className="mt-3 w-full rounded-xl bg-sky-100 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        Đóng
      </button>
    </div>
  );
}
