import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GameZoneShelf from './GameZoneShelf';
import { GAME_DEFS } from './defs';
import {
  gameBestStars,
  recordBatchResult,
  recordGameResult,
  recordSkillAnswer,
  resetForTests,
  visitMysteryIsland,
} from '../lib/engagement/store';

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

  /* CR-148 (P1-6): the grid groups cards into skill sections and flags
     the games whose skill the coach sees as weakest. */
  it('groups the grid into skill sections', () => {
    render(<GameZoneShelf onPlay={vi.fn()} />);
    // Every def lands in exactly one section (featured card excluded).
    const sectioned = document.querySelectorAll('[data-testid^="game-section-"] [data-testid^="game-card-"]');
    expect(sectioned.length).toBe(GAME_DEFS.length - 1);
    expect(screen.getByTestId('game-section-listening')).toBeVisible();
  });

  it('flags cards matching the coach weakest skill', () => {
    recordSkillAnswer('grade-1', 'listening', false);
    recordSkillAnswer('grade-1', 'listening', false);
    recordSkillAnswer('grade-1', 'listening', false);
    render(<GameZoneShelf grade="grade-1" onPlay={vi.fn()} />);
    const badges = screen.getAllByTestId('game-weak-badge');
    expect(badges.length).toBeGreaterThan(0);
    // Only listening games carry the badge.
    const listeningCount = GAME_DEFS.filter(
      (d) => d.skill === 'listening' && (!d.grades || d.grades.includes('grade-1')),
    ).length;
    expect(badges.length).toBeLessThanOrEqual(listeningCount);
  });

  /* CR-148 (P2-4): the teaser card unlocks after the grade's first
     lantern lap and stamps the sticker once per grade. */
  it('keeps the island locked before a full lap, opens it after', () => {
    const { rerender } = render(<GameZoneShelf grade="grade-1" onPlay={vi.fn()} />);
    expect(screen.getByTestId('game-card-coming-soon')).toBeVisible();
    expect(visitMysteryIsland('grade-1').unlocked).toBe(false);
    for (let i = 0; i < 12; i++) recordBatchResult('grade-1', `batch:isle-${i}`, 3);
    rerender(<GameZoneShelf grade="grade-1" onPlay={vi.fn()} />);
    expect(screen.getByTestId('game-card-mystery-island')).toBeVisible();
  });

  it('grants the island sticker on first visit only', () => {
    for (let i = 0; i < 12; i++) recordBatchResult('grade-1', `batch:isle-${i}`, 3);
    expect(visitMysteryIsland('grade-1')).toEqual({ unlocked: true, firstVisit: true });
    expect(visitMysteryIsland('grade-1')).toEqual({ unlocked: true, firstVisit: false });
    render(<GameZoneShelf grade="grade-1" onPlay={vi.fn()} />);
    fireEvent.click(screen.getByTestId('game-card-mystery-island'));
    expect(screen.getByTestId('mystery-island-panel')).toBeVisible();
    expect(screen.getByTestId('mystery-island-panel').textContent).not.toContain('Huy hiệu mới');
  });
});
