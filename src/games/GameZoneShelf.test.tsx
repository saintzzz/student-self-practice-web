import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GameZoneShelf from './GameZoneShelf';
import { GAME_DEFS } from './defs';
import { gameBestStars, recordGameResult, resetForTests } from '../lib/engagement/store';

describe('GameZoneShelf', () => {
  beforeEach(() => resetForTests());

  it('renders every game card from GAME_DEFS', () => {
    render(<GameZoneShelf onPlay={vi.fn()} />);
    for (const def of GAME_DEFS) {
      expect(screen.getByTestId(`game-card-${def.id}`)).toBeVisible();
      expect(screen.getByText(def.title)).toBeVisible();
    }
  });

  it('reports the tapped game id to onPlay', () => {
    const onPlay = vi.fn();
    render(<GameZoneShelf onPlay={onPlay} />);
    fireEvent.click(screen.getByTestId('game-card-balloon-pop'));
    expect(onPlay).toHaveBeenCalledWith('balloon-pop');
  });

  it('shows the recorded best-star badge for a finished run', () => {
    recordGameResult('grade-1', 'memory-match', 'seed-1', 6, 6); // perfect -> 3 stars
    expect(gameBestStars('memory-match')).toBe(3);
    render(<GameZoneShelf onPlay={vi.fn()} />);
    expect(screen.getByTestId('game-best-memory-match')).toHaveAttribute(
      'aria-label',
      'Thành tích tốt nhất: 3 sao',
    );
  });

  it('game results are idempotent per seed (replay does not double-grant)', () => {
    const first = recordGameResult('grade-1', 'racing-cars', 'seed-x', 6, 8);
    const again = recordGameResult('grade-1', 'racing-cars', 'seed-x', 8, 8);
    expect(first.alreadyGranted).toBeFalsy();
    expect(again.alreadyGranted).toBe(true);
  });
});
