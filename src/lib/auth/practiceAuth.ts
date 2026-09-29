/**
 * CR-08 auth + RBAC helpers. Username+PIN maps to a synthetic email so
 * kids never share real contact data (PRD 18.3 R-A2/R-A6).
 */
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../supabase/client';

export const EMAIL_DOMAIN = 'students.ioe-practice.example';
export const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;

export type PracticeRole = 'admin' | 'student';

export interface PracticeAccount {
  id: string;
  username: string;
  display_name: string;
  role: PracticeRole;
}

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

export async function login(username: string, pin: string): Promise<string | null> {
  const { error } = await (await getSupabase()).auth.signInWithPassword({
    email: usernameToEmail(username),
    password: pin,
  });
  return error ? 'Tên đăng nhập hoặc mã PIN chưa đúng.' : null;
}

export async function logout(): Promise<void> {
  await (await getSupabase()).auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await (await getSupabase()).auth.getSession();
  return data.session;
}

export async function onAuthChange(callback: (session: Session | null) => void): Promise<{
  unsubscribe: () => void;
}> {
  const { data } = (await getSupabase()).auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}

/** Own row in practice.accounts - RLS restricts it to self/admin. */
export async function fetchMyAccount(): Promise<PracticeAccount | null> {
  const { data: { user } } = await (await getSupabase()).auth.getUser();
  if (!user) return null;
  const { data } = await (await getSupabase())
    .from('accounts')
    .select('id, username, display_name, role')
    .eq('id', user.id)
    .maybeSingle();
  return (data as PracticeAccount | null) ?? null;
}

/** Union of class_grade_scopes across the student's enrollments. */
export async function fetchMyAllowedGrades(): Promise<string[]> {
  const { data } = await (await getSupabase()).from('class_grade_scopes').select('grade_id');
  const ids = new Set((data ?? []).map((r: { grade_id: string }) => r.grade_id));
  return [...ids].sort();
}
