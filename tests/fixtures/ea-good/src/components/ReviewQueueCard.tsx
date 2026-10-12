export const Card = ({ q }) => <div>{q.prompt_text}{q.passage}{q.statement}{q.tokens}{q.explanation_vi}{q.choices}{q.answer.bool ?? q.answer.boolean}</div>;
const loadRef = useRef(load);
export async function act(supabase: any, id: string) {
  const genAtStart = loadGenRef.current;
  const { data, error: err } = await supabase.rpc('review_question', { p_question_id: id, p_action: 'approve' });
  if (genAtStart !== loadGenRef.current) { void loadRef.current(); return; }
  if (err) return err;
  if (data?.stale) return reload();
  if (data?.ok !== true) return 'denied';
  loadGenRef.current++;
  setTotal((t) => Math.max(0, t - 1));
  if ((rows?.length ?? 0) <= 1 && offset > 0) setOffset(Math.max(0, offset - 20));
  return 'removed';
}
const loadGenRef = useRef(0);
export const load = useCallback(async () => {
  const gen = ++loadGenRef.current;
  const alive = () => gen === loadGenRef.current;
  const { data } = await supabase
    .from('qb_review_queue')
    .select('question_id, priority')
    .eq('review_status', statusFilter)
    .order('priority')
    .order('question_id')
    .range(offset, offset + 19);
  if (!alive()) return;
  setRows(data);
}, [statusFilter, offset]);
useEffect(() => {
  void load();
  return () => { loadGenRef.current++; };
}, [load]);
