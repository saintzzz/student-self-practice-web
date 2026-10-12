// r15 bad: refresh() applies every response unconditionally - a slow
// earlier refresh overwrites the state a mutation-triggered one set.
const refresh = useCallback(async () => {
  const supa = await getSupabase();
  const [a, c, e, s] = await Promise.all([
    fetchAllRows((f, t) => supa.from('accounts').range(f, t)),
    fetchAllRows((f, t) => supa.from('classes').range(f, t)),
    fetchAllRows((f, t) => supa.from('enrollments').range(f, t)),
    fetchAllRows((f, t) => supa.from('class_grade_scopes').range(f, t)),
  ]);
  setAccounts(a.rows);
  setClasses(c.rows);
  setEnrolled(e.rows);
  setScopes(s.rows);
}, [say]);
