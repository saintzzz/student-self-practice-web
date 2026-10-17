import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GameScreen from './GameScreen';
import { gameLevelStars, getState, recordGameResult, resetForTests } from '../lib/engagement/store';
import type { GameProps } from './types';

/* Stub every game component: the screen contract (level pick -> run ->
 * end) is what this suite checks; each game's internals have their own
 * specs. The stub reports which seed/level it received and finishes on
 * demand. */
const stubCalls: { level?: number; seed?: string }[] = [];
vi.mock('./registry', async () => {
  const React = await import('react');
  const { GAME_DEFS } = await import('./defs');
  const Stub = (props: GameProps) => {
    stubCalls.push({ level: props.level, seed: props.seed });
    return React.createElement(
      'button',
      {
        'data-testid': 'stub-finish',
        onClick: () => props.onEnd({ points: 10, maxPoints: 10, correctCount: 5 }),
      },
      'finish',
    );
  };
  return { GAME_COMPONENTS: Object.fromEntries(GAME_DEFS.map((d) => [d.id, Stub])) };
});

const grade = { id: 'grade-2', name: 'Lớp 2' };

describe('GameScreen level flow (CR-88)', () => {
  beforeEach(() => {
    resetForTests();
    stubCalls.length = 0;
  });

  it('opens on the 3-rung level picker, not the game', () => {
    render(<GameScreen grade={grade} gameId="balloon-pop" onExit={vi.fn()} />);
    expect(screen.getByTestId('game-level-picker')).toBeVisible();
    for (const l of [1, 2, 3]) expect(screen.getByTestId(`game-level-${l}`)).toBeVisible();
    expect(screen.queryByTestId('game-timer')).toBeNull();
  });

  it('picking a level mounts the game with that level + a level-scoped seed and starts the clock', () => {
    render(<GameScreen grade={grade} gameId="balloon-pop" onExit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('game-level-2'));
    expect(screen.queryByTestId('game-level-picker')).toBeNull();
    expect(screen.getByTestId('stub-finish')).toBeVisible();
    expect(screen.getByTestId('game-timer')).toBeVisible();
    expect(stubCalls[0].level).toBe(2);
    expect(stubCalls[0].seed).toContain('-L2');
  });

  it('a finished run records a level-scoped result + shows score/time report', () => {
    render(<GameScreen grade={grade} gameId="memory-match" onExit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('game-level-3'));
    fireEvent.click(screen.getByTestId('stub-finish'));
    expect(screen.getByTestId('game-end-screen')).toBeVisible();
    expect(screen.getByTestId('game-time-report')).toBeVisible();
    expect(gameLevelStars('memory-match', 3)).toBe(3);
    // level-scoped objective was granted
    const granted = getState().grantedObjectives ?? {};
    expect(Object.keys(granted).some((k) => k.startsWith('game:memory-match:L3:'))).toBe(true);
  });

  it('"Chọn màn" returns to the picker and re-picking the same level gets a fresh seed (r39)', () => {
    render(<GameScreen grade={grade} gameId="racing-cars" onExit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('game-level-1'));
    fireEvent.click(screen.getByTestId('stub-finish'));
    const firstSeed = stubCalls[stubCalls.length - 1]!.seed;
    fireEvent.click(screen.getByTestId('game-back-to-zone'));
    expect(screen.getByTestId('game-level-picker')).toBeVisible();
    // re-picking the SAME level must seed a new run - otherwise the
    // objective id repeats and the replay silently earns nothing
    fireEvent.click(screen.getByTestId('game-level-1'));
    const secondSeed = stubCalls[stubCalls.length - 1]!.seed;
    expect(secondSeed).not.toBe(firstSeed);
    fireEvent.click(screen.getByTestId('stub-finish'));
    const before = stubCalls[stubCalls.length - 1]!.seed!;
    fireEvent.click(screen.getByTestId('game-replay'));
    const last = stubCalls[stubCalls.length - 1]!;
    expect(last.seed).not.toBe(before);
    expect(last.seed).toContain('-L1');
  });

  it('replay remounts the same level with a fresh seed', () => {
    render(<GameScreen grade={grade} gameId="racing-cars" onExit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('game-level-1'));
    fireEvent.click(screen.getByTestId('stub-finish'));
    const before = stubCalls[stubCalls.length - 1]!.seed!;
    fireEvent.click(screen.getByTestId('game-replay'));
    const last = stubCalls[stubCalls.length - 1]!;
    expect(last.seed).not.toBe(before);
    expect(last.seed).toContain('-L1');
  });
  it('level best stars appear on the picker buttons', () => {
    recordGameResult('grade-2', 'whack-a-mole', 's1', 10, 10, 2);
    render(<GameScreen grade={grade} gameId="whack-a-mole" onExit={vi.fn()} />);
    expect(screen.getByLabelText('Màn 2: 3 sao')).toBeVisible();
    expect(screen.getByLabelText('Màn 1: 0 sao')).toBeVisible();
  });
});
