/**
 * CR-82 (DESIGN-SPEC-v5 s12.5): pure scoring for letter tracing. All
 * geometry lives in the same 0-100 unit box as `data/tracing/strokes.ts`,
 * so tolerances are percentages of the slate (G1 18/14, G2 12/10).
 *
 * Per stroke:
 *   coverage  = share of the 32 resampled guide points within `coverageTol`
 *               of the drawn polyline.
 *   precision = share of drawn points within `1.5 x coverageTol` of the
 *               guide polyline.
 *   direction = drawn start nearer the guide start than the guide end
 *               (G2 only - G1 never punishes stroke direction).
 *   pass      = coverage >= 0.75 AND precision >= 0.65 (+ direction G2).
 *
 * Tunables are exported for Tester calibration (spec Q9).
 */

import type { TracingStrokePoint } from '../../data/tracing/strokes';

export interface TracingTunables {
  /** Start-dot acceptance radius for pointerdown (% of box). */
  startTolerance: number;
  /** Distance band for coverage (% of box). */
  coverageTolerance: number;
  minCoverage: number;
  minPrecision: number;
  /** G2 checks drawing direction; G1 does not (spec s12.5). */
  checkDirection: boolean;
}

export const TRACING_TUNABLES: Record<1 | 2, TracingTunables> = {
  1: { startTolerance: 18, coverageTolerance: 14, minCoverage: 0.75, minPrecision: 0.65, checkDirection: false },
  2: { startTolerance: 12, coverageTolerance: 10, minCoverage: 0.75, minPrecision: 0.65, checkDirection: true },
};

/** After 2 fails on a stroke the tolerance band widens (spec s12.5 step 3). */
export const ASSISTED_TOLERANCE_SCALE = 1.5;

export const GUIDE_RESAMPLE_POINTS = 32;

type Pt = readonly [number, number];

function dist(a: Pt, b: Pt): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.hypot(dx, dy);
}

/** Distance from point `p` to the polyline `line` (segment-wise minimum). */
function distToPolyline(p: Pt, line: readonly Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i += 1) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const len2 = abx * abx + aby * aby;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2));
    const proj: Pt = [a[0] + abx * t, a[1] + aby * t];
    const d = dist(p, proj);
    if (d < best) best = d;
  }
  if (line.length === 1) best = dist(p, line[0]!);
  return best;
}

function polylineLength(line: readonly Pt[]): number {
  let total = 0;
  for (let i = 0; i < line.length - 1; i += 1) {
    total += dist(line[i]!, line[i + 1]!);
  }
  return total;
}

/**
 * Even arc-length resampling of a polyline to `count` points (endpoints
 * included). Degenerate (zero-length) input repeats its only point.
 */
export function resample(line: readonly Pt[], count: number = GUIDE_RESAMPLE_POINTS): Pt[] {
  if (line.length === 0 || count <= 0) return [];
  if (count === 1) return [line[0]!];
  const total = polylineLength(line);
  if (total === 0) return Array.from({ length: count }, () => line[0]!);

  const step = total / (count - 1);
  const out: Pt[] = [line[0]!];
  let walked = 0;
  let segIndex = 0;
  let segStart = line[0]!;
  let segEnd = line[1]!;
  let segLen = dist(segStart, segEnd);

  for (let i = 1; i < count - 1; i += 1) {
    const target = step * i;
    while (walked + segLen < target && segIndex < line.length - 2) {
      walked += segLen;
      segIndex += 1;
      segStart = line[segIndex]!;
      segEnd = line[segIndex + 1]!;
      segLen = dist(segStart, segEnd);
    }
    const t = segLen === 0 ? 0 : (target - walked) / segLen;
    out.push([segStart[0] + (segEnd[0] - segStart[0]) * t, segStart[1] + (segEnd[1] - segStart[1]) * t]);
  }
  out.push(line[line.length - 1]!);
  return out;
}

export interface StrokeEvaluation {
  pass: boolean;
  coverage: number;
  precision: number;
  /** Always true for G1 (direction not checked). */
  directionOk: boolean;
}

/** Is a pointerdown at `point` inside the active stroke's start tolerance? */
export function isWithinStartTolerance(
  point: Pt,
  guideStroke: readonly TracingStrokePoint[],
  grade: 1 | 2,
): boolean {
  if (guideStroke.length === 0) return false;
  return dist(point, guideStroke[0]!) <= TRACING_TUNABLES[grade].startTolerance;
}

/**
 * Evaluate one drawn polyline against a guide stroke. `assisted` widens
 * the coverage/precision tolerance band by ASSISTED_TOLERANCE_SCALE
 * (spec s12.5 step 3 - set after 2 fails on the same stroke).
 */
export function evaluateStroke(
  guideStroke: readonly TracingStrokePoint[],
  drawn: readonly Pt[],
  grade: 1 | 2,
  opts: { assisted?: boolean } = {},
): StrokeEvaluation {
  const tun = TRACING_TUNABLES[grade];
  const tol = tun.coverageTolerance * (opts.assisted ? ASSISTED_TOLERANCE_SCALE : 1);

  if (guideStroke.length === 0 || drawn.length < 2) {
    return { pass: false, coverage: 0, precision: 0, directionOk: true };
  }

  const guide = resample(guideStroke);
  let covered = 0;
  for (const gp of guide) {
    if (distToPolyline(gp, drawn) <= tol) covered += 1;
  }
  const coverage = covered / guide.length;

  let precise = 0;
  for (const dp of drawn) {
    if (distToPolyline(dp, guideStroke) <= tol * 1.5) precise += 1;
  }
  const precision = precise / drawn.length;

  const directionOk =
    !tun.checkDirection ||
    dist(drawn[0]!, guideStroke[0]!) <= dist(drawn[0]!, guideStroke[guideStroke.length - 1]!);

  const pass = coverage >= tun.minCoverage && precision >= tun.minPrecision && directionOk;
  return { pass, coverage, precision, directionOk };
}
