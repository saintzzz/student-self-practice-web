import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';

export interface ParentContact {
  email: string;
  opted_in: boolean;
  verified: boolean;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidParentEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** CR-31: the student's own parent_contact row, or null (guest/none). */
export async function fetchParentContact(): Promise<ParentContact | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase())
      .from('parent_contacts')
      .select('email, opted_in, verified')
      .eq('account_id', session.user.id)
      .maybeSingle();
    if (error) return null;
    return data
      ? { email: String(data.email), opted_in: Boolean(data.opted_in), verified: Boolean(data.verified) }
      : null;
  } catch {
    return null;
  }
}

/** Upsert the parent's email + opt-in flag for the current account. */
export async function saveParentContact(email: string, optedIn: boolean): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session) return false;
    // r8: direct table upsert needed UPDATE on account_id (PostgREST
    // ON CONFLICT DO UPDATE checks every payload column) which r7 rightly
    // never granted - the RPC binds account_id itself and writes only the
    // mutable columns.
    const { data, error } = await (await getSupabase()).rpc('save_parent_contact', {
      p_email: email.trim(),
      p_opted_in: optedIn,
    });
    return !error && data?.ok === true;
  } catch {
    return false;
  }
}

/**
 * r6: ask the server to email a signed confirm link to the saved address.
 * The weekly report only goes to verified recipients, so this is the step
 * that proves the mailbox actually belongs to the parent.
 */
export async function requestParentVerify(): Promise<'sent' | 'already' | 'throttled' | 'failed'> {
  try {
    const session = await getSession();
    if (!session) return 'failed';
    const { data, error } = await (await getSupabase()).rpc('request_parent_verify');
    if (error || !data?.ok) return 'failed';
    if (data.already_verified) return 'already';
    if (data.throttled) return 'throttled';
    return 'sent';
  } catch {
    return 'failed';
  }
}

/** r6: confirm link target - the token in the URL is the capability. */
export async function confirmParentEmail(token: string): Promise<boolean> {
  try {
    const { data, error } = await (await getSupabase()).rpc('confirm_parent_email', {
      p_token: token,
    });
    return !error && data?.ok === true;
  } catch {
    return false;
  }
}
