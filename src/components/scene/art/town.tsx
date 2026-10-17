import type { SceneTone } from '../../../lib/ui/theme';
import { AmbientSparkles, Cloud, SunOrMoon } from './shared';
import type { LandArtProps } from './sky';

/** CR-82 (M2): 'town' land art - far/mid/near split (FF-6 palette-only). */

function SunPos(tone: SceneTone): { x: number; y: number; r: number } {
  if (tone === 'dusk') return { x: 1020, y: 180, r: 34 };
  if (tone === 'night') return { x: 1080, y: 58, r: 30 };
  return { x: 1080, y: 55, r: 34 };
}

export function Far({ p, tone, hero }: LandArtProps) {
  const pos = SunPos(tone);
  return (
    <g>
      <SunOrMoon
        x={pos.x}
        y={pos.y}
        r={pos.r}
        tone={tone}
        c={{
          ray: p.lights.sunRay,
          body: p.lights.sun,
          core: p.lights.sunCore,
          moonBody: p.lights.moon,
          moonShadow: p.props.moonShadow,
        }}
      />
      {hero ? (
        <g className="animate-scene-drift-far">
          <Cloud x={300} y={50} s={0.85} fill={p.props.cloud} />
          <Cloud x={700} y={30} s={0.6} o={0.75} fill={p.props.cloud} />
        </g>
      ) : (
        <g>
          <g className="land-drift"><Cloud x={300} y={50} s={0.85} fill={p.props.cloud} /></g>
          <g className="land-drift-slow"><Cloud x={700} y={30} s={0.6} o={0.75} fill={p.props.cloud} /></g>
        </g>
      )}
      <AmbientSparkles fill={p.lights.sparkle} />
    </g>
  );
}

export function Mid({ p }: LandArtProps) {
  const houses = [
    { x: 90, w: 130, h: 110, c: p.props.house1, roof: p.props.house1Roof },
    { x: 270, w: 110, h: 140, c: p.props.house2, roof: p.props.house2Roof },
    { x: 430, w: 140, h: 100, c: p.props.house3, roof: p.props.house3Roof },
    { x: 640, w: 120, h: 130, c: p.props.house4, roof: p.props.house4Roof },
    { x: 820, w: 100, h: 90, c: p.props.house5, roof: p.props.house5Roof },
    { x: 980, w: 150, h: 120, c: p.props.house6, roof: p.props.house6Roof },
  ];
  return (
    <g>
      <rect x="0" y="270" width="1200" height="50" fill={p.ground[0]} />
      {houses.map((h, i) => (
        <g key={i}>
          <rect x={h.x} y={270 - h.h} width={h.w} height={h.h} fill={h.c} />
          <path d={`M${h.x - 8} ${270 - h.h} L${h.x + h.w / 2} ${270 - h.h - 38} L${h.x + h.w + 8} ${270 - h.h} Z`} fill={h.roof} />
          <rect x={h.x + h.w / 2 - 14} y={270 - 44} width="28" height="44" rx="3" fill={p.props.door} />
          <rect x={h.x + 16} y={270 - h.h + 18} width="22" height="22" rx="3" fill={p.lights.window} />
          <rect x={h.x + h.w - 38} y={270 - h.h + 18} width="22" height="22" rx="3" fill={p.lights.window} />
        </g>
      ))}
    </g>
  );
}

export function Near({ p }: LandArtProps) {
  return (
    <g>
      {/* road dashes + trees */}
      {[60, 200, 340, 480, 620, 760, 900, 1040, 1160].map((x, i) => (
        <rect key={i} x={x} y="292" width="60" height="8" rx="4" fill={p.lights.roadDash} opacity="0.8" />
      ))}
      {[240, 600, 940].map((x, i) => (
        <g key={i} transform={`translate(${x} 0)`}>
          <rect x="-6" y="236" width="12" height="34" fill={p.props.treeTrunk} />
          <circle cy="222" r="26" fill={p.props.tree1} />
          <circle cx="16" cy="230" r="18" fill={p.props.tree2} />
        </g>
      ))}
    </g>
  );
}
