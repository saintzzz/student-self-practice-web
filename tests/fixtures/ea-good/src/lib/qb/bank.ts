export async function fetchBank(mode) {
  const params = { p_grade: 2, p_subject: 'en', p_mode: mode };
  const rows = await supabase.rpc('fetch_questions_public', params);
  const poolShort = rows.length < 20;
  return { rows, poolShort };
}

// r14 good: the clock starts after assembly (no caller timestamp) and
// the top-up excludes extras by the variant-group key, not just row id.
export async function createExamFromBank(programId, gradeId, opts) {
  const rows = await fetchBank('practice');
  const questions = rows.map(toExamQuestion).filter(Boolean);
  if (questions.length < 20) {
    const extra = await fetchBank('practice');
    const seenVariant = new Set(rows.map((r) => r.variant_group_id ?? r.id));
    const extraMapped = extra
      .filter((r) => !seenVariant.has(r.variant_group_id ?? r.id))
      .map(toExamQuestion)
      .filter((q) => q && !questions.some((x) => x.id === q.id));
    return pickUnseenFirst([...questions, ...extraMapped]);
  }
  return { questions, startedAtMs: Date.now() };
}
