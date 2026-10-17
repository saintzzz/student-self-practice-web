import { gameBestStars } from '../lib/engagement/store';
import { GAME_DEFS } from './defs';
import type { GameId } from './types';

/**
 * CR-83 Game Zone shelf - the grid of game cards rendered inside the
 * "Khu tro choi" hub tile. Component-free metadata (defs.ts) keeps the
 * main bundle clean; tapping a card routes to the lazy game screen.
 */
export default function GameZoneShelf({ onPlay }: { onPlay: (gameId: GameId) => void }) {
  return (
    <div data-testid="game-zone-shelf" className="grid grid-cols-2 gap-3">
      {GAME_DEFS.map((def) => {
        const best = gameBestStars(def.id);
        return (
          <button
            key={def.id}
            type="button"
            data-testid={`game-card-${def.id}`}
            onClick={() => onPlay(def.id)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-amber-200/60 bg-gradient-to-b from-amber-50 to-orange-100 px-3 py-4 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-4px_0_rgba(180,83,9,0.18),0_8px_18px_-8px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5)] active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-amber-300"
          >
            <span className="text-4xl" aria-hidden>{def.emoji}</span>
            <span className="font-display text-base font-extrabold leading-tight text-slate-800">
              {def.title}
            </span>
            <span className="text-xs font-semibold leading-snug text-slate-500">{def.tagline}</span>
            <span
              data-testid={`game-best-${def.id}`}
              className="mt-0.5 text-sm tracking-wider"
              aria-label={`Thành tích tốt nhất: ${best} sao`}
            >
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < best ? 'text-amber-500' : 'text-slate-300'}>★</span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
