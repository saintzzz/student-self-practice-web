import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';

export interface ParentContact {
  email: string;
  opted_in: boolean;
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
      .select('email, opted_in')
      .eq('account_id', session.user.id)
      .maybeSingle();
    if (error) return null;
    return data ? { email: String(data.email), opted_in: Boolean(data.opted_in) } : null;
  } catch {
    return null;
  }
}

/** Upsert the parent's email + opt-in flag for the current account. */
export async function saveParentContact(email: string, optedIn: boolean): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session) return false;
    const { error } = await (await getSupabase())
      .from('parent_contacts')
      .upsert(
        {
          account_id: session.user.id,
          email: email.trim().toLowerCase(),
          opted_in: optedIn,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' },
      );
    return !error;
  } catch {
    return false;
  }
}
