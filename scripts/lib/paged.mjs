/**
 * Keyset pagination over PostgREST - replaces `offset=N` loops.
 *
 * Offset pagination makes Postgres scan + discard every row before the
 * page: on qb_questions (132k rows, 344MB, larger than the compute's
 * RAM) a full-table pass costs O(n²) disk reads and was the root cause
 * of the disk-IO-budget exhaustion alert.
 *
 * Keyset (`id=gt.<cursor>&order=id`) reads only the page's own rows -
 * constant cost per page regardless of depth.
 *
 * Usage:
 *   for await (const page of paged(`${SUPA}/rest/v1/qb_questions?select=id,prompt_text&grade=eq.3`, { headers: H }))
 *     // page is rows[] - up to `page` rows
 *
 * `baseUrl` must NOT contain order=/limit=/offset= - the helper owns them.
 * `order` may be "id" or "id.asc"; desc ordering is rejected (callers
 * scan forward only).
 */
export async function* paged(baseUrl, { headers = {}, order = 'id', page = 1000, timeout = 20000, retries = 4, from = null } = {}) {
  const col = order.replace(/\.(asc|desc)$/, '');
  if (/\.desc$/.test(order)) throw new Error('paged: desc ordering unsupported');
  const sep = baseUrl.includes('?') ? '&' : '?';
  // `from` resumes AFTER this cursor value - replaces the old `--offset N`
  // resume flag (translate offset -> cursor with a single 1-row fetch).
  let cursor = from;
  for (;;) {
    const keyset = cursor == null ? '' : `&${col}=gt.${encodeURIComponent(String(cursor))}`;
    const url = `${baseUrl}${sep}order=${order}${keyset}&limit=${page}`;
    let res;
    for (let t = 0; t < retries; t++) {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) }).catch(() => null);
      if (res?.ok) break;
      if (t === retries - 1) throw new Error(`paged: ${res?.status ?? 'network'} ${await res?.text?.() ?? ''}`.slice(0, 200));
      await new Promise((s) => setTimeout(s, 1500 * (t + 1)));
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return;
    yield rows;
    if (rows.length < page) return;
    cursor = rows[rows.length - 1][col];
    if (cursor == null) throw new Error(`paged: order column "${col}" absent from row - add it to select=`);
  }
}

/** Convenience: collect all pages into one array. */
export async function pagedAll(baseUrl, opts = {}) {
  const out = [];
  for await (const page of paged(baseUrl, opts)) out.push(...page);
  return out;
}
