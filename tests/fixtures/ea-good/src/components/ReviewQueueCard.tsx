export const Card = ({ q }) => <div>{q.prompt_text}{q.passage}{q.statement}{q.tokens}{q.explanation_vi}{q.choices}{q.answer.bool ?? q.answer.boolean}</div>;
