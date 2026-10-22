import { useEffect, useRef, useState } from 'react';
import { gameBestStars, gameLevelStars } from '../lib/engagement/store';
import { hashString } from '../lib/prng';
import { gameCardChip, gameCardClass, gameHeroClass } from '../lib/ui/tokens';
import { IconLock } from '../components/icons';
import { playSfx } from '../lib/sfx';
import { GAME_DEFS } from './defs';
import GameArt from './GameArt';
import { GAME_LEVELS } from './levels';
import type { GameDef, GameId } from './types';

function Stars({ id, onCandy = false }: { id: GameId; onCandy?: boolean }) {
  const best = gameBestStars(id);
  /* CR-91 r54: stars are meaningful indicators (>=3:1 non-text). On the
     light paper cards amber-500 (~2:1) fails - amber-600 measures ~4.5:1.
     On the saturated hero keep the dark-slate pair (strong on candy). */
  const on = onCandy ? 'text-slate-900' : 'text-amber-600';
  const off = onCandy ? 'text-slate-900/25' : 'text-slate-300';
  return (
    <span
      data-testid={`game-best-${id}`}
      className="text-sm tracking-wider"
      aria-label={`Thành tích tốt nhất: ${best} sao`}
    >
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < best ? on : off}>★</span>
      ))}
    </span>
  );
}

function NewBadge() {
  return (
    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-600 shadow">
      Mới
    </span>
  );
}

/* CR-99 M2: total earned stars across the 3 levels - the completionist
   goal Martin's badges provide. Hidden until the kid owns at least 1. */
function TotalStars({ id }: { id: GameId }) {
  const total = GAME_LEVELS.reduce((n, l) => n + gameLevelStars(id, l), 0);
  if (total === 0) return null;
  return (
    <span className="text-[10px] font-extrabold text-slate-500" aria-label={`Tổng số sao: ${total} trên 9`}>
      ⭐{total}/9
    </span>
  );
}

/* CR-99 M6+M7: locked teaser card - a "coming soon" zone that wobbles and
   answers with a hint when tapped (easter egg, not a dead control). */
function LockedCard() {
  const [taps, setTaps] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const poke = () => {
    playSfx('pop');
    setTaps((n) => n + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTaps(0), 2400);
  };
  const hint = taps >= 3 ? 'Kiên nhẫn nào, Heo đang làm lắm!' : taps >= 1 ? 'Sắp mở rồi!' : null;
  return (
    <button
      type="button"
      data-testid="game-card-coming-soon"
      onClick={poke}
      aria-label="Đảo bí mật - sắp ra mắt"
      className={`${gameCardClass('sky')} relative opacity-70 saturate-50 ${taps ? 'chest-wiggle' : ''}`}
    >
      <span className="absolute right-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-300 shadow">
        Sắp mở
      </span>
      <span className={gameCardChip('sky')}><IconLock size={28} className="text-slate-500" /></span>
      <span className="font-display text-base font-extrabold leading-tight text-slate-600">Đảo bí mật</span>
      <span className="text-xs font-semibold leading-snug text-slate-500">
        {hint ?? 'Trò chơi mới đang được Heo chuẩn bị'}
      </span>
    </button>
  );
}

/**
 * CR-83 Game Zone shelf - the grid of game cards rendered inside the
 * "Khu tro choi" hub tile. Component-free metadata (defs.ts) keeps the
 * main bundle clean; tapping a card routes to the lazy game screen.
 *
 * CR-85 redesign: one daily "Tro choi hom nay" hero + a per-hue card
 * grid. `grade` filters defs that declare a grade list (arcade shelf
 * honors the same band split the games do).
 */
export default function GameZoneShelf({ grade, onPlay }: { grade?: string; onPlay: (gameId: GameId) => void }) {
  const defs = GAME_DEFS.filter((d) => !grade || !d.grades || d.grades.includes(grade));
  const now = new Date();
  const featured: GameDef =
    defs[hashString(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`) % defs.length];
  const rest = defs.filter((d) => d.id !== featured.id);

  return (
    <div data-testid="game-zone-shelf" className="space-y-3">
      {/* Featured: a deterministic daily pick keeps the 15-game shelf
          curated instead of an undifferentiated wall. */}
      <button
        type="button"
        data-testid={`game-card-${featured.id}`}
        onClick={() => onPlay(featured.id)}
        className={gameHeroClass(featured.tone ?? 'amber')}
      >
        <span className="shrink-0" aria-hidden><GameArt art={featured.art} emoji={featured.emoji} artImage={featured.artImage} size="hero" animated /></span>
        <span className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-white/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-900 ring-1 ring-white/60">
            Trò chơi hôm nay
          </span>
          <span className="mt-1 block font-display text-lg font-extrabold leading-tight">
            {featured.title}
          </span>
          <span className="block text-xs font-semibold text-slate-900/90">{featured.tagline}</span>
        </span>
        <Stars id={featured.id} onCandy />
        {featured.fresh && <NewBadge />}
      </button>

      <div className="grid grid-cols-2 gap-3">
        {rest.map((def) => (
          <button
            key={def.id}
            type="button"
            data-testid={`game-card-${def.id}`}
            onClick={() => onPlay(def.id)}
            className={gameCardClass(def.tone ?? 'sky')}
          >
            {def.fresh && <NewBadge />}
            <span className={gameCardChip(def.tone ?? 'sky')}><GameArt art={def.art} emoji={def.emoji} artImage={def.artImage} /></span>
            <span className="font-display text-base font-extrabold leading-tight">
              {def.title}
            </span>
            <span className="text-xs font-semibold leading-snug text-slate-600">{def.tagline}</span>
            <span className="flex items-center gap-1.5">
              <Stars id={def.id} />
              <TotalStars id={def.id} />
            </span>
          </button>
        ))}
        <LockedCard />
      </div>
    </div>
  );
}
