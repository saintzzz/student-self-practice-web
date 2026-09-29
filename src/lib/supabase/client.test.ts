import { describe, expect, it } from 'vitest';
import { isSupabaseConfigured } from './client';

describe('supabase client env gate (CR-08 AC-A6)', () => {
  it('forces the env-absent guest path under vitest even when .env.local exists', () => {
    // Vitest loads .env.local, so the raw var may be set here - the gate
    // must short-circuit on MODE=test regardless, keeping the whole
    // suite network-free.
    expect(import.meta.env.MODE).toBe('test');
    expect(isSupabaseConfigured()).toBe(false);
  });
});
