import { AmbientSparkles, Hills, Moon } from './shared';
import type { LandArtProps } from './sky';

/** CR-82 (M2): 'jungle' land art - far/mid/near split (FF-6 palette-only).
 *  Firefly sparkles over the canopy; moon at night, no sun (deep jungle). */

export function Far({ p, tone }: LandArtProps) {
  return (
    <g>
      {tone === 'night' && (
        <Moon x={140} y={70} r={30} body={p.lights.moon} shadow={p.props.moonShadow} />
      )}
      <AmbientSparkles fill={p.lights.sparkle} />
    </g>
  );
}

export function Mid({ p }: LandArtProps) {
  return (
    <g>
      <Hills colors={p.ground} />
      {/* vines */}
      {[420, 560, 700].map((x, i) => (
        <g key={i} transform={`translate(${x} 0)`}>
          <path d={`M0 0 Q ${i % 2 ? -24 : 24} 80 0 160 T 0 260`} stroke={p.props.vine} strokeWidth="7" fill="none" strokeLinecap="round" />
          <ellipse cx={i % 2 ? -20 : 20} cy="120" rx="18" ry="10" fill={p.props.vineLeaf1} transform={`rotate(${i % 2 ? -30 : 30} ${i % 2 ? -20 : 20} 120)`} />
          <ellipse cx={i % 2 ? 16 : -16} cy="200" rx="16" ry="9" fill={p.props.vineLeaf2} transform={`rotate(${i % 2 ? 30 : -30} ${i % 2 ? 16 : -16} 200)`} />
        </g>
      ))}
    </g>
  );
}

export function Near({ p }: LandArtProps) {
  const petals = [p.props.flower1, p.props.flower2, p.props.flower3];
  return (
    <g>
      {/* big leaves */}
      {[
        { x: 80, r: -18, s: 1.2 },
        { x: 210, r: 10, s: 0.9 },
        { x: 980, r: 15, s: 1.1 },
        { x: 1100, r: -12, s: 1.3 },
      ].map((l, i) => (
        <g key={i} className={i % 2 ? 'land-sway' : 'land-drift-slow'} transform={`translate(${l.x} 320) rotate(${l.r}) scale(${l.s})`}>
          <path d="M0 0 Q -60 -90 -20 -170 Q 30 -100 0 0" fill={p.props.leaf1} />
          <path d="M0 0 Q 60 -80 30 -160 Q -20 -90 0 0" fill={p.props.leaf2} />
          <path d="M0 0 Q -14 -60 0 -120 Q 14 -60 0 0" fill={p.props.leaf3} />
        </g>
      ))}
      {/* toucan dots */}
      <g transform="translate(880 210)">
        <circle r="20" fill={p.props.toucan} />
        <circle cx="10" cy="-4" r="5" fill={p.props.toucanEye} />
        <circle cx="11" cy="-4" r="2.4" fill={p.props.toucan} />
        <path d="M-14 4 L-52 10 L-16 16 Z" fill={p.props.toucanBeak} />
      </g>
      {[150, 500, 760].map((x, i) => (
        <g key={i} transform={`translate(${x} ${300 + (i % 2) * 6})`}>
          <circle r="8" fill={petals[i % 3]} />
          <circle cy="-8" r="4" fill={p.props.flowerCenter} />
        </g>
      ))}
    </g>
  );
}
