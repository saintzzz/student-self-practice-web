export const Card = ({ q }) => <div>{q.prompt_text}{q.answer.bool ? 'T' : 'F'}</div>;
export async function act(supabase: any, id: string) {
  const { error: err } = await supabase.rpc('review_question', { p_question_id: id, p_action: 'approve' });
  if (err) return err;
  setTotal((t) => Math.max(0, t - 1));
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
    .order('question_id')
    .range(offset, offset + 19);
  if (!alive()) return;
  setRows(data);
}, [statusFilter, offset]);
useEffect(() => { void load(); }, [load]);
