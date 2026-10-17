import type { SceneTone } from '../../../lib/ui/theme';
import { AmbientSparkles, Cloud, Flower, Hills, SunOrMoon } from './shared';
import type { LandArtProps } from './sky';

/** CR-82 (M2): 'playground' land art - far/mid/near split (FF-6 palette-only). */

function SunPos(tone: SceneTone): { x: number; y: number; r: number } {
  if (tone === 'dusk') return { x: 130, y: 190, r: 36 };
  if (tone === 'night') return { x: 100, y: 60, r: 30 };
  return { x: 90, y: 60, r: 36 };
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
          <Cloud x={400} y={45} s={0.8} fill={p.props.cloud} />
          <Cloud x={760} y={70} s={0.65} o={0.8} fill={p.props.cloud} />
        </g>
      ) : (
        <g>
          <g className="land-drift"><Cloud x={400} y={45} s={0.8} fill={p.props.cloud} /></g>
          <g className="land-drift-slow"><Cloud x={760} y={70} s={0.65} o={0.8} fill={p.props.cloud} /></g>
        </g>
      )}
      <AmbientSparkles fill={p.lights.sparkle} />
    </g>
  );
}

export function Mid({ p }: LandArtProps) {
  return <Hills colors={p.ground} />;
}

export function Near({ p }: LandArtProps) {
  const petals = [p.props.flower1, p.props.flower2, p.props.flower3];
  return (
    <g>
      {/* swing set */}
      <g stroke={p.props.swingFrame} strokeWidth="8" strokeLinecap="round" fill="none">
        <path d="M880 320 L920 200 M1000 320 L960 200 M920 200 L960 200" />
      </g>
      <g className="land-sway">
        <line x1="930" y1="204" x2="930" y2="262" stroke={p.props.swingChain} strokeWidth="4" />
        <rect x="918" y="262" width="24" height="8" rx="4" fill={p.props.swingSeat1} />
        <line x1="952" y1="204" x2="952" y2="250" stroke={p.props.swingChain} strokeWidth="4" />
        <rect x="940" y="250" width="24" height="8" rx="4" fill={p.props.swingSeat2} />
      </g>
      {/* slide */}
      <g>
        <rect x="180" y="200" width="14" height="120" fill={p.props.slidePole} />
        <path d="M194 214 L290 320 L230 320 L194 260 Z" fill={p.props.slideRamp} />
        <circle cx="187" cy="192" r="14" fill={p.props.slideTop} />
      </g>
      {/* ball + flowers */}
      <circle cx="520" cy="300" r="16" fill={p.props.ball} />
      <path d="M508 290 Q520 300 532 292 M508 310 Q520 300 532 308" stroke={p.props.ballSeam} strokeWidth="3" fill="none" />
      {[360, 640, 1100].map((x, i) => (
        <Flower key={i} x={x} y={300 + (i % 2) * 6} petal={petals[i % 3]} center={p.props.flowerCenter} />
      ))}
    </g>
  );
}
