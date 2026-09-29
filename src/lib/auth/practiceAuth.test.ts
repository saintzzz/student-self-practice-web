import { describe, expect, it } from 'vitest';
import { usernameToEmail, USERNAME_RE, EMAIL_DOMAIN } from './practiceAuth';

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
