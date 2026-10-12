export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    return ((t ^ (t + Math.imul(t ^ (t >>> 7), 61 | t))) >>> 0) / 4294967296;
  };
}
