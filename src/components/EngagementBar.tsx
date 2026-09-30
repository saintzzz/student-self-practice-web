import { useState } from 'react';
import { getState } from '../lib/engagement/store';
import { CHIP_AMBER, CHIP_SKY } from '../lib/ui/tokens';
import StickerAlbum from './StickerAlbum';

/**
 * CR-10: star bank + streak + sticker album entry. Lives on the journey
 * map; chips are non-interactive status, the album button opens the
 * collection panel. Re-reads the store on every mount.
 */
export default function EngagementBar() {
  const [albumOpen, setAlbumOpen] = useState(false);
  const state = getState();

  /* CR-12 DS-X4: chip emojis sit in tinted mini-discs; star chip goes
     gold gradient. */
  const iconDisc = 'mr-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10';
  const goldChip = `${CHIP_AMBER} bg-gradient-to-b from-amber-100 to-amber-200/90 shadow-md ring-amber-300/80`;

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-2">
      <span data-testid="star-bank-chip" className={goldChip} title="Tổng số sao em đã kiếm được">
        <span aria-hidden="true" className={iconDisc}>⭐</span> {state.totalStars} sao
      </span>
      <span data-testid="streak-chip" className={CHIP_SKY} title="Số ngày liên tiếp em đã luyện tập">
        <span aria-hidden="true" className={iconDisc}>🔥</span> {state.streak.count} ngày liên tiếp
      </span>
      <button
        type="button"
        data-testid="sticker-album-button"
        onClick={() => setAlbumOpen((v) => !v)}
        aria-expanded={albumOpen}
        className={`${CHIP_SKY} !min-h-0 cursor-pointer transition hover:bg-sky-500/25 focus:outline-none focus:ring-4 focus:ring-amber-400/60`}
      >
        <span aria-hidden="true" className={iconDisc}>🏅</span> Huy hiệu ({state.stickerIds.length})
      </button>
      {albumOpen && <StickerAlbum earnedIds={state.stickerIds} onClose={() => setAlbumOpen(false)} />}
    </div>
  );
}
