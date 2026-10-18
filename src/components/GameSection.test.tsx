import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GameEnd, GameProps } from '../games/types';
import GameSection from './GameSection';
import { gameLevelStars, resetForTests } from '../lib/engagement/store';

/**
 * CR-86: GameSection hosts a registered game as a Batch Round - the run
 * IS the assessment. The registry is stubbed so the test asserts the
 * wrapper contract (seed pass-through, single completion, game-star
 * ledger) without an arcade implementation's timers/animation.
 */
vi.mock('../games/registry', () => ({
  GAME_COMPONENTS: {
    'whack-a-mole': ({ onEnd }: GameProps) => (
      <button
        type="button"
        data-testid="stub-game-end"
        onClick={() => onEnd({ points: 8, maxPoints: 10, correctCount: 4, attempted: 8 })}
      >
        end
      </button>
    ),
    'gold-quest': ({ seed, onEnd }: GameProps) => (
      <button
        type="button"
        data-testid="stub-game-seed"
        data-seed={seed}
        onClick={() => onEnd({ points: 1, maxPoints: 10, correctCount: 1 } satisfies GameEnd)}
      >
        end
      </button>
    ),
  },
}));

const grade = { id: 'grade-2', name: 'Lớp 2' };

describe('GameSection (CR-86)', () => {
  beforeEach(() => {
    resetForTests();
  });

  it('announces the bonus round and mounts the registered component', async () => {
    render(<GameSection grade={grade} gameId="whack-a-mole" seed="batch:s1:r4" onComplete={vi.fn()} />);

    expect(screen.getByTestId('game-section-banner')).toBeVisible();
    expect(await screen.findByTestId('stub-game-end')).toBeVisible();
  });

  it('passes the deterministic seed through to the game untouched', async () => {
    render(<GameSection grade={grade} gameId="gold-quest" seed="batch:abc:r4" onComplete={vi.fn()} />);

    const stub = await screen.findByTestId('stub-game-seed');
    expect(stub).toHaveAttribute('data-seed', 'batch:abc:r4');
  });

  it('reports the GameEnd exactly once - a repeat onEnd cannot double-credit', async () => {
    const onComplete = vi.fn();
    render(<GameSection grade={grade} gameId="whack-a-mole" seed="batch:s2:r4" onComplete={onComplete} />);

    const stub = await screen.findByTestId('stub-game-end');
    fireEvent.click(stub);
    fireEvent.click(stub);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ points: 8, maxPoints: 10, correctCount: 4, attempted: 8 });
  });

  it('mints game stars through the seeded ledger (idempotent objective id)', async () => {
    render(<GameSection grade={grade} gameId="whack-a-mole" seed="batch:s3:r4" level={1} onComplete={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('stub-game-end'));

    /* 8/10 -> 2 stars on the per-level best entry. */
    expect(gameLevelStars('whack-a-mole', 1)).toBe(2);
  });
});
