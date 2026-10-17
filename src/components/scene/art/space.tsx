import type { LandArtProps } from './sky';

/**
 * CR-82 (M2): 'space' land art - far/mid/near split (FF-6 palette-only).
 * GT-13 fix: twinkling stars capped at 6 (spec s6.2 L1) and no extra
 * AmbientSparkles layer - the star field IS the ambience, keeping the
 * animated-node budget at 7 (6 twinkles + 1 rocket float).
 */

export function Far({ p }: LandArtProps) {
  return (
    <g>
      <defs>
        <radialGradient id="space-nebula">
          <stop offset="0%" stopColor={p.props.nebula} stopOpacity={0.15} />
          <stop offset="100%" stopColor={p.props.nebula} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* OM-6: one violet nebula radial at <=0.15 alpha (closed inventory) */}
      <ellipse cx="620" cy="90" rx="420" ry="150" fill="url(#space-nebula)" />
      {/* stars: 40 total, every 7th (i%7===0 -> 6) twinkles */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = (i * 173) % 1200;
        const y = (i * 97) % 240;
        const r = (i % 3) + 1.2;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill={p.lights.star}
            opacity={0.4 + (i % 4) * 0.15}
            className={i % 7 === 0 ? 'land-twinkle' : undefined}
          />
        );
      })}
      {/* planets */}
      <g transform="translate(150 90)">
        <circle r="44" fill={p.props.planet1} />
        <ellipse rx="70" ry="14" fill="none" stroke={p.props.planet1Ring} strokeWidth="8" transform="rotate(-16)" />
      </g>
      <g transform="translate(1020 60)">
        <circle r="30" fill={p.props.planet2} />
        <circle cx="-9" cy="-7" r="7" fill={p.props.planet2Light} />
        <circle cx="9" cy="9" r="5" fill={p.props.planet2Dark} />
      </g>
    </g>
  );
}

export function Mid({ p }: LandArtProps) {
  return (
    <g>
      {/* moon-rock slate ground */}
      <path d="M0 320 L0 280 Q 300 240 600 265 Q 900 290 1200 255 L1200 320 Z" fill={p.ground[0]} />
      <path d="M0 320 L0 298 Q 400 272 800 296 Q 1050 306 1200 288 L1200 320 Z" fill={p.ground[1]} />
      {[{ x: 300, r: 16 }, { x: 560, r: 10 }, { x: 860, r: 20 }, { x: 1080, r: 12 }].map((c, i) => (
        <circle key={i} cx={c.x} cy={306} r={c.r} fill={p.props.crater} opacity="0.5" />
      ))}
    </g>
  );
}

export function Near({ p }: LandArtProps) {
  return (
    <g>
      {/* rocket */}
      <g className="land-float" transform="translate(640 130)">
        <path d="M0 -60 Q 22 -20 22 30 L-22 30 Q -22 -20 0 -60 Z" fill={p.props.rocketBody} />
        <circle cy="-10" r="11" fill={p.props.rocketWindow} stroke={p.props.rocketWindowRing} strokeWidth="3" />
        <path d="M-22 12 L-44 44 L-22 34 Z" fill={p.props.rocketFin} />
        <path d="M22 12 L44 44 L22 34 Z" fill={p.props.rocketFin} />
        <path d="M-8 30 Q 0 52 8 30 Z" fill={p.lights.rocketFlame} />
      </g>
      {/* flag */}
      <g transform="translate(430 240)">
        <line x1="0" y1="0" x2="0" y2="60" stroke={p.props.flagPole} strokeWidth="4" />
        <rect x="0" y="0" width="46" height="28" rx="3" fill={p.props.flag} />
        <circle cx="14" cy="14" r="6" fill={p.props.flagDot} />
      </g>
    </g>
  );
}
