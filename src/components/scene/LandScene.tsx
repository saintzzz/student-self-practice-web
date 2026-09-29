import type { LandKey } from '../../lib/ui/theme';

/**
 * CR-10 DS-T1: decorative scene art pinned to the bottom of the page
 * behind content. Own inline SVG art - self-hosted, no attribution
 * needed, transform-friendly (a few elements drift/wave via CSS
 * keyframes defined in index.css, all reduced-motion safe).
 */
export default function LandScene({ land }: { land: LandKey }) {
  return (
    <>
      {/* CR-12 DS-X1 ambience: soft top glow + gentle bottom vignette,
          painted before the scene so content always stays above. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-white/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/10 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 select-none overflow-hidden"
      >
        <svg
          viewBox="0 0 1200 320"
          preserveAspectRatio="xMidYMax slice"
          className="block h-44 w-full sm:h-60"
        >
          <AmbientSparkles dark={land === 'space'} />
          {land === 'sky' && <SkyScene />}
          {land === 'playground' && <PlaygroundScene />}
          {land === 'town' && <TownScene />}
          {land === 'jungle' && <JungleScene />}
          {land === 'city' && <CityScene />}
          {land === 'space' && <SpaceScene />}
        </svg>
      </div>
    </>
  );
}

/** CR-12: floating sparkle dots above the scene - dreamy ambience. */
function AmbientSparkles({ dark }: { dark: boolean }) {
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
          fill={dark ? '#fef9c3' : '#ffffff'}
          opacity={dark ? 0.9 : 0.85}
          className="ambient-sparkle"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </g>
  );
}

function Cloud({ x, y, s = 1, o = 0.9 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill="#ffffff">
      <ellipse cx="0" cy="0" rx="46" ry="22" />
      <ellipse cx="34" cy="6" rx="34" ry="17" />
      <ellipse cx="-36" cy="8" rx="30" ry="15" />
      <ellipse cx="6" cy="-14" rx="28" ry="16" />
    </g>
  );
}

function Sun({ x, y, r = 42 }: { x: number; y: number; r?: number }) {
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
          fill="#fde047"
          transform={`rotate(${i * 45})`}
        />
      ))}
      <circle r={r} fill="#fbbf24" />
      <circle r={r - 10} cx="-6" cy="-6" fill="#fde68a" opacity="0.7" />
    </g>
  );
}

function Hills({ colors }: { colors: [string, string] }) {
  return (
    <g>
      <path d="M0 320 L0 240 Q 200 170 420 235 Q 640 300 860 230 Q 1040 180 1200 250 L1200 320 Z" fill={colors[0]} />
      <path d="M0 320 L0 275 Q 260 220 540 270 Q 820 320 1200 265 L1200 320 Z" fill={colors[1]} />
    </g>
  );
}

function SkyScene() {
  return (
    <g>
      <Sun x={1050} y={55} />
      <g className="land-drift"><Cloud x={180} y={60} /></g>
      <g className="land-drift-slow"><Cloud x={520} y={35} s={0.8} o={0.75} /></g>
      <g className="land-drift"><Cloud x={860} y={95} s={0.7} o={0.8} /></g>
      <Hills colors={['#86efac', '#4ade80']} />
      {/* flowers */}
      {[140, 320, 760, 1010].map((x, i) => (
        <g key={i} transform={`translate(${x} ${292 + (i % 2) * 8})`}>
          <circle r="7" fill={['#fb7185', '#fbbf24', '#a78bfa', '#f472b6'][i % 4]} />
          <circle cy="-7" r="4" fill="#fff" opacity="0.85" />
        </g>
      ))}
    </g>
  );
}

function PlaygroundScene() {
  return (
    <g>
      <Sun x={90} y={60} r={36} />
      <g className="land-drift"><Cloud x={400} y={45} s={0.8} /></g>
      <g className="land-drift-slow"><Cloud x={760} y={70} s={0.65} o={0.8} /></g>
      <Hills colors={['#a3e635', '#65a30d']} />
      {/* swing set */}
      <g stroke="#92400e" strokeWidth="8" strokeLinecap="round" fill="none">
        <path d="M880 320 L920 200 M1000 320 L960 200 M920 200 L960 200" />
      </g>
      <g className="land-sway">
        <line x1="930" y1="204" x2="930" y2="262" stroke="#78350f" strokeWidth="4" />
        <rect x="918" y="262" width="24" height="8" rx="4" fill="#f59e0b" />
        <line x1="952" y1="204" x2="952" y2="250" stroke="#78350f" strokeWidth="4" />
        <rect x="940" y="250" width="24" height="8" rx="4" fill="#ef4444" />
      </g>
      {/* slide */}
      <g>
        <rect x="180" y="200" width="14" height="120" fill="#0ea5e9" />
        <path d="M194 214 L290 320 L230 320 L194 260 Z" fill="#38bdf8" />
        <circle cx="187" cy="192" r="14" fill="#0284c7" />
      </g>
      {/* ball + flowers */}
      <circle cx="520" cy="300" r="16" fill="#f43f5e" />
      <path d="M508 290 Q520 300 532 292 M508 310 Q520 300 532 308" stroke="#fff" strokeWidth="3" fill="none" />
      {[360, 640, 1100].map((x, i) => (
        <g key={i} transform={`translate(${x} ${300 + (i % 2) * 6})`}>
          <circle r="7" fill={['#fbbf24', '#fb7185', '#a78bfa'][i % 3]} />
          <circle cy="-7" r="4" fill="#fff" opacity="0.85" />
        </g>
      ))}
    </g>
  );
}

function TownScene() {
  return (
    <g>
      <Sun x={1080} y={55} r={34} />
      <g className="land-drift"><Cloud x={300} y={50} s={0.85} /></g>
      <g className="land-drift-slow"><Cloud x={700} y={30} s={0.6} o={0.75} /></g>
      <rect x="0" y="270" width="1200" height="50" fill="#cbd5e1" />
      {/* houses */}
      {[
        { x: 90, w: 130, h: 110, c: '#fda4af', roof: '#e11d48' },
        { x: 270, w: 110, h: 140, c: '#fdba74', roof: '#ea580c' },
        { x: 430, w: 140, h: 100, c: '#fde68a', roof: '#d97706' },
        { x: 640, w: 120, h: 130, c: '#a5b4fc', roof: '#4f46e5' },
        { x: 820, w: 100, h: 90, c: '#6ee7b7', roof: '#059669' },
        { x: 980, w: 150, h: 120, c: '#f9a8d4', roof: '#db2777' },
      ].map((h, i) => (
        <g key={i}>
          <rect x={h.x} y={270 - h.h} width={h.w} height={h.h} fill={h.c} />
          <path d={`M${h.x - 8} ${270 - h.h} L${h.x + h.w / 2} ${270 - h.h - 38} L${h.x + h.w + 8} ${270 - h.h} Z`} fill={h.roof} />
          <rect x={h.x + h.w / 2 - 14} y={270 - 44} width="28" height="44" rx="3" fill="#7c2d12" />
          <rect x={h.x + 16} y={270 - h.h + 18} width="22" height="22" rx="3" fill="#e0f2fe" />
          <rect x={h.x + h.w - 38} y={270 - h.h + 18} width="22" height="22" rx="3" fill="#e0f2fe" />
        </g>
      ))}
      {/* road dashes + trees */}
      {[60, 200, 340, 480, 620, 760, 900, 1040, 1160].map((x, i) => (
        <rect key={i} x={x} y="292" width="60" height="8" rx="4" fill="#fff" opacity="0.8" />
      ))}
      {[240, 600, 940].map((x, i) => (
        <g key={i} transform={`translate(${x} 0)`}>
          <rect x="-6" y="236" width="12" height="34" fill="#92400e" />
          <circle cy="222" r="26" fill="#22c55e" />
          <circle cx="16" cy="230" r="18" fill="#4ade80" />
        </g>
      ))}
    </g>
  );
}

function JungleScene() {
  return (
    <g>
      <Hills colors={['#166534', '#14532d']} />
      {/* big leaves */}
      {[
        { x: 80, r: -18, s: 1.2 },
        { x: 210, r: 10, s: 0.9 },
        { x: 980, r: 15, s: 1.1 },
        { x: 1100, r: -12, s: 1.3 },
      ].map((l, i) => (
        <g key={i} className={i % 2 ? 'land-sway' : 'land-drift-slow'} transform={`translate(${l.x} 320) rotate(${l.r}) scale(${l.s})`}>
          <path d="M0 0 Q -60 -90 -20 -170 Q 30 -100 0 0" fill="#15803d" />
          <path d="M0 0 Q 60 -80 30 -160 Q -20 -90 0 0" fill="#16a34a" />
          <path d="M0 0 Q -14 -60 0 -120 Q 14 -60 0 0" fill="#22c55e" />
        </g>
      ))}
      {/* vines */}
      {[420, 560, 700].map((x, i) => (
        <g key={i} transform={`translate(${x} 0)`}>
          <path d={`M0 0 Q ${i % 2 ? -24 : 24} 80 0 160 T 0 260`} stroke="#15803d" strokeWidth="7" fill="none" strokeLinecap="round" />
          <ellipse cx={i % 2 ? -20 : 20} cy="120" rx="18" ry="10" fill="#22c55e" transform={`rotate(${i % 2 ? -30 : 30} ${i % 2 ? -20 : 20} 120)`} />
          <ellipse cx={i % 2 ? 16 : -16} cy="200" rx="16" ry="9" fill="#4ade80" transform={`rotate(${i % 2 ? 30 : -30} ${i % 2 ? 16 : -16} 200)`} />
        </g>
      ))}
      {/* toucan dots + flowers */}
      <g transform="translate(880 210)">
        <circle r="20" fill="#0f172a" />
        <circle cx="10" cy="-4" r="5" fill="#fff" />
        <circle cx="11" cy="-4" r="2.4" fill="#0f172a" />
        <path d="M-14 4 L-52 10 L-16 16 Z" fill="#f97316" />
      </g>
      {[150, 500, 760].map((x, i) => (
        <g key={i} transform={`translate(${x} ${300 + (i % 2) * 6})`}>
          <circle r="8" fill={['#f43f5e', '#fb923c', '#e879f9'][i % 3]} />
          <circle cy="-8" r="4" fill="#fde047" />
        </g>
      ))}
    </g>
  );
}

function CityScene() {
  return (
    <g>
      <g className="land-drift"><Cloud x={340} y={45} s={0.7} o={0.8} /></g>
      <g className="land-drift-slow"><Cloud x={880} y={70} s={0.9} o={0.7} /></g>
      {/* skyline */}
      {[
        { x: 40, w: 90, h: 150, c: '#6366f1' },
        { x: 150, w: 110, h: 200, c: '#818cf8' },
        { x: 280, w: 80, h: 120, c: '#a5b4fc' },
        { x: 380, w: 130, h: 180, c: '#4f46e5' },
        { x: 530, w: 90, h: 230, c: '#6366f1' },
        { x: 640, w: 120, h: 160, c: '#818cf8' },
        { x: 780, w: 85, h: 200, c: '#4338ca' },
        { x: 885, w: 115, h: 140, c: '#a5b4fc' },
        { x: 1020, w: 95, h: 180, c: '#6366f1' },
        { x: 1130, w: 70, h: 120, c: '#818cf8' },
      ].map((b, i) => (
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
                fill={r % 3 === c % 3 ? '#fef08a' : '#e0e7ff'}
                opacity={r % 3 === c % 3 ? 1 : 0.5}
              />
            )),
          )}
        </g>
      ))}
      <rect x="0" y="270" width="1200" height="50" fill="#334155" />
      {[80, 260, 440, 620, 800, 980].map((x, i) => (
        <rect key={i} x={x} y="292" width="70" height="8" rx="4" fill="#fde047" opacity="0.85" />
      ))}
      {/* bus */}
      <g className="land-drift-slow" transform="translate(200 0)">
        <rect x="0" y="238" width="120" height="40" rx="10" fill="#f43f5e" />
        <rect x="10" y="246" width="24" height="16" rx="3" fill="#bae6fd" />
        <rect x="42" y="246" width="24" height="16" rx="3" fill="#bae6fd" />
        <rect x="74" y="246" width="24" height="16" rx="3" fill="#bae6fd" />
        <circle cx="28" cy="280" r="10" fill="#1e293b" />
        <circle cx="92" cy="280" r="10" fill="#1e293b" />
      </g>
    </g>
  );
}

function SpaceScene() {
  return (
    <g>
      {/* stars */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = (i * 173) % 1200;
        const y = (i * 97) % 240;
        const r = (i % 3) + 1.2;
        return <circle key={i} cx={x} cy={y} r={r} fill="#fefce8" opacity={0.4 + (i % 4) * 0.15} className={i % 5 === 0 ? 'land-twinkle' : undefined} />;
      })}
      {/* planets */}
      <g transform="translate(150 90)">
        <circle r="44" fill="#f97316" />
        <ellipse rx="70" ry="14" fill="none" stroke="#fdba74" strokeWidth="8" transform="rotate(-16)" />
      </g>
      <g transform="translate(1020 60)">
        <circle r="30" fill="#38bdf8" />
        <circle cx="-9" cy="-7" r="7" fill="#7dd3fc" />
        <circle cx="9" cy="9" r="5" fill="#0ea5e9" />
      </g>
      {/* moon ground */}
      <path d="M0 320 L0 280 Q 300 240 600 265 Q 900 290 1200 255 L1200 320 Z" fill="#c4b5fd" />
      <path d="M0 320 L0 298 Q 400 272 800 296 Q 1050 306 1200 288 L1200 320 Z" fill="#a78bfa" />
      {[{ x: 300, r: 16 }, { x: 560, r: 10 }, { x: 860, r: 20 }, { x: 1080, r: 12 }].map((c, i) => (
        <circle key={i} cx={c.x} cy={306} r={c.r} fill="#8b5cf6" opacity="0.5" />
      ))}
      {/* rocket */}
      <g className="land-float" transform="translate(640 130)">
        <path d="M0 -60 Q 22 -20 22 30 L-22 30 Q -22 -20 0 -60 Z" fill="#f1f5f9" />
        <circle cy="-10" r="11" fill="#38bdf8" stroke="#94a3b8" strokeWidth="3" />
        <path d="M-22 12 L-44 44 L-22 34 Z" fill="#ef4444" />
        <path d="M22 12 L44 44 L22 34 Z" fill="#ef4444" />
        <path d="M-8 30 Q 0 52 8 30 Z" fill="#fbbf24" />
      </g>
      {/* flag */}
      <g transform="translate(430 240)">
        <line x1="0" y1="0" x2="0" y2="60" stroke="#e2e8f0" strokeWidth="4" />
        <rect x="0" y="0" width="46" height="28" rx="3" fill="#f43f5e" />
        <circle cx="14" cy="14" r="6" fill="#fde047" />
      </g>
    </g>
  );
}
