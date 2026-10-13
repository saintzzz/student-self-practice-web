import { useEffect, useState } from 'react';
import { getState, subscribe } from '../lib/engagement/store';
import { CHIP_GOLD, CHIP_SKY } from '../lib/ui/tokens';
import StickerAlbum from './StickerAlbum';
import { IconFlame, IconMedal, IconStar } from './icons';

/**
 * CR-10: star bank + streak + sticker album entry. Lives on the journey
 * map; chips are non-interactive status, the album button opens the
 * collection panel. Re-reads the store on every mount.
 * CR-72: chrome icons are the shared SVG set (no per-OS emoji), chips
 * stay one compact wrap-row on phones.
 */
export default function EngagementBar() {
  const [albumOpen, setAlbumOpen] = useState(false);
  const [, setTick] = useState(0);
  /* CR-45: re-read the store on every persist so synced stars/streaks
     show without a remount. */
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  const state = getState();

  /* Tinted mini-disc icon carriers; star chip goes gold gradient -
     CHIP_GOLD pairs dark text with the light bg. */
  const iconDisc = 'mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center';

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      <span data-testid="star-bank-chip" className={CHIP_GOLD} title="Tổng số sao em đã kiếm được">
        <span aria-hidden="true" className={`${iconDisc} text-amber-500`}><IconStar size={15} /></span>
        {state.totalStars} sao
      </span>
      <span data-testid="streak-chip" className={CHIP_SKY} title="Số ngày liên tiếp em đã luyện tập">
        <span aria-hidden="true" className={`${iconDisc} text-orange-400`}><IconFlame size={15} /></span>
        {state.streak.count} ngày
      </span>
      <button
        type="button"
        data-testid="sticker-album-button"
        onClick={() => setAlbumOpen((v) => !v)}
        aria-expanded={albumOpen}
        className={`${CHIP_SKY} min-h-[44px] cursor-pointer transition hover:bg-sky-500/25 focus:outline-none focus:ring-4 focus:ring-amber-400/60`}
      >
        <span aria-hidden="true" className={`${iconDisc} text-sky-300`}><IconMedal size={15} /></span>
        Huy hiệu ({state.stickerIds.length})
      </button>
      {albumOpen && <StickerAlbum earnedIds={state.stickerIds} onClose={() => setAlbumOpen(false)} />}
    </div>
  );
}
