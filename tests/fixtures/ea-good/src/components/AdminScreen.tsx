// r15 good: every refresh captures a generation - a superseded
// response is discarded instead of overwriting the newer state.
const refreshGenRef = useRef(0);
const refresh = useCallback(async () => {
  const gen = ++refreshGenRef.current;
  const supa = await getSupabase();
  const [a, c, e, s] = await Promise.all([
    fetchAllRows((f, t) => supa.from('accounts').range(f, t)),
    fetchAllRows((f, t) => supa.from('classes').range(f, t)),
    fetchAllRows((f, t) => supa.from('enrollments').range(f, t)),
    fetchAllRows((f, t) => supa.from('class_grade_scopes').range(f, t)),
  ]);
  if (gen !== refreshGenRef.current) return;
  setAccounts(a.rows);
  setClasses(c.rows);
  setEnrolled(e.rows);
  setScopes(s.rows);
}, [say]);
useEffect(() => {
  void refresh();
  return () => { refreshGenRef.current++; };
}, [refresh]);
