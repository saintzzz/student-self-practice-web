import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

/* Regression for the "Hanh trinh cua Be Heo" bug: the grade-select
   branch (the primary journey map) rendered GradeSelect without
   studentName, so a signed-in student saw the guest fallback. Both
   GradeSelect render paths must carry the account display name. */

vi.mock('./lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: vi.fn(),
}));

vi.mock('./lib/auth/practiceAuth', () => ({
  getSession: vi.fn(async () => ({ access_token: 'tok' })),
  fetchMyAccount: vi.fn(async () => ({
    id: 'acct-1',
    username: 'socxinh',
    display_name: 'Sóc Xinh',
    role: 'student',
  })),
  fetchMyAllowedGrades: vi.fn(async () => ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5']),
  login: vi.fn(),
  logout: vi.fn(async () => undefined),
  changePin: vi.fn(),
  onAuthChange: vi.fn(async () => ({ unsubscribe: () => undefined })),
}));

vi.mock('./lib/engagement/sync', () => ({
  bindEngagement: vi.fn(async () => undefined),
  unbindEngagement: vi.fn(),
  flushEngagement: vi.fn(async () => true),
  mergeEngagement: vi.fn(),
  engagementSyncHealthy: vi.fn(() => true),
}));

describe('journey map heading - signed-in student', () => {
  it('greets the student by display name, not the guest fallback', async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hành trình của Bé Sóc Xinh'),
    );
    expect(screen.queryByText(/Bé Heo/)).not.toBeInTheDocument();
  });
});
