import type { SceneTone } from '../../../lib/ui/theme';

/**
 * CR-82 (M2, DESIGN-SPEC-v5 s6.2/6.4): shared scene art primitives.
 * Every fill comes in as a palette value (prop) - NO hex literals in
 * components (FF-6). `lights` colors are never tone-mixed; `props` are.
 */

/** Setting/rising sun. `dusk` callers place it low near the horizon. */
export function Sun({ x, y, r = 42, c }: { x: number; y: number; r?: number; c: { ray: string; body: string; core: string } }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="-4"
          y={-r - 22}
          width="8"
          height="20"
          rx="4"
          fill={c.ray}
          transform={`rotate(${i * 45})`}
        />
      ))}
      <circle r={r} fill={c.body} />
      <circle r={r - 10} cx="-6" cy="-6" fill={c.core} opacity="0.7" />
    </g>
  );
}

/**
 * Night moon (new in v5): a light disc plus an offset `shadow` circle
 * that reads as a crescent. `shadow` is a tone-MIXED prop color so it
 * darkens with the sky; `body` is a light and stays bright.
 */
export function Moon({ x, y, r = 34, body, shadow }: { x: number; y: number; r?: number; body: string; shadow: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={body} />
      <circle r={r * 0.78} cx={r * 0.42} cy={-r * 0.22} fill={shadow} />
      <circle cx={-r * 0.28} cy={r * 0.2} r={r * 0.1} fill={body} opacity="0.5" />
      <circle cx={-r * 0.05} cy={r * 0.42} r={r * 0.07} fill={body} opacity="0.4" />
    </g>
  );
}

/** Sun-by-day / moon-by-night helper for the far layer. */
export function SunOrMoon({ x, y, tone, r, c }: {
  x: number; y: number; tone: SceneTone; r?: number;
  c: { ray: string; body: string; core: string; moonBody: string; moonShadow: string };
}) {
  if (tone === 'night') return <Moon x={x} y={y} r={r} body={c.moonBody} shadow={c.moonShadow} />;
  return <Sun x={x} y={y} r={r} c={c} />;
}

export function Cloud({ x, y, s = 1, o = 0.9, fill }: { x: number; y: number; s?: number; o?: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill={fill}>
      <ellipse cx="0" cy="0" rx="46" ry="22" />
      <ellipse cx="34" cy="6" rx="34" ry="17" />
      <ellipse cx="-36" cy="8" rx="30" ry="15" />
      <ellipse cx="6" cy="-14" rx="28" ry="16" />
    </g>
  );
}

/** Two rolling ground/hill paths. `colors` = palette.ground [far, near]. */
export function Hills({ colors }: { colors: [string, string] }) {
  return (
    <g>
      <path d="M0 320 L0 240 Q 200 170 420 235 Q 640 300 860 230 Q 1040 180 1200 250 L1200 320 Z" fill={colors[0]} />
      <path d="M0 320 L0 275 Q 260 220 540 270 Q 820 320 1200 265 L1200 320 Z" fill={colors[1]} />
    </g>
  );
}

/** CR-12: floating sparkle dots - dreamy ambience. `fill` stays bright
 *  at night (it lives in `lights`). */
export function AmbientSparkles({ fill }: { fill: string }) {
  const dots: Array<[number, number, number, number]> = [
    [90, 30, 3.2, 0],
    [260, 90, 2.2, 0.9],
    [430, 50, 3.0, 1.7],
    [620, 110, 2.4, 0.4],
    [780, 40, 3.4, 2.2],
    [950, 95, 2.2, 1.1],
    [1120, 60, 3.0, 2.8],
  ];
  return (
    <g>
      {dots.map(([cx, cy, r, delay], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill={fill}
          opacity={0.85}
          className="ambient-sparkle"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </g>
  );
}

/** Small two-part ground flower used by several lands. */
export function Flower({ x, y, petal, center }: { x: number; y: number; petal: string; center: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="7" fill={petal} />
      <circle cy="-7" r="4" fill={center} opacity="0.85" />
    </g>
  );
}
