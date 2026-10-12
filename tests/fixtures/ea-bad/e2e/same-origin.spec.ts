test('same origin', () => {
  const origin = new URL(page.url()).origin;
  const thirdParty = seen.filter((u) => u.startsWith('http') && !u.startsWith(origin));
  expect(thirdParty).toEqual([]);
});
