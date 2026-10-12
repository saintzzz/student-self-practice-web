export async function fetchBank(mode) {
  const params = { p_grade: 2, p_subject: 'en', p_mode: mode };
  return supabase.rpc('fetch_questions_public', params);
}
