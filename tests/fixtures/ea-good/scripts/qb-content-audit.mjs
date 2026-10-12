const res = await fetch(`${process.env.SUPA_URL}/rest/v1/qb_questions?select=id`, {
  headers: {},
  signal: AbortSignal.timeout(15000),
});
console.log(await res.json());
