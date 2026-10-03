import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchMyClassName, joinClassByCode } from './classJoin';

// CR-47 acceptance criteria - lib layer mocks supabase client + session.

const rpcMock = vi.fn();
const sessionMock = vi.fn();
const enrollSelectMock = vi.fn();

vi.mock('./supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: vi.fn(async () => ({
    rpc: (name: string, args: unknown) => rpcMock(name, args),
    from: (table: string) => ({
      select: () => ({
        eq: (_k: string, _v: string) => ({
          order: (_col: string, _opts: unknown) => ({
            limit: () => ({
              maybeSingle: async () => enrollSelectMock(table),
            }),
          }),
        }),
      }),
    }),
  })),
}));

vi.mock('./auth/practiceAuth', () => ({
  getSession: () => sessionMock(),
}));

const SESSION = { user: { id: 'stu-1' } };

describe('fetchMyClassName', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    sessionMock.mockReset();
    enrollSelectMock.mockReset();
  });

  it('returns null when there is no session', async () => {
    sessionMock.mockResolvedValue(null);
    expect(await fetchMyClassName()).toBeNull();
    expect(enrollSelectMock).not.toHaveBeenCalled();
  });

  it('returns the enrolled class name', async () => {
    sessionMock.mockResolvedValue(SESSION);
    enrollSelectMock.mockResolvedValue({ data: { classes: { name: 'Lớp 4A1' } }, error: null });
    expect(await fetchMyClassName()).toBe('Lớp 4A1');
  });

  it('returns null when not enrolled', async () => {
    sessionMock.mockResolvedValue(SESSION);
    enrollSelectMock.mockResolvedValue({ data: null, error: null });
    expect(await fetchMyClassName()).toBeNull();
  });
});

describe('joinClassByCode', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    sessionMock.mockReset();
  });

  it('guests cannot join', async () => {
    sessionMock.mockResolvedValue(null);
    const r = await joinClassByCode('ABC123');
    expect(r.ok).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('passes the code to join_class_by_code and returns the class name', async () => {
    sessionMock.mockResolvedValue(SESSION);
    rpcMock.mockResolvedValue({ data: 'Lớp Demo VieSchool', error: null });
    const r = await joinClassByCode('r8whyf');
    expect(rpcMock).toHaveBeenCalledWith('join_class_by_code', { p_code: 'r8whyf' });
    expect(r).toEqual({ ok: true, className: 'Lớp Demo VieSchool' });
  });

  it('maps a not-found error to a kid-friendly message', async () => {
    sessionMock.mockResolvedValue(SESSION);
    rpcMock.mockResolvedValue({ data: null, error: { message: 'class code not found' } });
    const r = await joinClassByCode('ZZZZZZ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('Mã lớp chưa đúng');
  });

  it('maps the already-enrolled error to the switch-class message', async () => {
    sessionMock.mockResolvedValue(SESSION);
    rpcMock.mockResolvedValue({ data: null, error: { message: 'already enrolled in a class' } });
    const r = await joinClassByCode('R8WHYF');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('chuyển lớp');
  });

  it('maps a generic rpc error to the retry message', async () => {
    sessionMock.mockResolvedValue(SESSION);
    rpcMock.mockResolvedValue({ data: null, error: { message: 'connection reset' } });
    const r = await joinClassByCode('ABC123');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('thử lại');
  });
});
