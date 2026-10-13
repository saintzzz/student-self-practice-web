// r17 bad: aggregate max-merge drops the smaller device's independent
// progress, and the blind whole-row upsert lets a concurrent push
// overwrite the merge.
export function mergeEngagement(local, remote) {
  const days = { ...(remote.stats?.days ?? {}) };
  for (const [d, c] of Object.entries(local.stats?.days ?? {})) {
    const r = days[d];
    days[d] = r
      ? { correct: Math.max(c.correct, r.correct), total: Math.max(c.total, r.total) }
      : c;
  }
  return { ...local, stats: { days } };
}

export async function bindEngagement(accountId) {
  markOwnerAccountId(accountId);
}

async function push(supabase, accountId, state) {
  await supabase.from('engagement_state').upsert({ account_id: accountId, state });
}
