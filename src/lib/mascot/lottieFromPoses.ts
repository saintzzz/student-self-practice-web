import { MASCOT_PALETTE } from '../ui/theme';
import {
  MASCOT_POSES,
  type EllipseShape,
  type MascotPoseName,
  type PathShape,
  type PoseGroup,
  type PoseShape,
  type PoseTrack,
  type TrackProp,
} from './poses';

/**
 * CR-82 (ARCHITECTURE D-08): pure bodymovin-Lottie builder. The SAME pose
 * geometry data in `poses.ts` becomes both the static SVG (MascotStaticPose)
 * and these Lottie assets - so frame 0 of every generated JSON equals the
 * SVG poster by construction. One shape group per named pose group becomes
 * one shape layer; tracks animate standard layer transforms only (rigid
 * group motion - no mesh morphs, per the D-08 ruling).
 *
 * Loop policy comes from the pose (spec s9.2): idle loops seamlessly,
 * thinking/greeting/encouraging play twice then hold, happy/celebrating are
 * one-shots that hold the last frame.
 */

const W = 512;
const H = 512;
const FR = 30;
const ARTBOARD_VERSION = '5.7.4';

function hexToLottie(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1];
}

type Json = Record<string, unknown>;

function staticProp(value: unknown): Json {
  return { a: 0, k: value };
}

function easeIn(dims: number): Json {
  return { x: Array(dims).fill(0.42), y: Array(dims).fill(1) };
}
function easeOut(dims: number): Json {
  return { x: Array(dims).fill(0.58), y: Array(dims).fill(0) };
}

function animatedProp(keys: [number, ...(number | number[])[]][], dims: number): Json {
  return {
    a: 1,
    k: keys.map(([t, ...vals], idx) => {
      const entry: Json = {
        t,
        s: dims === 1 ? [vals[0]] : vals.slice(0, dims),
      };
      /* The final keyframe still needs `s` (seamless loops return to the
         rest pose at `op`); easing applies only when a segment follows. */
      if (idx < keys.length - 1) {
        entry.i = easeIn(dims);
        entry.o = easeOut(dims);
      }
      return entry;
    }),
  };
}

/* Flatten per-group tracks into animated transform props. Values:
   tx/ty px offsets relative to the group anchor, sx/sy fractions,
   r degrees, o fraction (all keyed on [frame, value]). */
function tracksForGroup(groupName: string, tracks: PoseTrack[]): Map<TrackProp, [number, number][]> {
  const map = new Map<TrackProp, [number, number][]>();
  for (const t of tracks) {
    if (t.group === groupName) map.set(t.prop, t.keys);
  }
  return map;
}

function layerTransform(group: PoseGroup, tracks: Map<TrackProp, [number, number][]>): Json {
  const anchor = group.anchor ?? [0, 0];
  const tx = tracks.get('tx');
  const ty = tracks.get('ty');
  const sx = tracks.get('sx');
  const sy = tracks.get('sy');
  const r = tracks.get('r');
  const o = tracks.get('o');

  const position =
    tx || ty
      ? animatedProp(
          mergeKeys(tx, ty, 0).map(([t, x, y]) => [t, anchor[0] + x, anchor[1] + y]),
          2,
        )
      : staticProp(anchor);
  const scale =
    sx || sy
      ? animatedProp(
          mergeKeys(sx, sy, 1).map(([t, x, y]) => [t, x * 100, y * 100]),
          2,
        )
      : staticProp([100, 100]);

  return {
    o: o ? animatedProp(o.map(([t, v]) => [t, v * 100]), 1) : staticProp(100),
    r: r ? animatedProp(r, 1) : staticProp(0),
    p: position,
    a: staticProp(anchor),
    s: scale,
  };
}

/* Align two tracks on the union of their frames; absent prop = rest value. */
function mergeKeys(
  a: [number, number][] | undefined,
  b: [number, number][] | undefined,
  rest: number,
): [number, number, number][] {
  const frames = [...new Set([...(a ?? []), ...(b ?? [])].map(([t]) => t))].sort((x, y) => x - y);
  return frames.map((t) => [t, sample(a, t, rest), sample(b, t, rest)]);
}

function sample(keys: [number, number][] | undefined, t: number, fallback: number): number {
  if (!keys || keys.length === 0) return fallback;
  let v = keys[0][1];
  for (const [ft, fv] of keys) {
    if (ft > t) break;
    v = fv;
  }
  return v;
}

function ellipseItem(s: EllipseShape): Json {
  return {
    ty: 'el',
    p: staticProp([s.cx, s.cy]),
    s: staticProp([s.rx * 2, s.ry * 2]),
    nm: 'ellipse',
  };
}

function pathItem(s: PathShape): Json {
  return {
    ty: 'sh',
    ks: staticProp({
      c: s.closed,
      v: s.v,
      i: s.i,
      o: s.o,
    }),
    nm: 'path',
  };
}

function shapeItems(shape: PoseShape): Json[] {
  const items: Json[] = [shape.kind === 'ellipse' ? ellipseItem(shape) : pathItem(shape)];
  if (shape.fill && shape.fill !== 'none') {
    items.push({
      ty: 'fl',
      c: staticProp(hexToLottie(MASCOT_PALETTE[shape.fill])),
      o: staticProp((shape.opacity ?? 1) * 100),
      nm: 'fill',
    });
  }
  if (shape.stroke) {
    items.push({
      ty: 'st',
      c: staticProp(hexToLottie(MASCOT_PALETTE[shape.stroke])),
      o: staticProp((shape.opacity ?? 1) * 100),
      w: staticProp(shape.strokeWidth ?? 1),
      lc: shape.linecap === 'round' ? 2 : 1,
      lj: 2,
      nm: 'stroke',
    });
  }
  items.push({
    ty: 'tr',
    p: staticProp([0, 0]),
    a: staticProp([0, 0]),
    s: staticProp([100, 100]),
    r: staticProp(0),
    o: staticProp(100),
  });
  return items;
}

function groupToLayer(
  group: PoseGroup,
  ind: number,
  rootInd: number,
  frames: number,
  tracks: Map<TrackProp, [number, number][]>,
): Json {
  return {
    ty: 4,
    nm: group.name,
    ind,
    parent: rootInd,
    ip: 0,
    op: frames,
    st: 0,
    sr: 1,
    ks: layerTransform(group, tracks),
    /* One `gr` per painted shape: bodymovin fills/strokes apply to ALL
       geometry preceding them in the same group, so a flat item list
       would repaint earlier paths with later shapes' paints (external
       review r34-B2). */
    shapes: group.shapes.map((shape, i) => ({
      ty: 'gr',
      nm: `${group.name}-shape-${i}`,
      it: shapeItems(shape),
    })),
  };
}

/** The motion's loop policy expressed for the runtime player. */
export function loopConfig(pose: MascotPoseName): { loop: boolean; loopCount: number } {
  const loop = MASCOT_POSES[pose].motion.loop;
  if (loop === 'loop') return { loop: true, loopCount: 0 };
  if (loop === 'twice') return { loop: true, loopCount: 1 };
  return { loop: false, loopCount: 0 };
}

/** Build the bodymovin JSON object for a pose (512x512, 30fps). */
export function buildLottieJson(pose: MascotPoseName): Json {
  const def = MASCOT_POSES[pose];
  const frames = def.motion.frames;

  const rootLayer: Json = {
    ty: 3,
    nm: 'root',
    ind: 1,
    ip: 0,
    op: frames,
    st: 0,
    sr: 1,
    ks: {
      o: staticProp(100),
      r: staticProp(0),
      p: staticProp([0, 0]),
      a: staticProp([0, 0]),
      s: staticProp([100, 100]),
    },
  };

  const layers = [
    rootLayer,
    ...def.groups.map((g, i) =>
      groupToLayer(g, i + 2, 1, frames, tracksForGroup(g.name, def.motion.tracks)),
    ),
  ];

  return {
    v: ARTBOARD_VERSION,
    fr: FR,
    ip: 0,
    op: frames,
    w: W,
    h: H,
    nm: `be-heo-${pose}`,
    ddd: 0,
    assets: [],
    layers,
    meta: { g: 'cr-82 gen-mascot-lottie (poses.ts)' },
  };
}

export { MASCOT_POSES };
