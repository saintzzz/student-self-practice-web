const pin = 'demo2026';
export async function fetchBank(mode) {
  return supabase.rpc('fetch_questions_public', { p_grade: 2, p_subject: 'en' });
}
