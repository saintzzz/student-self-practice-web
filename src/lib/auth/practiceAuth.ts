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
  /** CR-23: lop goi y tu bai placement (null khi chua lam). */
  placement_grade?: string | null;
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
  // r13: signOut() reports failure through its error channel, not a
  // throw - silently discarding it makes a failed logout look done.
  const { error } = await (await getSupabase()).auth.signOut();
  if (error) throw error;
}

/** CR-17: student self-service PIN change (Supabase password update on the
 *  live session). PIN is alphanumeric, >= 6 chars - matches practice-admin. */
export async function changePin(newPin: string): Promise<string | null> {
  if (newPin.length < 6) return 'Mã PIN cần ít nhất 6 ký tự.';
  const { error } = await (await getSupabase()).auth.updateUser({ password: newPin });
  return error ? 'Chưa đổi được mã PIN - thử lại nhé.' : null;
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
  const { data, error } = await (await getSupabase())
    .from('accounts')
    .select('id, username, display_name, role, placement_grade')
    .eq('id', user.id)
    .maybeSingle();
  // maybeSingle phan biet "khong co row" voi "query loi" - loi phai log ra
  // chu khong tra null nhu khong co account (im lang sai quyen hien thi).
  if (error) console.warn('[auth] fetch my account:', error.message);
  return (data as PracticeAccount | null) ?? null;
}

/** Union of class_grade_scopes across the student's enrollments. */
export async function fetchMyAllowedGrades(): Promise<string[]> {
  const supa = await getSupabase();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return [];
  // Chi lay scopes cua cac lop account nay da enroll - doc ca bang tra
  // moi truong lop tren he thong cho moi hoc sinh (unbounded + sai scope).
  const { data: enr, error: enrErr } = await supa
    .from('enrollments')
    .select('class_id')
    .eq('student_id', user.id);
  if (enrErr) console.warn('[auth] fetch enrollments:', enrErr.message);
  const classIds = (enr ?? []).map((r: { class_id: string }) => r.class_id);
  if (!classIds.length) return [];
  // bounded-ok: classIds la enrollments cua 1 hoc sinh - it lop.
  const { data, error } = await supa
    .from('class_grade_scopes')
    .select('grade_id')
    .in('class_id', classIds);
  // query loi khong duoc render nhu "khong co quyen truy cap" - log de biet.
  if (error) console.warn('[auth] fetch allowed grades:', error.message);
  const ids = new Set((data ?? []).map((r: { grade_id: string }) => r.grade_id));
  return [...ids].sort();
}
