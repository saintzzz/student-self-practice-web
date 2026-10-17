/**
 * CR-88 Game Zone levels - Monkey-Junior-style difficulty ladder.
 *
 * Every game offers Màn 1/2/3 before a run. `specFor()` translates the
 * level into tuning the games consume; level 1 is today's tuning so the
 * existing suite stays green.
 */
export type GameLevel = 1 | 2 | 3;

export const GAME_LEVELS: readonly GameLevel[] = [1, 2, 3];

export interface LevelSpec {
  level: GameLevel;
  /** Total rounds = baseRounds + this delta. */
  roundsDelta: number;
  /** Multiplier on hazard/advance speeds (action games). */
  speedScale: number;
  /** Hearts where the game tracks lives. */
  lives: number;
  /** Wrong picks allowed per round before it fails. */
  missLimit: number;
  /** Par seconds for the whole run - the speed bonus scale. */
  parSec: number;
}

const TUNING: Record<GameLevel, LevelSpec> = {
  1: { level: 1, roundsDelta: 0, speedScale: 1, lives: 3, missLimit: 2, parSec: 75 },
  2: { level: 2, roundsDelta: 2, speedScale: 1.25, lives: 3, missLimit: 1, parSec: 60 },
  3: { level: 3, roundsDelta: 4, speedScale: 1.5, lives: 2, missLimit: 1, parSec: 45 },
};

export function specFor(level?: number, baseRounds?: number): LevelSpec & { rounds: number } {
  const spec = TUNING[(level === 2 || level === 3 ? level : 1) as GameLevel];
  return { ...spec, rounds: (baseRounds ?? 0) + spec.roundsDelta };
}

/** Child-facing level labels for the picker. */
export const LEVEL_META: Record<GameLevel, { label: string; hint: string }> = {
  1: { label: 'Màn 1', hint: 'Làm quen - vừa chơi vừa học' },
  2: { label: 'Màn 2', hint: 'Nhanh hơn, nhiều câu hơn' },
  3: { label: 'Màn 3', hint: 'Thử thách - ít tim, tốc độ cao' },
};

/** Speed bonus = up to `bonusMax` points when the run beats par.
 *  Returned separately so star accuracy stays honest (clean-play
 *  doctrine: a run with mistakes never equals a flawless run). */
export function timeBonusFor(elapsedMs: number, spec: LevelSpec, bonusMax: number): number {
  const parMs = spec.parSec * 1000;
  if (elapsedMs >= parMs || bonusMax <= 0) return 0;
  return Math.round(bonusMax * (1 - elapsedMs / parMs));
}
