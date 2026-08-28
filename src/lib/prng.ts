/**
 * Deterministic (seeded) helpers used by the question generators. Real
 * Math.random() would make the generated pool non-reproducible and the unit
 * tests flaky; hashing a string seed keeps every generated instance stable
 * across runs while still varying content across words/counts/positions.
 */
export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Fisher-Yates shuffle of [0..n-1], seeded so the result is reproducible. */
export function seededShuffleIndices(n: number, seed: string): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = hashString(`${seed}-${i}`) % (i + 1);
    const temp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = temp;
  }
  return indices;
}

/**
 * Picks `n` items out of `items` via a seeded shuffle - deterministic per
 * seed, no repeats unless `n` exceeds `items.length` (in which case every
 * item is returned once). Used to sample a Round's ~10 questions out of a
 * much larger generated pool (see src/lib/rounds/*).
 */
export function seededPickN<T>(items: readonly T[], n: number, seed: string): T[] {
  if (items.length <= n) {
    return [...items];
  }
  const order = seededShuffleIndices(items.length, seed);
  return order.slice(0, n).map((i) => items[i]!);
}

/**
 * Picks `count` distinct items from `items` (excluding any whose key is in
 * `excludeKeys`), deterministically based on `seed`. Falls back to filling
 * from any remaining unused candidates if hash collisions under-fill.
 */
export function pickDistinct<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  excludeKeys: readonly string[],
  count: number,
  seed: string,
): T[] {
  const candidates = items.filter((item) => !excludeKeys.includes(keyOf(item)));
  const result: T[] = [];
  const usedKeys = new Set<string>();

  let attempt = 0;
  while (result.length < count && attempt < candidates.length * 2 && candidates.length > 0) {
    const idx = (hashString(`${seed}-${attempt}`) + attempt) % candidates.length;
    const candidate = candidates[idx]!;
    if (!usedKeys.has(keyOf(candidate))) {
      result.push(candidate);
      usedKeys.add(keyOf(candidate));
    }
    attempt++;
  }

  for (const candidate of candidates) {
    if (result.length >= count) break;
    if (!usedKeys.has(keyOf(candidate))) {
      result.push(candidate);
      usedKeys.add(keyOf(candidate));
    }
  }

  return result;
}
