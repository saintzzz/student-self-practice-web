import { AmbientSparkles, Cloud, Moon } from './shared';
import type { LandArtProps } from './sky';

/** CR-82 (M2): 'city' land art - far/mid/near split (FF-6 palette-only).
 *  OM-6: navy towers + amber windows (was an indigo ramp). */

export function Far({ p, tone, hero }: LandArtProps) {
  return (
    <g>
      {tone === 'night' && (
        <Moon x={1080} y={60} r={30} body={p.lights.moon} shadow={p.props.moonShadow} />
      )}
      {hero ? (
        <g className="animate-scene-drift-far">
          <Cloud x={340} y={45} s={0.7} o={0.8} fill={p.props.cloud} />
          <Cloud x={880} y={70} s={0.9} o={0.7} fill={p.props.cloud} />
        </g>
      ) : (
        <g>
          <g className="land-drift"><Cloud x={340} y={45} s={0.7} o={0.8} fill={p.props.cloud} /></g>
          <g className="land-drift-slow"><Cloud x={880} y={70} s={0.9} o={0.7} fill={p.props.cloud} /></g>
        </g>
      )}
      <AmbientSparkles fill={p.lights.sparkle} />
    </g>
  );
}

export function Mid({ p }: LandArtProps) {
  const towers = [
    { x: 40, w: 90, h: 150, c: p.props.tower1 },
    { x: 150, w: 110, h: 200, c: p.props.tower2 },
    { x: 280, w: 80, h: 120, c: p.props.tower3 },
    { x: 380, w: 130, h: 180, c: p.props.tower4 },
    { x: 530, w: 90, h: 230, c: p.props.tower1 },
    { x: 640, w: 120, h: 160, c: p.props.tower2 },
    { x: 780, w: 85, h: 200, c: p.props.tower3 },
    { x: 885, w: 115, h: 140, c: p.props.tower4 },
    { x: 1020, w: 95, h: 180, c: p.props.tower1 },
    { x: 1130, w: 70, h: 120, c: p.props.tower2 },
  ];
  return (
    <g>
      {towers.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={270 - b.h} width={b.w} height={b.h} fill={b.c} />
          {Array.from({ length: Math.floor(b.h / 36) }).map((_, r) =>
            Array.from({ length: Math.floor(b.w / 30) }).map((__, c) => (
              <rect
                key={`${r}-${c}`}
                x={b.x + 10 + c * 30}
                y={270 - b.h + 12 + r * 36}
                width="14"
                height="16"
                rx="2"
                fill={r % 3 === c % 3 ? p.lights.window : p.lights.windowDim}
                opacity={r % 3 === c % 3 ? 1 : 0.5}
              />
            )),
          )}
        </g>
      ))}
      <rect x="0" y="270" width="1200" height="50" fill={p.ground[0]} />
    </g>
  );
}

export function Near({ p }: LandArtProps) {
  return (
    <g>
      {[80, 260, 440, 620, 800, 980].map((x, i) => (
        <rect key={i} x={x} y="292" width="70" height="8" rx="4" fill={p.lights.roadDash} opacity="0.85" />
      ))}
      {/* bus */}
      <g className="land-drift-slow" transform="translate(200 0)">
        <rect x="0" y="238" width="120" height="40" rx="10" fill={p.props.bus} />
        <rect x="10" y="246" width="24" height="16" rx="3" fill={p.props.busWindow} />
        <rect x="42" y="246" width="24" height="16" rx="3" fill={p.props.busWindow} />
        <rect x="74" y="246" width="24" height="16" rx="3" fill={p.props.busWindow} />
        <circle cx="28" cy="280" r="10" fill={p.props.busWheel} />
        <circle cx="92" cy="280" r="10" fill={p.props.busWheel} />
      </g>
    </g>
  );
}
