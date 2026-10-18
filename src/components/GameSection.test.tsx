import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GameEnd } from '../games/types';
import GameSection from './GameSection';
import { gameLevelStars, resetForTests } from '../lib/engagement/store';

/**
 * CR-86: GameSection hosts a registered game as a Batch Round - the run
 * IS the assessment. The lazy registry is stubbed so the test asserts the
 * wrapper contract (seed pass-through, single completion, game-star
 * ledger, error boundary) without an arcade implementation's
 * timers/animation. Stubs live INSIDE the factory - vi.mock hoists.
 */
vi.mock('../games/lazyComponents', () => {
  const fakeLazy = (typeFor: (attempt: number) => unknown) => ({
    typeFor: (attempt: number) => typeFor(attempt) as never,
    invocations: () => 1,
    load: () => Promise.resolve({ default: typeFor(0) }),
  });
  const stubEndGame = ({ onEnd }: { onEnd: (e: GameEnd) => void }) => (
    <button
      type="button"
      data-testid="stub-game-end"
      onClick={() => onEnd({ points: 8, maxPoints: 10, correctCount: 4, attempted: 8 })}
    >
      end
    </button>
  );
  const stubSeedGame = ({ seed, onEnd }: { seed: string; onEnd: (e: GameEnd) => void }) => (
    <button
      type="button"
      data-testid="stub-game-seed"
      data-seed={seed}
      onClick={() => onEnd({ points: 1, maxPoints: 10, correctCount: 1 } satisfies GameEnd)}
    >
      end
    </button>
  );
  /* attempt 0 throws (stale-chunk / crash); attempt >=1 recovers. */
  const stubFlakyGame = (attempt: number) =>
    attempt === 0
      ? () => {
          throw new Error('chunk load failed');
        }
      : stubEndGame;

  return {
    GAME_LAZY: {
      'whack-a-mole': fakeLazy(() => stubEndGame),
      'gold-quest': fakeLazy(() => stubSeedGame),
      'feed-the-pig': fakeLazy((attempt: number) => stubFlakyGame(attempt)),
    },
  };
});

const grade = { id: 'grade-2', name: 'Lớp 2' };

/* Boundary errors log through React - silence the jsdom console noise. */
beforeEach(() => {
  resetForTests();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GameSection (CR-86)', () => {
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

  it('r57: a crashed/failed game shows retry + skip instead of sinking the Batch', async () => {
    render(<GameSection grade={grade} gameId="feed-the-pig" seed="batch:s4:r4" onComplete={vi.fn()} />);

    expect(await screen.findByTestId('game-section-error')).toBeVisible();
    expect(screen.getByTestId('game-section-retry')).toBeVisible();
    expect(screen.getByTestId('game-section-skip')).toBeVisible();
  });

  it('r57: skip ends the round once with a zero outcome - Batch progress preserved', async () => {
    const onComplete = vi.fn();
    render(<GameSection grade={grade} gameId="feed-the-pig" seed="batch:s5:r4" onComplete={onComplete} />);

    fireEvent.click(await screen.findByTestId('game-section-skip'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ points: 0, maxPoints: 0, correctCount: 0, attempted: 0 });
  });

  it('r57: retry mints a fresh attempt and the recovered game still reports', async () => {
    const onComplete = vi.fn();
    render(<GameSection grade={grade} gameId="feed-the-pig" seed="batch:s6:r4" onComplete={onComplete} />);

    fireEvent.click(await screen.findByTestId('game-section-retry'));
    fireEvent.click(await screen.findByTestId('stub-game-end'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ points: 8, maxPoints: 10, correctCount: 4, attempted: 8 });
  });
});
