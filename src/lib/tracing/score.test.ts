import { describe, expect, it } from 'vitest';
import { GLYPH_STROKES } from '../../data/tracing/strokes';
import {
  evaluateStroke,
  isWithinStartTolerance,
  resample,
  TRACING_TUNABLES,
} from './score';

/** Densify a guide polyline into ~80 sampled points for a "good trace". */
function traceAlong(stroke: readonly (readonly [number, number])[], count = 80): [number, number][] {
  return resample(stroke, count) as [number, number][];
}

describe('resample', () => {
  it('returns endpoints and even arc-length spacing', () => {
    const line: [number, number][] = [[0, 0], [100, 0]];
    const pts = resample(line, 5);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[4]).toEqual([100, 0]);
    expect(pts[2]![0]).toBeCloseTo(50, 5);
  });

  it('handles a degenerate single point', () => {
    const pts = resample([[50, 30]], 8);
    expect(pts).toHaveLength(8);
    for (const p of pts) expect(p).toEqual([50, 30]);
  });
});

describe('isWithinStartTolerance', () => {
  const guide = GLYPH_STROKES['c']!.strokes[0]!;
  const start = guide[0]!;

  it('accepts a tap on the start dot (G1 18% radius)', () => {
    expect(isWithinStartTolerance([start[0] + 10, start[1] + 10], guide, 1)).toBe(true);
  });

  it('rejects a tap far from the start dot', () => {
    expect(isWithinStartTolerance([10, 10], guide, 1)).toBe(false);
  });

  it('G2 tolerance is tighter than G1', () => {
    const p: [number, number] = [start[0] + 15, start[1]];
    expect(isWithinStartTolerance(p, guide, 1)).toBe(true);
    expect(isWithinStartTolerance(p, guide, 2)).toBe(false);
    expect(TRACING_TUNABLES[2].startTolerance).toBeLessThan(TRACING_TUNABLES[1].startTolerance);
  });
});

describe('evaluateStroke', () => {
  const cGuide = GLYPH_STROKES['c']!.strokes[0]!;

  it('passes a faithful trace (G1)', () => {
    const r = evaluateStroke(cGuide, traceAlong(cGuide), 1);
    expect(r.pass).toBe(true);
    expect(r.coverage).toBeGreaterThanOrEqual(0.75);
    expect(r.precision).toBeGreaterThanOrEqual(0.65);
  });

  it('passes a faithful trace (G2)', () => {
    const r = evaluateStroke(cGuide, traceAlong(cGuide), 2);
    expect(r.pass).toBe(true);
    expect(r.directionOk).toBe(true);
  });

  it('fails a far off-path scribble on coverage', () => {
    const off: [number, number][] = [[5, 5], [10, 8], [6, 12], [95, 95]];
    const r = evaluateStroke(cGuide, off, 1);
    expect(r.pass).toBe(false);
    expect(r.coverage).toBeLessThan(0.75);
  });

  it('fails a partial trace on coverage', () => {
    const half = cGuide.slice(0, Math.ceil(cGuide.length / 2));
    const drawn = traceAlong(half);
    const r = evaluateStroke(cGuide, drawn, 1);
    expect(r.coverage).toBeLessThan(0.75);
    expect(r.pass).toBe(false);
  });

  it('reversed direction passes G1 but fails G2', () => {
    const drawn = traceAlong(cGuide).reverse();
    const g1 = evaluateStroke(cGuide, drawn, 1);
    const g2 = evaluateStroke(cGuide, drawn, 2);
    expect(g1.directionOk).toBe(true);
    expect(g1.pass).toBe(true);
    expect(g2.directionOk).toBe(false);
    expect(g2.pass).toBe(false);
  });

  it('assisted widens the tolerance band (x1.5)', () => {
    // Offset the guide by just inside the assisted band but outside the
    // normal band: shift every point ~1.2 x coverageTolerance.
    const shifted = cGuide.map(([x, y]) => [x + TRACING_TUNABLES[2].coverageTolerance * 1.2, y] as [number, number]);
    const drawn = traceAlong(shifted);
    const strict = evaluateStroke(cGuide, drawn, 2);
    const assisted = evaluateStroke(cGuide, drawn, 2, { assisted: true });
    expect(assisted.coverage).toBeGreaterThan(strict.coverage);
    expect(assisted.pass).toBe(true);
    expect(strict.pass).toBe(false);
  });

  it('a two-point tap on a dot stroke (i) counts as a trace', () => {
    const dot = GLYPH_STROKES['i']!.strokes[1]!;
    const r = evaluateStroke(dot, [[50, 30], [50, 32]], 1);
    expect(r.pass).toBe(true);
  });

  it('rejects empty and single-point draws', () => {
    expect(evaluateStroke(cGuide, [], 1).pass).toBe(false);
    expect(evaluateStroke(cGuide, [[50, 62]], 1).pass).toBe(false);
  });

  it('every lowercase glyph guide is traceable by its own resample', () => {
    for (const glyph of Object.values(GLYPH_STROKES)) {
      for (const stroke of glyph.strokes) {
        const r = evaluateStroke(stroke, traceAlong(stroke), 2);
        expect(r.pass, `letter "${glyph.letter}" stroke self-trace`).toBe(true);
      }
    }
  });
});
