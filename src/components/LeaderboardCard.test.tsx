import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaderboardCard from './LeaderboardCard';
import type { LeaderboardEntry } from '../lib/leaderboard';

const fetchLeaderboardMock = vi.fn<(gradeId: string, limit?: number) => Promise<LeaderboardEntry[] | null>>();

vi.mock('../lib/leaderboard', () => ({
  fetchLeaderboard: (...args: unknown[]) =>
    fetchLeaderboardMock(...(args as [string, number?])),
}));
vi.mock('../lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
}));

const ROWS: LeaderboardEntry[] = [
  { rank: 1, display_name: 'Bé An', weekly_points: 120, weekly_correct: 40, is_me: false },
  { rank: 2, display_name: 'Bé Bình', weekly_points: 90, weekly_correct: 30, is_me: false },
  { rank: 7, display_name: 'Bé Mình', weekly_points: 12, weekly_correct: 4, is_me: true },
];

describe('LeaderboardCard (CR-30)', () => {
  beforeEach(() => {
    fetchLeaderboardMock.mockReset();
  });

  it('AC-30.3 guest sees a lock prompt, never names', () => {
    render(<LeaderboardCard gradeId="grade-4" isGuest />);
    expect(screen.getByTestId('leaderboard-card')).toBeTruthy();
    expect(screen.getByText(/Đăng nhập để thi đua/)).toBeTruthy();
    expect(screen.queryByText('Bé An')).toBeNull();
    expect(fetchLeaderboardMock).not.toHaveBeenCalled();
  });

  it('guest login button routes to the login flow', async () => {
    const onLogin = vi.fn();
    render(<LeaderboardCard gradeId="grade-4" isGuest onLogin={onLogin} />);
    await userEvent.click(screen.getByTestId('leaderboard-login'));
    expect(onLogin).toHaveBeenCalled();
  });

  it('AC-30.1 renders ranked weekly standings', async () => {
    fetchLeaderboardMock.mockResolvedValue(ROWS);
    render(<LeaderboardCard gradeId="grade-4" isGuest={false} />);
    await waitFor(() => expect(screen.getByText('Bé An')).toBeTruthy());
    expect(screen.getByText('120 điểm')).toBeTruthy();
    expect(fetchLeaderboardMock).toHaveBeenCalledWith('grade-4');
  });

  it('AC-30.2 own row renders outside the top 10 with highlight', async () => {
    fetchLeaderboardMock.mockResolvedValue(ROWS);
    render(<LeaderboardCard gradeId="grade-4" isGuest={false} />);
    const ownRow = await screen.findByTestId('leaderboard-row-7');
    expect(ownRow.textContent).toContain('Bé Mình');
    expect(ownRow.textContent).toContain('(mình)');
    expect(ownRow.className).toContain('ring-amber-400');
  });

  it('AC-30.5 empty week shows a friendly empty state', async () => {
    fetchLeaderboardMock.mockResolvedValue([]);
    render(<LeaderboardCard gradeId="grade-4" isGuest={false} />);
    await waitFor(() => expect(screen.getByTestId('leaderboard-empty')).toBeTruthy());
  });

  it('rpc failure falls back to the empty state, never throws', async () => {
    fetchLeaderboardMock.mockResolvedValue(null);
    render(<LeaderboardCard gradeId="grade-4" isGuest={false} />);
    await waitFor(() => expect(screen.getByTestId('leaderboard-empty')).toBeTruthy());
  });
});
