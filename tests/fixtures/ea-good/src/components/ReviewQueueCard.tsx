export const Card = ({ q }) => <div>{q.prompt_text}{q.passage}{q.statement}{q.tokens}{q.explanation_vi}{q.choices}{q.answer.bool ?? q.answer.boolean}</div>;
export async function act(supabase: any, id: string) {
  const { data, error: err } = await supabase.rpc('review_question', { p_question_id: id, p_action: 'approve' });
  if (err) return err;
  if (data?.stale) return reload();
  if (data && data.ok === false) return 'denied';
  return 'removed';
}
