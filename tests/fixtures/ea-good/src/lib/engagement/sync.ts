// r17 good: counters merge through per-device buckets (independent
// progress sums instead of collapsing to max) and the write is
// version-checked so a concurrent push cannot clobber the merge.
export function mergeEngagement(local, remote) {
  const mergedDevices = mergeDeviceBuckets(local.stats, remote.stats);
  const { days, skills, skillDays } = sumDeviceBuckets(mergedDevices);
  return { ...local, stats: { days, skills, skillDays, devices: mergedDevices } };
}

export async function bindEngagement(accountId) {
  restoreParkedBlob(accountId);
  markOwnerAccountId(accountId);
}

async function push(supabase, accountId, state, updatedAt) {
  await supabase
    .from('engagement_state')
    .update({ state })
    .eq('account_id', accountId)
    .eq('updated_at', updatedAt)
    .select('account_id');
}
