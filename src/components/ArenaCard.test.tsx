import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArenaCard from './ArenaCard';
import type { ArenaOpenChallenge } from '../lib/arena';

vi.mock('../lib/arena', async () => {
  const actual = await vi.importActual('../lib/arena');
  return {
    ...actual,
    arenaOpen: vi.fn(),
    arenaRecent: vi.fn(),
  };
});
import { arenaOpen, arenaRecent } from '../lib/arena';

const openChallenge: ArenaOpenChallenge = {
  id: 'ch-1',
  creator_name: 'Minh',
  creator_score: 80,
  creator_time_ms: 95_000,
  program_id: 'english',
  seed: 'arena-x',
  created_at: '2026-10-03T00:00:00Z',
};

beforeEach(() => {
  vi.mocked(arenaOpen).mockReset();
  vi.mocked(arenaRecent).mockReset();
});

describe('ArenaCard - guest (AC-34.5)', () => {
  it('shows the bot-duel button and never calls the rpcs', () => {
    render(
      <ArenaCard gradeId="grade-2" isGuest onCreate={vi.fn()} onAccept={vi.fn()} onBot={vi.fn()} />,
    );
    expect(screen.getByTestId('arena-create').textContent).toContain('Đấu với máy');
    expect(arenaOpen).not.toHaveBeenCalled();
    expect(arenaRecent).not.toHaveBeenCalled();
  });

  it('bot button fires onBot', () => {
    const onBot = vi.fn();
    render(<ArenaCard gradeId="grade-2" isGuest onCreate={vi.fn()} onAccept={vi.fn()} onBot={onBot} />);
    fireEvent.click(screen.getByTestId('arena-create'));
    expect(onBot).toHaveBeenCalledOnce();
  });
});

describe('ArenaCard - logged in', () => {
  it('lists open challenges and accept fires onAccept (AC-34.2)', async () => {
    vi.mocked(arenaOpen).mockResolvedValue([openChallenge]);
    vi.mocked(arenaRecent).mockResolvedValue([]);
    const onAccept = vi.fn();
    render(
      <ArenaCard gradeId="grade-2" isGuest={false} onCreate={vi.fn()} onAccept={onAccept} onBot={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText('Minh')).toBeTruthy());
    expect(screen.getByText(/80 điểm/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('arena-accept-ch-1'));
    expect(onAccept).toHaveBeenCalledWith(openChallenge);
  });

  it('shows an empty state when no challenges are open', async () => {
    vi.mocked(arenaOpen).mockResolvedValue([]);
    vi.mocked(arenaRecent).mockResolvedValue([]);
    render(
      <ArenaCard gradeId="grade-2" isGuest={false} onCreate={vi.fn()} onAccept={vi.fn()} onBot={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(/Chưa có thử thách nào/)).toBeTruthy());
  });

  it('renders my recent duels with the win flag (AC-34.6)', async () => {
    vi.mocked(arenaOpen).mockResolvedValue([]);
    vi.mocked(arenaRecent).mockResolvedValue([
      {
        id: 'm1',
        creator_name: 'Minh',
        creator_score: 80,
        creator_time_ms: 90_000,
        opponent_name: 'Tôi',
        opponent_score: 90,
        opponent_time_ms: 80_000,
        i_created: false,
        i_won: true,
        is_draw: false,
        finished_at: '2026-10-03T01:00:00Z',
      },
    ]);
    render(
      <ArenaCard gradeId="grade-2" isGuest={false} onCreate={vi.fn()} onAccept={vi.fn()} onBot={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(/vs Minh/)).toBeTruthy());
    expect(screen.getByText(/90 - 80/)).toBeTruthy();
  });
});
