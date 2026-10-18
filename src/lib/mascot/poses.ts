import { MASCOT_PALETTE } from '../ui/theme';

/**
 * CR-82 (DESIGN-SPEC-v5 s9, ARCHITECTURE D-08): Bé Heo's half-body bust as
 * DATA. Every pose is authored once here - named shape groups on a 512x512
 * artboard using palette KEYS only. `MascotStaticPose` renders this to SVG
 * as the always-available fallback beneath the generated webp art.
 *
 * Art layout (512x512, half-body bust per spec s9.2): shoulders at the
 * bottom edge, head above, two hooves - the perch poses rest the hooves on
 * the board rim. All numbers are hand-authored; paths carry Lottie-style
 * in/out tangent vectors (relative to their vertex) which the SVG renderer
 * serializes to `d` and the Lottie builder serializes to `sh`.
 */

export type MascotPoseName =
  | 'idle'
  | 'thinking'
  | 'greeting'
  | 'happy'
  | 'celebrating'
  | 'encouraging';

export type MascotPaletteKey = keyof typeof MASCOT_PALETTE;

interface ShapePaint {
  /** Fill palette key; omit/`none` for stroke-only shapes. */
  fill?: MascotPaletteKey | 'none';
  stroke?: MascotPaletteKey;
  strokeWidth?: number;
  opacity?: number;
  linecap?: 'round' | 'butt';
}

export interface EllipseShape extends ShapePaint {
  kind: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface PathShape extends ShapePaint {
  kind: 'path';
  /** Vertices [x,y] in artboard space. */
  v: [number, number][];
  /** In-tangent per vertex (relative). */
  i: [number, number][];
  /** Out-tangent per vertex (relative). */
  o: [number, number][];
  closed: boolean;
}

export type PoseShape = EllipseShape | PathShape;

export interface PoseGroup {
  /** Layer name - the Lottie generator animates tracks against these. */
  name: string;
  /** Transform pivot (rotation/scale anchor); defaults to [0,0]. */
  anchor?: [number, number];
  shapes: PoseShape[];
}

export type TrackProp = 'tx' | 'ty' | 'sx' | 'sy' | 'r' | 'o';

export interface PoseTrack {
  group: string;
  prop: TrackProp;
  /** Keyframes [frame, value]. Frame 0 values MUST equal the static pose. */
  keys: [frame: number, value: number][];
}

export interface PoseMotion {
  /** Frames at 30fps. */
  frames: number;
  /** 'loop' = seamless; 'twice' = 2 plays then hold; 'once' = one-shot hold. */
  loop: 'loop' | 'twice' | 'once';
  tracks: PoseTrack[];
}

export interface MascotPose {
  groups: PoseGroup[];
  motion: PoseMotion;
}

/* ---------------- shape helpers ---------------- */

function E(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  paint: ShapePaint = {},
): EllipseShape {
  return { kind: 'ellipse', cx, cy, rx, ry, ...paint };
}

function P(
  v: [number, number][],
  i: [number, number][],
  o: [number, number][],
  closed: boolean,
  paint: ShapePaint = {},
): PathShape {
  return { kind: 'path', v, i, o, closed, ...paint };
}

const OUTLINE_W = 10;
const STROKE = { stroke: 'outline' as MascotPaletteKey, strokeWidth: OUTLINE_W, linejoin: 'round' as const };

/* ---------------- shared body parts ---------------- */

const OUTER_EARS: PoseShape[] = [
  // left ear - rounded triangle
  P(
    [[152, 168], [126, 56], [224, 108]],
    [[-20, 10], [14, -6], [-28, 18]],
    [[20, -10], [34, 26], [-14, 16]],
    true,
    { fill: 'skin', ...STROKE },
  ),
  // right ear
  P(
    [[360, 168], [386, 56], [288, 108]],
    [[20, 10], [-14, -6], [28, 18]],
    [[-20, -10], [-34, 26], [14, 16]],
    true,
    { fill: 'skin', ...STROKE },
  ),
  // inner ear strokes
  P([[160, 140], [150, 80], [198, 104]], [[0, 0], [10, -8], [0, 0]], [[0, 0], [18, 24], [0, 0]], false, {
    stroke: 'ear',
    strokeWidth: 12,
    linecap: 'round',
    fill: 'none',
  }),
  P([[352, 140], [362, 80], [314, 104]], [[0, 0], [-10, -8], [0, 0]], [[0, 0], [-18, 24], [0, 0]], false, {
    stroke: 'ear',
    strokeWidth: 12,
    linecap: 'round',
    fill: 'none',
  }),
];

const HEAD_SHAPES: PoseShape[] = [
  ...OUTER_EARS,
  E(256, 240, 140, 140, { fill: 'skin', ...STROKE }),
  // top-left sheen arc
  P([[148, 196], [206, 134]], [[0, 0], [30, 10]], [[-10, -34], [0, 0]], false, {
    stroke: 'sheen',
    strokeWidth: 14,
    linecap: 'round',
    fill: 'none',
    opacity: 0.9,
  }),
];

const SNOUT_SHAPES: PoseShape[] = [
  E(256, 288, 58, 42, { fill: 'snout', ...STROKE }),
  E(236, 288, 8, 13, { fill: 'nostril' }),
  E(276, 288, 8, 13, { fill: 'nostril' }),
];

const BLUSH_SHAPES: PoseShape[] = [
  E(160, 296, 26, 15, { fill: 'blush', opacity: 0.5 }),
  E(352, 296, 26, 15, { fill: 'blush', opacity: 0.5 }),
];

function eyesOpen(offset: [number, number] = [0, 0]): PoseShape[] {
  const [dx, dy] = offset;
  return [
    E(205 + dx, 224 + dy, 15, 15, { fill: 'outline' }),
    E(307 + dx, 224 + dy, 15, 15, { fill: 'outline' }),
    E(210 + dx, 218 + dy, 5, 5, { fill: 'white' }),
    E(312 + dx, 218 + dy, 5, 5, { fill: 'white' }),
  ];
}

function eyesClosedHappy(): PoseShape[] {
  // ∩ arcs
  return [
    P([[185, 228], [225, 228]], [[0, 0], [-10, -15]], [[10, -15], [0, 0]], false, {
      stroke: 'outline',
      strokeWidth: 11,
      linecap: 'round',
      fill: 'none',
    }),
    P([[287, 228], [327, 228]], [[0, 0], [-10, -15]], [[10, -15], [0, 0]], false, {
      stroke: 'outline',
      strokeWidth: 11,
      linecap: 'round',
      fill: 'none',
    }),
  ];
}

function softBrows(): PoseShape[] {
  return [
    P([[178, 198], [220, 190]], [[0, 0], [-8, 4]], [[10, -8], [0, 0]], false, {
      stroke: 'outline',
      strokeWidth: 8,
      linecap: 'round',
      fill: 'none',
    }),
    P([[292, 190], [334, 198]], [[0, 0], [-10, -8]], [[8, 4], [0, 0]], false, {
      stroke: 'outline',
      strokeWidth: 8,
      linecap: 'round',
      fill: 'none',
    }),
  ];
}

function mouthSmile(span: number): PoseShape {
  const half = span / 2;
  return P(
    [[256 - half, 344], [256 + half, 344]],
    [[0, 0], [-15, 17]],
    [[15, 17], [0, 0]],
    false,
    { stroke: 'outline', strokeWidth: 10, linecap: 'round', fill: 'none' },
  );
}

function mouthOpen(): PoseShape[] {
  return [
    P(
      [[226, 340], [286, 340]],
      [[0, 0], [-15, 40]],
      [[15, 40], [0, 0]],
      true,
      { fill: 'mouth', ...STROKE },
    ),
    E(256, 374, 16, 10, { fill: 'tongue' }),
  ];
}

/* Hoof resting on the board rim - ellipse, optionally raised/rotated. */
function hoof(cx: number, cy: number, rx = 42, ry = 26): EllipseShape {
  return E(cx, cy, rx, ry, { fill: 'skin', ...STROKE });
}

const SHOULDERS: PoseShape[] = [E(256, 452, 160, 80, { fill: 'skin', ...STROKE })];

/* ---------------- pose assembly ---------------- */

function assemble(overrides: {
  eyes?: PoseShape[];
  mouth?: PoseShape[];
  hoofL?: PoseGroup;
  hoofR?: PoseGroup;
  extra?: PoseGroup[];
}): PoseGroup[] {
  const groups: PoseGroup[] = [
    { name: 'body', anchor: [256, 500], shapes: SHOULDERS },
    { name: 'head', anchor: [256, 380], shapes: HEAD_SHAPES },
    { name: 'blush', shapes: BLUSH_SHAPES },
    { name: 'eyes', anchor: [256, 220], shapes: overrides.eyes ?? eyesOpen() },
    { name: 'brows', shapes: [] },
    { name: 'snout', shapes: SNOUT_SHAPES },
    { name: 'mouth', shapes: overrides.mouth ?? [mouthSmile(72)] },
    overrides.hoofL ?? { name: 'hoofL', shapes: [hoof(180, 476)] },
    overrides.hoofR ?? { name: 'hoofR', shapes: [hoof(332, 476)] },
    ...(overrides.extra ?? []),
  ];
  /* Empty-shape groups render nothing but keep layer naming stable. */
  return groups.filter((g) => g.shapes.length > 0);
}

const CONFETTI_GROUP: PoseGroup = {
  name: 'confetti',
  anchor: [256, 120],
  shapes: [
    P([[66, 58], [74, 82]], [[0, 0], [0, 0]], [[0, 0], [0, 0]], false, {
      stroke: 'confettiGold',
      strokeWidth: 10,
      linecap: 'round',
      fill: 'none',
    }),
    P([[440, 46], [452, 70]], [[0, 0], [0, 0]], [[0, 0], [0, 0]], false, {
      stroke: 'confettiEmerald',
      strokeWidth: 10,
      linecap: 'round',
      fill: 'none',
    }),
    P([[470, 116], [480, 140]], [[0, 0], [0, 0]], [[0, 0], [0, 0]], false, {
      stroke: 'confettiPink',
      strokeWidth: 10,
      linecap: 'round',
      fill: 'none',
    }),
    E(36, 158, 9, 9, { fill: 'confettiSky' }),
    E(486, 168, 9, 9, { fill: 'confettiGold' }),
    E(96, 26, 8, 8, { fill: 'confettiPink' }),
  ],
};

const THINK_BUBBLE: PoseGroup = {
  name: 'bubble',
  shapes: [
    E(346, 132, 10, 10, { fill: 'white', stroke: 'outline', strokeWidth: 6 }),
    E(374, 96, 14, 14, { fill: 'white', stroke: 'outline', strokeWidth: 6 }),
    E(406, 56, 19, 19, { fill: 'white', stroke: 'outline', strokeWidth: 6 }),
  ],
};

const WAVE_ARM: PoseGroup = {
  name: 'hoofR',
  anchor: [336, 400],
  shapes: [
    // arm - thick skin stroke rising to the raised hoof
    P([[330, 392], [392, 216]], [[0, 0], [-2, -52]], [[42, -46], [0, 0]], false, {
      stroke: 'skin',
      strokeWidth: 46,
      linecap: 'round',
      fill: 'none',
    }),
    hoof(400, 196, 44, 28),
  ],
};

/* ---------------- the six poses ---------------- */

export const MASCOT_POSES: Record<MascotPoseName, MascotPose> = {
  idle: {
    groups: assemble({}),
    motion: {
      frames: 96, // 3.2s seamless
      loop: 'loop',
      tracks: [
        // breathe: shoulders/head settle 1 -> 1.015 -> 1
        { group: 'body', prop: 'sy', keys: [[0, 1], [48, 1.025], [96, 1]] },
        { group: 'head', prop: 'ty', keys: [[0, 0], [48, 4], [96, 0]] },
        // blink at frame ~70
        { group: 'eyes', prop: 'sy', keys: [[66, 1], [70, 0.12], [74, 1], [96, 1]] },
      ],
    },
  },

  thinking: {
    groups: assemble({
      eyes: eyesOpen([-12, -10]),
      hoofR: { name: 'hoofR', shapes: [hoof(300, 348, 38, 24)] },
      extra: [THINK_BUBBLE],
    }),
    motion: {
      frames: 54, // 1.8s, plays twice then holds
      loop: 'twice',
      tracks: [
        // dot wave - sequential dim/bright keeps frame-0 parity
        { group: 'bubble', prop: 'o', keys: [[0, 1], [10, 0.55], [20, 1], [54, 1]] },
        { group: 'head', prop: 'ty', keys: [[0, 0], [27, 3], [54, 0]] },
      ],
    },
  },

  greeting: {
    groups: assemble({ hoofR: WAVE_ARM }),
    motion: {
      frames: 54, // 1.8s, plays twice then holds
      loop: 'twice',
      tracks: [
        // starts and ends at rest so frame 0 (and the held last frame)
        // equals the static pose - spec s9.5 frame-0 parity.
        { group: 'hoofR', prop: 'r', keys: [[0, 0], [7, -8], [20, 14], [33, -8], [46, 14], [54, 0]] },
      ],
    },
  },

  happy: {
    groups: assemble({
      eyes: eyesClosedHappy(),
      mouth: [mouthSmile(84)],
      hoofL: { name: 'hoofL', shapes: [hoof(150, 372, 40, 24)] },
      hoofR: { name: 'hoofR', shapes: [hoof(362, 372, 40, 24)] },
    }),
    motion: {
      frames: 18, // 0.6s one-shot, hold last frame
      loop: 'once',
      tracks: [
        { group: 'body', prop: 'ty', keys: [[0, 0], [8, -12], [18, 0]] },
        { group: 'head', prop: 'ty', keys: [[0, 0], [8, -12], [18, 0]] },
        { group: 'eyes', prop: 'ty', keys: [[0, 0], [8, -12], [18, 0]] },
        { group: 'snout', prop: 'ty', keys: [[0, 0], [8, -12], [18, 0]] },
        { group: 'mouth', prop: 'ty', keys: [[0, 0], [8, -12], [18, 0]] },
        { group: 'blush', prop: 'ty', keys: [[0, 0], [8, -12], [18, 0]] },
      ],
    },
  },

  celebrating: {
    groups: assemble({
      eyes: eyesClosedHappy(),
      mouth: mouthOpen(),
      hoofL: { name: 'hoofL', shapes: [hoof(140, 310, 40, 24)] },
      hoofR: { name: 'hoofR', shapes: [hoof(372, 310, 40, 24)] },
      extra: [CONFETTI_GROUP],
    }),
    motion: {
      frames: 36, // 1.2s one-shot, hold last frame
      loop: 'once',
      tracks: [
        { group: 'body', prop: 'ty', keys: [[0, 0], [12, -18], [24, 0], [36, 0]] },
        { group: 'confetti', prop: 'sy', keys: [[0, 1], [10, 1.12], [20, 1], [36, 1]] },
      ],
    },
  },

  encouraging: {
    groups: assemble({
      eyes: eyesOpen(),
      mouth: [mouthSmile(72)],
      extra: [{ name: 'brows', shapes: softBrows() }],
      hoofR: { name: 'hoofR', anchor: [350, 460], shapes: [hoof(352, 392, 38, 24)] },
    }),
    motion: {
      frames: 72, // 2.4s, plays twice then holds
      loop: 'twice',
      tracks: [
        // fist pump x2
        { group: 'hoofR', prop: 'ty', keys: [[0, 0], [10, -26], [20, 0], [36, 0], [46, -26], [56, 0], [72, 0]] },
      ],
    },
  },
};

/**
 * Serialize a PathShape's vertex+tangent data to an SVG `d` string -
 * shared by the static renderer so it never re-derives geometry.
 */
export function pathToD(shape: PathShape): string {
  const { v, i, o, closed } = shape;
  let d = `M${v[0][0]} ${v[0][1]}`;
  for (let s = 0; s < v.length - 1; s += 1) {
    const c1x = v[s][0] + o[s][0];
    const c1y = v[s][1] + o[s][1];
    const c2x = v[s + 1][0] + i[s + 1][0];
    const c2y = v[s + 1][1] + i[s + 1][1];
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${v[s + 1][0]} ${v[s + 1][1]}`;
  }
  if (closed) {
    const last = v[v.length - 1];
    const c1x = last[0] + o[v.length - 1][0];
    const c1y = last[1] + o[v.length - 1][1];
    const c2x = v[0][0] + i[0][0];
    const c2y = v[0][1] + i[0][1];
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${v[0][0]} ${v[0][1]} Z`;
  }
  return d;
}

/** Resolve a palette key to its hex - the only color lookup for poses. */
export function paletteHex(key: MascotPaletteKey): string {
  return MASCOT_PALETTE[key];
}
