import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';

export async function savePracticeResult(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await (await getSupabase()).from('results').insert({ account_id: session.user.id });
}
