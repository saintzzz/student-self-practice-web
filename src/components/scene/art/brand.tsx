import { AmbientSparkles, Moon } from './shared';
import type { LandArtProps } from './sky';

/**
 * CR-82 (M2 + polish): 'brand' land art - the VieSchool "starlit journey"
 * night sky behind GradeSelect + AuthScreen hero shells.
 *
 * The map screen IS the journey metaphor, so the scene sells it: a
 * crescent moon over a dense star field, a gold dotted trail winding up
 * the silhouette hills to a glowing waypoint flag, fireflies in the
 * foreground. Ambience stays inside the <=12 budget (7 sparkles + 4
 * fireflies); every fill is a palette value (FF-6).
 *
 * Cropping note: hero layers render `xMidYMax slice`, so on narrow
 * viewports only the CENTER band of the 1200 viewBox is visible (roughly
 * x 515-685 on a phone). Hero elements - moon, flag, trail crest - live
 * inside that band; scenery spread continues toward the edges for wide
 * screens.
 */

/** Deterministic star field - fixed coords, no Math.random re-render noise. */
function StarField({ gold, white }: { gold: string; white: string }) {
  return (
    <g>
      {/* Uniform field across the upper sky, denser near center. */}
      {Array.from({ length: 52 }).map((_, i) => (
        <circle
          key={i}
          cx={(i * 167 + 23) % 1200}
          cy={(i * 89 + 13) % 205}
          r={0.7 + (i % 4) * 0.55}
          fill={i % 3 === 0 ? gold : white}
          opacity={0.3 + ((i * 37) % 55) / 100}
        />
      ))}
      {/* Milky-way band clustered along a soft diagonal through center. */}
      {Array.from({ length: 30 }).map((_, i) => {
        const t = i / 29;
        const cx = 180 + t * 840 + ((i * 53) % 46) - 23;
        const cy = 36 + t * 140 + ((i * 71) % 34) - 17;
        return (
          <circle
            key={`mw-${i}`}
            cx={cx}
            cy={cy}
            r={0.5 + (i % 3) * 0.4}
            fill={white}
            opacity={0.22 + ((i * 29) % 30) / 100}
          />
        );
      })}
      {/* Hero stars with cross rays - the ones that read at a glance.
          Two sit inside the phone-visible center band. */}
      {[
        [150, 55, 3.4],
        [560, 40, 3.2],
        [640, 108, 2.8],
        [1090, 170, 2.6],
      ].map(([cx, cy, r], i) => (
        <g key={`hero-${i}`} opacity={0.85}>
          <circle cx={cx} cy={cy} r={r} fill={gold} />
          <path
            d={`M ${cx - r * 3} ${cy} L ${cx + r * 3} ${cy} M ${cx} ${cy - r * 3} L ${cx} ${cy + r * 3}`}
            stroke={gold}
            strokeWidth={1}
            opacity={0.55}
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* One meteor streak - far right edge so it never crosses the
          header copy (desktop accent; cropped on phones). */}
      <path
        d="M 1120 22 L 1015 56"
        stroke={white}
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.35}
      />
      <circle cx={1120} cy={22} r={3} fill={white} opacity={0.65} />
    </g>
  );
}

export function Far({ p }: LandArtProps) {
  return (
    <g>
      <StarField gold={p.lights.goldStar} white={p.lights.starWhite} />
      {/* Moon sits left-of-center so phones keep it in frame. */}
      <Moon x={540} y={58} r={30} body={p.lights.moon} shadow={p.props.moonShadow} />
      <AmbientSparkles fill={p.lights.sparkle} />
    </g>
  );
}

export function Mid({ p }: LandArtProps) {
  return (
    <g>
      {/* Far ridge - lighter navy silhouette, cresting near center where
          the waypoint flag stands. */}
      <path d="M0 320 L0 262 Q 240 208 480 240 Q 640 258 780 236 Q 1000 205 1200 235 L1200 320 Z" fill={p.props.hillFar} />
      {/* Distant conifer silhouettes - center pair readable on phones,
          outer pair fills wide screens. */}
      {[
        [300, 232],
        [352, 240],
        [470, 236],
        [730, 240],
      ].map(([x, y], i) => (
        <path
          key={`tree-${i}`}
          d={`M ${x} ${y} l 9 -26 l 9 26 Z M ${x + 4} ${y - 18} l 5 -14 l 5 14 Z`}
          fill={p.props.tree}
          opacity={0.9}
        />
      ))}
      {/* Journey trail: a gold dotted path winding from the left edge up
          to the flag on the center crest. stroke-dasharray "0.1 14" +
          round caps renders dots, not dashes - the treasure-map motif. */}
      <path
        d="M -10 306 Q 140 292 260 296 Q 360 300 430 288 Q 520 270 560 254 Q 590 241 610 228 Q 622 218 630 208"
        fill="none"
        stroke={p.lights.trail}
        strokeWidth={5}
        strokeDasharray="0.1 14"
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* Waypoint flag on the crest the trail ends at (x ~630 - inside
          the phone-visible band). */}
      <g>
        <circle cx={630} cy={196} r={30} fill={p.lights.goldStar} opacity={0.16} />
        <circle cx={630} cy={196} r={17} fill={p.lights.goldStar} opacity={0.28} />
        <rect x={627} y={188} width={5} height={34} rx={2} fill={p.props.pole} />
        <path d="M 632 186 L 662 193 L 632 200 Z" fill={p.lights.pennant} />
        <path
          d="M 630 182 l 3.5 7.5 l 8 .8 l -6 5.6 l 1.7 8 l -7.2 -4.2 l -7.2 4.2 l 1.7 -8 l -6 -5.6 l 8 -.8 Z"
          fill={p.lights.starWhite}
          opacity={0.95}
        />
      </g>
      {/* Near ridge - darkest silhouette in front of the trail's foot. */}
      <path d="M0 320 L0 292 Q 300 258 600 288 Q 880 314 1200 276 L1200 320 Z" fill={p.props.hillNear} />
    </g>
  );
}

export function Near({ p }: LandArtProps) {
  return (
    <g>
      {/* Foreground ledge - the darkest silhouette, crops the frame. */}
      <path d="M0 320 L0 306 Q 260 288 520 304 Q 780 320 1040 300 Q 1140 293 1200 298 L1200 320 Z" fill={p.props.fg} />
      {/* Grass tufts on the ledge - center cluster plus wide accents. */}
      {[
        [140, 305],
        [470, 300],
        [600, 308],
        [700, 310],
        [960, 303],
      ].map(([x, y], i) => (
        <path
          key={`tuft-${i}`}
          d={`M ${x} ${y + 8} l 3 -12 l 2 10 l 3 -14 l 3 13 l 2 -9 l 3 11 Z`}
          fill={p.props.tree}
        />
      ))}
      {/* Fireflies drifting low over the ledge - two inside the phone
          band, two toward the edges. */}
      {[
        [220, 278, 0],
        [540, 268, 1.4],
        [640, 280, 2.6],
        [1100, 272, 0.7],
      ].map(([cx, cy, delay], i) => (
        <circle
          key={`ff-${i}`}
          cx={cx}
          cy={cy}
          r={3}
          fill={p.lights.goldStar}
          opacity={0.85}
          className="ambient-sparkle"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </g>
  );
}
