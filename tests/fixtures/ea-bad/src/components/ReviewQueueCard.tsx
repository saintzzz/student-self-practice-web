export const Card = ({ q }) => <div>{q.prompt_text}{q.answer.bool ? 'T' : 'F'}</div>;
export async function act(supabase: any, id: string) {
  const { error: err } = await supabase.rpc('review_question', { p_question_id: id, p_action: 'approve' });
  if (err) return err;
  return 'removed';
}
export const load = useCallback(async () => {
  const { data } = await supabase
    .from('qb_review_queue')
    .select('question_id, priority')
    .eq('review_status', statusFilter)
    .order('question_id')
    .range(offset, offset + 19);
  setRows(data);
}, [statusFilter, offset]);
