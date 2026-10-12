function allowedOrigins(o: string): string[] {
  const origins = [o];
  const supa = process.env.VITE_SUPABASE_URL;
  if (supa) origins.push(new URL(supa).origin);
  return origins;
}
test('same origin', () => {
  const allowed = allowedOrigins(new URL(page.url()).origin);
  const thirdParty = seen.filter((u) => u.startsWith('http') && !allowed.some((o) => u.startsWith(o)));
  expect(thirdParty).toEqual([]);
});
