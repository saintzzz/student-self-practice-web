import { useCallback, useRef, useState } from 'react';

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
