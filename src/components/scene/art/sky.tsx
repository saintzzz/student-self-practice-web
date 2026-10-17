import type { ScenePalette, SceneTone } from '../../../lib/ui/theme';
import { AmbientSparkles, Cloud, Flower, Hills, SunOrMoon } from './shared';

/**
 * CR-82 (M2): 'sky' land art split into far/mid/near layers.
 * Fills come from scenePalette(land, tone) - no hex here (FF-6).
 */
export interface LandArtProps {
  p: ScenePalette;
  tone: SceneTone;
  /** hero = far clouds ride the 60s scene-drift-far group (spec s6.2 L1);
   *  strip keeps the v4 per-cloud land-drift loops. */
  hero: boolean;
}

function SunPos(tone: SceneTone): { x: number; y: number } {
  if (tone === 'dusk') return { x: 990, y: 185 }; // low setting sun at the horizon
  if (tone === 'night') return { x: 1050, y: 62 }; // moon position
  return { x: 1050, y: 55 };
}

export function Far({ p, tone, hero }: LandArtProps) {
  const pos = SunPos(tone);
  return (
    <g>
      <SunOrMoon
        x={pos.x}
        y={pos.y}
        tone={tone}
        r={tone === 'night' ? 32 : 42}
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
          <Cloud x={180} y={60} fill={p.props.cloud} />
          <Cloud x={520} y={35} s={0.8} o={0.75} fill={p.props.cloud} />
          <Cloud x={860} y={95} s={0.7} o={0.8} fill={p.props.cloud} />
        </g>
      ) : (
        <g>
          <g className="land-drift"><Cloud x={180} y={60} fill={p.props.cloud} /></g>
          <g className="land-drift-slow"><Cloud x={520} y={35} s={0.8} o={0.75} fill={p.props.cloud} /></g>
          <g className="land-drift"><Cloud x={860} y={95} s={0.7} o={0.8} fill={p.props.cloud} /></g>
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
  const petals = [p.props.flower1, p.props.flower2, p.props.flower3, p.props.flower4];
  return (
    <g>
      {[140, 320, 760, 1010].map((x, i) => (
        <Flower key={i} x={x} y={292 + (i % 2) * 8} petal={petals[i % 4]} center={p.props.flowerCenter} />
      ))}
    </g>
  );
}
