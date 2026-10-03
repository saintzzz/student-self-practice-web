import { getSupabase } from './supabase/client';
import { getSession } from './auth/practiceAuth';

/**
 * CR-47: class join code. A student types the 6-char code their teacher
 * shared and self-enrolls through the SECURITY DEFINER rpc - no admin
 * needed. RLS already lets students read their own enrollment and the
 * classes they belong to.
 */
export async function fetchMyClassName(): Promise<string | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await (await getSupabase())
      .from('enrollments')
      .select('classes(name)')
      .eq('student_id', session.user.id)
      .order('assigned_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const joined = (data as { classes?: { name?: string } | null }).classes;
    return joined?.name ?? null;
  } catch {
    return null;
  }
}

export type JoinResult = { ok: true; className: string } | { ok: false; message: string };

export async function joinClassByCode(code: string): Promise<JoinResult> {
  try {
    const session = await getSession();
    if (!session) return { ok: false, message: 'Em cần đăng nhập để vào lớp nhé.' };
    const { data, error } = await (await getSupabase()).rpc('join_class_by_code', { p_code: code });
    if (error) {
      const msg = error.message.includes('not found')
        ? 'Mã lớp chưa đúng - em kiểm tra lại với cô nhé.'
        : error.message.includes('already enrolled')
          ? 'Em đã ở trong một lớp rồi - nhờ cô chuyển lớp nhé.'
          : 'Có lỗi xảy ra, em thử lại sau nhé.';
      return { ok: false, message: msg };
    }
    return { ok: true, className: String(data) };
  } catch {
    return { ok: false, message: 'Có lỗi xảy ra, em thử lại sau nhé.' };
  }
}
