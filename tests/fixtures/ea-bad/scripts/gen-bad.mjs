const pick = a => a[Math.floor(Math.random() * a.length)];
const res = await fetch(`${SUPA}/rest/v1/qb_questions`, {
  method: 'POST',
  headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
  body: '{}',
});
const range = res.headers.get('content-range') ?? '';
inserted += Number(range.split('/')[1]) || rows.length;
console.log('pushed', res.status);
// r15 bad: reorder items emitted with no tile-vs-answer proof - a
// missing tile ships an unsolvable question.
const it = { ro: true, tokens: ['My', 'my', 'dog'], text: 'My dog' };
const questionType = it.ro ? 'reorder' : 'mcq';
console.log(questionType, it.tokens);
