import { beforeEach, describe, expect, it, vi } from 'vitest';

// r16 result-owner-binding: a result row belongs to the identity active
// when the activity STARTED, not whoever owns the session at save time.

const sessionRef = { current: { user: { id: 'user-a' } } as { user: { id: string } } | null };
vi.mock('./auth/practiceAuth', () => ({
  getSession: vi.fn(() => Promise.resolve(sessionRef.current)),
}));

const insertSpy = vi.fn(() => Promise.resolve({ error: null }));
const rpcSpy = vi.fn(() => Promise.resolve({ error: null }));
vi.mock('./supabase/client', () => ({
  getSupabase: vi.fn(() =>
    Promise.resolve({ from: () => ({ insert: insertSpy }), rpc: rpcSpy }),
  ),
}));

import {
  activityOwnerMatches,
  bindActivityOwner,
  clearActivityOwner,
  saveExamResult,
  savePlacementResult,
  savePracticeResult,
} from './practiceResults';

const BATCH = {
  points: 10,
  maxPoints: 20,
  totalCorrect: 5,
  totalQuestions: 10,
  rounds: [{}],
  timeUsedSec: 60,
} as never;

beforeEach(() => {
  insertSpy.mockClear();
  rpcSpy.mockClear();
  sessionRef.current = { user: { id: 'user-a' } };
  clearActivityOwner();
});

describe('savePracticeResult owner binding', () => {
  it('saves under the starting account when the session is unchanged', async () => {
    await bindActivityOwner();
    await savePracticeResult('grade-2', BATCH);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'user-a', program: 'batch' }),
    );
  });

  it('drops the result when the account switched mid-activity', async () => {
    await bindActivityOwner(); // owner = user-a
    sessionRef.current = { user: { id: 'user-b' } }; // mid-activity switch
    await savePracticeResult('grade-2', BATCH);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('drops a guest-started run when a user logs in mid-activity', async () => {
    sessionRef.current = null;
    await bindActivityOwner(); // owner = guest
    sessionRef.current = { user: { id: 'user-b' } }; // login during the run
    await savePracticeResult('grade-2', BATCH);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('still saves by save-time session when no bind happened (legacy path)', async () => {
    await savePracticeResult('grade-2', BATCH);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ account_id: 'user-a' }));
  });

  it('never saves for a guest without a session', async () => {
    sessionRef.current = null;
    await savePracticeResult('grade-2', BATCH);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe('saveExamResult owner binding', () => {
  const EXAM = { points: 50, totalCount: 10, correctCount: 5, timeUsedSec: 300 };

  it('saves under the starting account', async () => {
    await bindActivityOwner();
    await saveExamResult('grade-3', 'english', EXAM);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ account_id: 'user-a' }));
  });

  it('drops the result when the account switched mid-exam', async () => {
    await bindActivityOwner();
    sessionRef.current = { user: { id: 'user-b' } };
    await saveExamResult('grade-3', 'english', EXAM);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe('savePlacementResult owner binding', () => {
  it('saves under the starting account', async () => {
    await bindActivityOwner();
    await savePlacementResult('grade-4', 12, 20);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ account_id: 'user-a' }));
    expect(rpcSpy).toHaveBeenCalledWith('set_my_placement', { g: 'grade-4' });
  });

  it('drops result AND placement rpc when the account switched', async () => {
    await bindActivityOwner();
    sessionRef.current = { user: { id: 'user-b' } };
    await savePlacementResult('grade-4', 12, 20);
    expect(insertSpy).not.toHaveBeenCalled();
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});

describe('activityOwnerMatches (r17 - arena submit guard)', () => {
  it('is true while the bound owner still holds the session', async () => {
    await bindActivityOwner();
    expect(await activityOwnerMatches()).toBe(true);
  });

  it('is false after a mid-activity account switch', async () => {
    await bindActivityOwner();
    sessionRef.current = { user: { id: 'user-b' } };
    expect(await activityOwnerMatches()).toBe(false);
  });

  it('is false when a guest-bound activity finds a later login', async () => {
    sessionRef.current = null;
    await bindActivityOwner();
    sessionRef.current = { user: { id: 'user-b' } };
    expect(await activityOwnerMatches()).toBe(false);
  });

  it('is true for unbound callers (legacy paths unaffected)', async () => {
    sessionRef.current = { user: { id: 'user-b' } };
    expect(await activityOwnerMatches()).toBe(true);
  });
});
