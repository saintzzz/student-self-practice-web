export async function fetchBank(mode) {
  const params = { p_grade: 2, p_subject: 'en', p_mode: mode };
  const rows = await supabase.rpc('fetch_questions_public', params);
  const poolShort = rows.length < 20;
  return { rows, poolShort };
}
