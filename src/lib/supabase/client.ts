/**
 * CR-08 lazy Supabase client. Two layers of laziness:
 *  - env gate: absent env means "guest-only mode" and the app never
 *    imports the library at all (pre-CR-08 behavior, tests, budgets).
 *  - dynamic import: even when configured, supabase-js lands in an
 *    async chunk, not the entry bundle - same strategy as the Lottie
 *    runtime (AC-2.5).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any, any, any>;

let clientPromise: Promise<Client> | null = null;

export function isSupabaseConfigured(): boolean {
  // AC-A6: vitest loads .env.local too - force the env-absent guest path
  // under test so unit tests never reach the network.
  if (import.meta.env.MODE === 'test') return false;
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function getSupabase(): Promise<Client> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase chưa được cấu hình (thiếu biến môi trường).');
  }
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        { db: { schema: 'practice' } },
      ),
    );
  }
  return clientPromise;
}
