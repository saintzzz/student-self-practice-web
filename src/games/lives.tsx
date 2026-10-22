import { useCallback, useRef, useState } from 'react';
import { playSfx } from '../lib/sfx';

/**
 * CR-100 (B5): shared per-run lives for Game Zone arcade shells.
 *
 * Hearts are EPHEMERAL round state - "3/3 chances left this run", not
 * per-day lives and never a punishment counter. A game adopts this with
 * two lines: const lives = useGameLives(3); render <HeartMeter .../>, and
 * call lives.lose() on its unambiguous wrong-answer event; at 0 hearts it
 * ends its run early and still reports GameEnd with accrued points, so a
 * wipeout reads as "try again" not "you lost".
 */

export interface GameLives {
  lives: number;
  max: number;
  /** True after the last heart dropped - the game should end its run. */
  out: boolean;
  /** Drop one heart. Returns the remaining count (0 = out). */
  lose: () => number;
  reset: () => void;
}

export function useGameLives(max = 3): GameLives {
  const [lives, setLives] = useState(max);
  const out = lives <= 0;
  /* ref mirror so lose() is stable across renders and a double-fire in
     the same tick can only drop one heart per call. */
  const ref = useRef(lives);
  ref.current = lives;
  const lose = useCallback(() => {
    const next = Math.max(0, ref.current - 1);
    ref.current = next;
    setLives(next);
    return next;
  }, []);
  const reset = useCallback(() => {
    ref.current = max;
    setLives(max);
  }, [max]);
  return { lives, max, out, lose, reset };
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 transition-all duration-300 motion-reduce:transition-none ${
        filled ? 'scale-100 text-rose-400' : 'scale-75 text-white/15'
      }`}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.2 4.5 6 4.5c2.3 0 3.9 1.3 6 3.7 2.1-2.4 3.7-3.7 6-3.7 3.8 0 5.6 4.1 4 7.2C19.5 16.3 12 21 12 21Z" />
    </svg>
  );
}

export function HeartMeter({ lives, max, testId = 'heart-meter' }: { lives: number; max: number; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Còn ${lives}/${max} lượt thử`}
      title={`Còn ${lives}/${max} lượt thử`}
    >
      {Array.from({ length: max }, (_, i) => (
        <Heart key={i} filled={i < lives} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* CR-104: shared per-run combo streak. Correct answers chain a streak; */
/* a wrong pick breaks it. Purely celebratory - it never costs hearts,  */
/* points or gates content, so a broken streak reads as encouragement  */
/* to start a new chain, not punishment. hit() plays the 'streak' sfx  */
/* from streak 3 up.                                                    */
/* ------------------------------------------------------------------ */

export interface GameCombo {
  streak: number;
  /** Record a correct answer. Returns the new streak. */
  hit: () => number;
  /** Break the chain on a wrong pick. */
  miss: () => void;
  reset: () => void;
}

export function useCombo(): GameCombo {
  const [streak, setStreak] = useState(0);
  const ref = useRef(0);
  const hit = useCallback(() => {
    const next = ref.current + 1;
    ref.current = next;
    setStreak(next);
    if (next >= 3) playSfx('streak');
    return next;
  }, []);
  const miss = useCallback(() => {
    ref.current = 0;
    setStreak(0);
  }, []);
  const reset = useCallback(() => {
    ref.current = 0;
    setStreak(0);
  }, []);
  return { streak, hit, miss, reset };
}

export function ComboMeter({ streak, testId = 'combo-meter' }: { streak: number; testId?: string }) {
  if (streak < 2) return null;
  return (
    <span
      data-testid={testId}
      role="img"
      aria-label={`Chuỗi đúng ${streak} câu liên tiếp`}
      title={`Chuỗi đúng ${streak} câu liên tiếp`}
      className="combo-pop inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 font-display text-sm font-extrabold text-amber-950 shadow-md ring-1 ring-amber-200/60"
      key={streak}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M13.5 1.5s.8 3-1.5 6c-1.8 2.4-4 3.8-4 7a6 6 0 0 0 12 0c0-2-1-3.8-2-5.5-.4 1.6-1.4 2.5-2.5 3 .3-4-1-8.5-2-10.5Z" />
      </svg>
      x{streak}
    </span>
  );
}
