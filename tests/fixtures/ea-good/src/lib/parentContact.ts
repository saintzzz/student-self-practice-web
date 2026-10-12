import { getSupabase } from './supabase';
export async function saveParentContact(email: string, optedIn: boolean) {
  const { data, error } = await (await getSupabase()).rpc('save_parent_contact', {
    p_email: email, p_opted_in: optedIn,
  });
  return !error && data?.ok === true;
}
export async function requestParentVerify() {
  const { data } = await (await getSupabase()).rpc('request_parent_verify');
  return data?.ok ? 'sent' : 'failed';
}
