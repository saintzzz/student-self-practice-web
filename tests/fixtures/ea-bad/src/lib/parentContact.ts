import { getSupabase } from './supabase';
export async function saveParentContact(email: string, optedIn: boolean) {
  const { error } = await (await getSupabase())
    .from('parent_contacts')
    .upsert({ account_id: 'x', email, opted_in: optedIn, updated_at: '' }, { onConflict: 'account_id' });
  return !error;
}
