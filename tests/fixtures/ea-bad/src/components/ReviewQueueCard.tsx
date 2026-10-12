export const Card = ({ q }) => <div>{q.prompt_text}{q.answer.bool ? 'T' : 'F'}</div>;
