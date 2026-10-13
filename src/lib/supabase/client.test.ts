import { describe, expect, it } from 'vitest';
import { forceGuestEnabled, isSupabaseConfigured } from './client';

describe('supabase client env gate (CR-08 AC-A6)', () => {
  it('forces the env-absent guest path under vitest even when .env.local exists', () => {
    // Vitest loads .env.local, so the raw var may be set here - the gate
    // must short-circuit on MODE=test regardless, keeping the whole
    // suite network-free.
    expect(import.meta.env.MODE).toBe('test');
    expect(isSupabaseConfigured()).toBe(false);
  });
});

describe('forceGuestEnabled (r17 - dev-only e2e hatch)', () => {
  it('ignores the flag outside dev builds - production trial lock holds', () => {
    localStorage.setItem('beheo-force-guest', '1');
    expect(forceGuestEnabled(false)).toBe(false);
    localStorage.removeItem('beheo-force-guest');
  });

  it('honors the flag only in dev mode', () => {
    localStorage.setItem('beheo-force-guest', '1');
    expect(forceGuestEnabled(true)).toBe(true);
    expect(forceGuestEnabled(true)).toBe(true);
    localStorage.removeItem('beheo-force-guest');
    expect(forceGuestEnabled(true)).toBe(false);
  });
});
