import { useEffect, useState } from 'react';
import { getState, subscribe } from '../lib/engagement/store';
import LevelRing from './LevelRing';
import StickerAlbum from './StickerAlbum';
import { IconFlame, IconMedal, IconStar } from './icons';

/**
 * CR-10: star bank + streak + sticker album entry. Lives on the journey
 * map; chips are non-interactive status, the album button opens the
 * collection panel. Re-reads the store on every mount.
 * CR-72: chrome icons are the shared SVG set (no per-OS emoji), chips
 * stay one compact wrap-row on phones.
 * CR-82 polish: the chips collapse into ONE HUD pill - hairline-divided
 * segments on a navy glass bar (coin-counter register) instead of three
 * floating lozenges. Icon color carries each stat's identity.
 */
interface EngagementBarProps {
  /** CR-116: 'day' = milk-glass HUD on the bright map canvas; 'dark'
   *  (default) keeps the navy register used on play surfaces. */
  tone?: 'dark' | 'day';
}

export default function EngagementBar({ tone = 'dark' }: EngagementBarProps) {
  const [albumOpen, setAlbumOpen] = useState(false);
  const [, setTick] = useState(0);
  /* CR-45: re-read the store on every persist so synced stars/streaks
     show without a remount. */
  useEffect(() => subscribe(() => setTick((t) => t + 1)), []);
  const state = getState();
  const day = tone === 'day';

  const segment = `inline-flex min-h-[44px] items-center gap-1.5 px-4 py-1.5 text-sm font-extrabold ${
    day ? 'text-sky-950' : 'text-slate-100'}`;

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      <div className={`inline-flex items-stretch divide-x overflow-hidden rounded-full backdrop-blur ring-1 ${
        day
          ? 'divide-sky-200/80 bg-white/80 shadow-[0_10px_24px_-12px_rgba(14,116,144,0.4)] ring-sky-200/90'
          : 'divide-white/10 bg-navy-850/85 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.75)] ring-white/15'
      }`}>
        <span data-testid="star-bank-chip" className={segment} title="Tổng số sao em đã kiếm được">
          <span aria-hidden="true" className={`inline-flex shrink-0 ${day ? 'text-amber-600' : 'text-amber-400'}`}><IconStar size={16} /></span>
          {state.totalStars} sao
        </span>
        <span data-testid="streak-chip" className={segment} title="Số ngày liên tiếp em đã luyện tập">
          <span aria-hidden="true" className={`inline-flex shrink-0 ${day ? 'text-orange-500' : 'text-orange-400'}`}><IconFlame size={16} /></span>
          {state.streak.count} ngày
        </span>
        <LevelRing tone={tone} />
        <button
          type="button"
          data-testid="sticker-album-button"
          onClick={() => setAlbumOpen((v) => !v)}
          aria-expanded={albumOpen}
          className={`${segment} cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400/70 ${
            day ? 'hover:bg-sky-100/80 focus:bg-sky-100/80' : 'hover:bg-white/[0.07] focus:bg-white/[0.07]'
          }`}
        >
          <span aria-hidden="true" className={`inline-flex shrink-0 ${day ? 'text-sky-600' : 'text-sky-300'}`}><IconMedal size={16} /></span>
          Huy hiệu ({state.stickerIds.length})
        </button>
      </div>
      {albumOpen && <StickerAlbum earnedIds={state.stickerIds} onClose={() => setAlbumOpen(false)} />}
    </div>
  );
}
