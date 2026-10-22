import { afterEach, describe, expect, it, vi } from 'vitest';

const reloadMock = vi.fn();
vi.stubGlobal('window', { location: { reload: reloadMock } });

import { reloadPageOnce } from './reload';

describe('reloadPageOnce (CR-104 r103)', () => {
  afterEach(() => {
    sessionStorage.clear();
    reloadMock.mockClear();
  });

  it('reloads twice, then stops (no infinite loop on a broken chunk)', () => {
    expect(reloadPageOnce('content-bank')).toBe(true);
    expect(reloadPageOnce('content-bank')).toBe(true);
    expect(reloadPageOnce('content-bank')).toBe(false);
    expect(reloadMock).toHaveBeenCalledTimes(2);
  });

  it('scopes are independent', () => {
    reloadPageOnce('a');
    reloadPageOnce('a');
    expect(reloadPageOnce('b')).toBe(true);
  });
});
