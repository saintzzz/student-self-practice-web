const pin = 'demo2026';
export async function fetchBank(mode) {
  return supabase.rpc('fetch_questions_public', { p_grade: 2, p_subject: 'en' });
}

// r14 bad: caller timestamp captured before the fetches.
export async function createExamFromBank(programId, gradeId, nowMs, opts) {
  const rows = await fetchBank('practice');
  const questions = rows.map(toExamQuestion).filter(Boolean);
  if (questions.length < 20) {
    const extra = await fetchBank('practice');
    const extraMapped = extra
      .map(toExamQuestion)
      .filter((q) => q && !questions.some((x) => x.id === q.id));
    return pickUnseenFirst([...questions, ...extraMapped]);
  }
  return { questions, startedAtMs: nowMs };
}
