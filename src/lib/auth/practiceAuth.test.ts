import { describe, expect, it, vi } from 'vitest';
import { logout, usernameToEmail, USERNAME_RE, EMAIL_DOMAIN } from './practiceAuth';

const signOutMock = vi.fn(async () => ({ error: null }));
vi.mock('../supabase/client', () => ({
  getSupabase: async () => ({ auth: { signOut: signOutMock } }),
  isSupabaseConfigured: () => true,
}));

describe('practiceAuth username mapping (CR-08)', () => {
  it('maps username to the synthetic student email domain', () => {
    expect(usernameToEmail('BeAn_03')).toBe(`bean_03@${EMAIL_DOMAIN}`);
    expect(usernameToEmail('  hs-lop3  ')).toBe(`hs-lop3@${EMAIL_DOMAIN}`);
  });

  it('USERNAME_RE accepts lowercase letters, digits, dash and underscore (3-20)', () => {
    for (const ok of ['hs01', 'be_an-3', 'a'.repeat(20), '123456']) {
      expect(USERNAME_RE.test(ok), ok).toBe(true);
    }
    for (const bad of ['ab', 'A' + 'b'.repeat(19) + 'a', 'có dấu', 'sp ace', 'x'.repeat(21), '']) {
      expect(USERNAME_RE.test(bad), bad).toBe(false);
    }
  });
});

describe('logout - r13 signOut error propagation', () => {
  it('rejects when signOut reports an error through its channel', async () => {
    signOutMock.mockResolvedValueOnce({ error: { message: 'revoke failed' } as never });
    await expect(logout()).rejects.toThrow('revoke failed');
    signOutMock.mockResolvedValueOnce({ error: null });
    await expect(logout()).resolves.toBeUndefined();
  });
});
