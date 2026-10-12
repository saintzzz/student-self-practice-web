const pick = a => a[Math.floor(Math.random() * a.length)];
const res = await fetch(`${SUPA}/rest/v1/qb_questions`, {
  method: 'POST',
  headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
  body: '{}',
});
const range = res.headers.get('content-range') ?? '';
inserted += Number(range.split('/')[1]) || rows.length;
console.log('pushed', res.status);
