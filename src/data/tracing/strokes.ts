/**
 * CR-82 (DESIGN-SPEC-v5 s12.2, ARCHITECTURE-v5 D-02): stroke data for the
 * 26 lowercase letters, authored against Andika's single-story forms
 * (single-story a/g - OM-2). Each glyph is an ordered array of strokes;
 * every stroke is a polyline in a 0-100 box:
 *
 *   ascender line  y = 10
 *   x-height line  y = 45
 *   baseline       y = 80
 *   descender      y ~= 95
 *
 * The guide layer is drawn FROM this data (not from the font), so tracing
 * correctness never depends on the Andika webfont loading (spec s5.4 F-3
 * note). `i`/`j` dots are degenerate two-point strokes - the scorer's
 * distance-based coverage treats a tap near the dot as a valid trace.
 */

export type TracingStrokePoint = readonly [number, number];

export interface GlyphStrokes {
  letter: string;
  strokes: ReadonlyArray<ReadonlyArray<TracingStrokePoint>>;
}

/** Vertical stem helper shared by several glyphs. */
function stem(x: number, top: number, bottom: number): TracingStrokePoint[] {
  return [
    [x, top],
    [x, bottom],
  ];
}

/**
 * Single-story bowl (the round part of a/d/g/o/q), counterclockwise
 * starting at the top - matching the taught stroke direction.
 */
function bowl(cx: number, rx = 19): TracingStrokePoint[] {
  const top = 45;
  const bottom = 80;
  const cy = (top + bottom) / 2;
  return [
    [cx, top],
    [cx - rx * 0.7, top + 3],
    [cx - rx, cy],
    [cx - rx * 0.7, bottom - 3],
    [cx, bottom],
    [cx + rx * 0.7, bottom - 3],
    [cx + rx, cy],
    [cx + rx * 0.7, top + 3],
    [cx, top],
  ];
}

export const GLYPH_STROKES: Record<string, GlyphStrokes> = {
  /* Single-story a: bowl + straight stem on the right (Andika form). */
  a: { letter: 'a', strokes: [bowl(45), [[62, 45], [62, 78], [66, 80]]] },
  b: {
    letter: 'b',
    strokes: [
      stem(32, 10, 80),
      [[32, 52], [44, 45], [60, 48], [66, 62], [60, 76], [44, 80], [32, 74]],
    ],
  },
  c: {
    letter: 'c',
    strokes: [
      [[62, 50], [52, 45], [36, 48], [28, 62], [34, 76], [50, 80], [62, 74]],
    ],
  },
  d: {
    letter: 'd',
    strokes: [
      bowl(48),
      /* Tall stem on the right, down to the baseline. */
      [[67, 10], [67, 78], [71, 80]],
    ],
  },
  e: {
    letter: 'e',
    strokes: [
      [[30, 62], [64, 62], [63, 50], [50, 45], [34, 49], [28, 62], [34, 76], [50, 80], [62, 74]],
    ],
  },
  f: {
    letter: 'f',
    strokes: [
      [[56, 16], [50, 10], [40, 12], [36, 20], [36, 78], [40, 80]],
      [[28, 45], [48, 45]],
    ],
  },
  /* Single-story g: bowl + stem descending into a left-hook (Andika form). */
  g: {
    letter: 'g',
    strokes: [
      bowl(45),
      [[62, 45], [62, 86], [56, 94], [42, 94]],
    ],
  },
  h: {
    letter: 'h',
    strokes: [
      stem(32, 10, 80),
      [[32, 56], [40, 46], [56, 45], [62, 55], [62, 80]],
    ],
  },
  i: {
    letter: 'i',
    strokes: [
      [[50, 45], [50, 80]],
      [[50, 30], [50, 32]],
    ],
  },
  j: {
    letter: 'j',
    strokes: [
      [[56, 45], [56, 88], [50, 95], [38, 92]],
      [[56, 30], [56, 32]],
    ],
  },
  k: {
    letter: 'k',
    strokes: [
      stem(32, 10, 80),
      [[62, 45], [36, 60]],
      [[42, 57], [64, 80]],
    ],
  },
  l: {
    letter: 'l',
    strokes: [
      [[50, 10], [50, 76], [54, 80]],
    ],
  },
  m: {
    letter: 'm',
    strokes: [
      [[28, 45], [28, 80]],
      /* First hump up over, down its own stem. */
      [[28, 56], [36, 46], [44, 45], [50, 55], [50, 80]],
      /* Second hump. */
      [[50, 56], [58, 46], [66, 45], [72, 55], [72, 80]],
    ],
  },
  n: {
    letter: 'n',
    strokes: [
      [[30, 45], [30, 80]],
      [[30, 56], [40, 46], [56, 45], [62, 55], [62, 80]],
    ],
  },
  o: {
    letter: 'o',
    strokes: [bowl(50)],
  },
  p: {
    letter: 'p',
    strokes: [
      [[30, 45], [30, 95]],
      [[30, 52], [44, 45], [60, 48], [66, 61], [60, 75], [44, 80], [30, 74]],
    ],
  },
  q: {
    letter: 'q',
    strokes: [
      bowl(46),
      [[66, 45], [66, 93], [72, 95]],
    ],
  },
  r: {
    letter: 'r',
    strokes: [
      [[32, 45], [32, 80]],
      [[32, 56], [40, 46], [56, 45]],
    ],
  },
  s: {
    letter: 's',
    strokes: [
      [[62, 50], [52, 45], [38, 47], [34, 56], [44, 62], [58, 66], [62, 72], [54, 79], [38, 80], [30, 75]],
    ],
  },
  t: {
    letter: 't',
    strokes: [
      [[45, 20], [45, 74], [50, 80], [58, 78]],
      [[34, 45], [58, 45]],
    ],
  },
  u: {
    letter: 'u',
    strokes: [
      [[32, 45], [32, 70], [40, 80], [54, 80], [62, 68], [62, 45], [62, 80]],
    ],
  },
  v: {
    letter: 'v',
    strokes: [
      [[32, 45], [48, 80], [64, 45]],
    ],
  },
  w: {
    letter: 'w',
    strokes: [
      [[28, 45], [38, 80], [50, 60], [62, 80], [72, 45]],
    ],
  },
  x: {
    letter: 'x',
    strokes: [
      [[34, 45], [64, 80]],
      [[64, 45], [34, 80]],
    ],
  },
  y: {
    letter: 'y',
    strokes: [
      [[32, 45], [48, 78]],
      [[64, 45], [40, 95]],
    ],
  },
  z: {
    letter: 'z',
    strokes: [
      [[32, 45], [64, 45], [32, 80], [66, 80]],
    ],
  },
};

/** The 26 lowercase letters in alphabet order (D-02 scope). */
export const TRACEABLE_LETTERS: readonly string[] = Object.keys(GLYPH_STROKES);
