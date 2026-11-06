import { beforeEach, describe, expect, it, vi } from 'vitest';
import { alreadyReported, submitQuestionReport } from './questionReport';
import { todayISO } from './engagement/store';

const sessionMock = vi.fn();
const supabaseMock = vi.fn();

vi.mock('./supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => supabaseMock(),
}));

vi.mock('./auth/practiceAuth', () => ({
  getSession: () => sessionMock(),
}));

const SESSION = { user: { id: 'stu-1' } };

function insertResult(error: { message: string } | null) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  builder.insert = (...args: unknown[]) => {
    calls.push(['insert', ...args]);
    return Promise.resolve({ data: null, error });
  };
  const client = { from: (table: string) => { calls.push(['from', table]); return builder; } };
  return { client, calls };
}

beforeEach(() => {
  localStorage.clear();
  sessionMock.mockReset().mockResolvedValue(SESSION);
  supabaseMock.mockReset();
});

describe('CR-131 submitQuestionReport', () => {
  it('returns guest without touching the network when there is no session', async () => {
    sessionMock.mockResolvedValue(null);
    expect(await submitQuestionReport({ questionId: 'q1', kind: 'typo' })).toBe('guest');
    expect(supabaseMock).not.toHaveBeenCalled();
  });

  it('inserts one row with account_id, kind and context', async () => {
    const { client, calls } = insertResult(null);
    supabaseMock.mockResolvedValue(client);
    expect(await submitQuestionReport({ questionId: 'q1', kind: 'wrong-answer', note: 'dap an sai', context: 'exam-review' })).toBe('sent');
    const insert = calls.find((c) => c[0] === 'insert');
    expect(calls[0]).toEqual(['from', 'question_reports']);
    expect(insert?.[1]).toMatchObject({ question_id: 'q1', account_id: 'stu-1', kind: 'wrong-answer', note: 'dap an sai', context: 'exam-review' });
  });

  it('dedupes same-day repeat reports client-side', async () => {
    const { client } = insertResult(null);
    supabaseMock.mockResolvedValue(client);
    expect(await submitQuestionReport({ questionId: 'q2', kind: 'typo' })).toBe('sent');
    expect(alreadyReported('q2')).toBe(true);
    expect(await submitQuestionReport({ questionId: 'q2', kind: 'typo' })).toBe('duplicate');
    expect(alreadyReported('other')).toBe(false);
    expect(localStorage.getItem('ea-question-reports-v1')).toContain(`${todayISO()}:q2`);
  });

  it('propagates an insert failure as error', async () => {
    const { client } = insertResult({ message: 'rls' });
    supabaseMock.mockResolvedValue(client);
    expect(await submitQuestionReport({ questionId: 'q3', kind: 'audio' })).toBe('error');
    expect(alreadyReported('q3')).toBe(false);
  });

  it('returns error (no unhandled rejection) when getSession rejects', async () => {
    sessionMock.mockRejectedValue(new Error('auth down'));
    expect(await submitQuestionReport({ questionId: 'q4', kind: 'typo' })).toBe('error');
    expect(supabaseMock).not.toHaveBeenCalled();
  });

  it('returns error when getSupabase rejects', async () => {
    supabaseMock.mockRejectedValue(new Error('import failed'));
    expect(await submitQuestionReport({ questionId: 'q5', kind: 'typo' })).toBe('error');
  });

  it('truncates note to the 200-char DB guard', async () => {
    const { client, calls } = insertResult(null);
    supabaseMock.mockResolvedValue(client);
    await submitQuestionReport({ questionId: 'q6', kind: 'other', note: 'x'.repeat(300) });
    const insert = calls.find((c) => c[0] === 'insert');
    expect((insert?.[1] as { note: string }).note).toHaveLength(200);
  });
});
