import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Keyset/range pagination over the PostgREST ~1000-row cap.
 * The callback builds one page query given [from, to] range and must
 * include a stable .order() - un-ordered pagination duplicates/skips rows.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  pageSize = 1000,
): Promise<{ rows: T[]; error: PostgrestError | null; truncated: boolean }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) return { rows, error, truncated: false };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return { rows, error: null, truncated: false };
    if (rows.length > 200_000) return { rows, error: null, truncated: true };
  }
}
