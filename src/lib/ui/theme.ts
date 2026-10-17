/**
 * CR-10 "Hanh trinh cua Be Heo" land theming (design-spec s16.1).
 * One adventure world: each grade is a land with its own palette,
 * scene motif and Vietnamese name. Non-grade surfaces (login, admin,
 * credits) use the neutral `sky` land so every screen belongs to the
 * same world. Pure descriptor map - no DOM here.
 */

export type LandKey = 'sky' | 'playground' | 'town' | 'jungle' | 'city' | 'space' | 'brand';

export interface Land {
  key: LandKey;
  /** Land name in Vietnamese ("San choi"). */
  nameVi: string;
  /** Card label: "Vung dat 1" style prefix text for journey feel. */
  subtitleVi: string;
  /** Tailwind gradient stops for the page background. */
  pageGradient: string;
  /** Card surface tint + ring for land cards / chrome. */
  cardTint: string;
  cardRing: string;
  /** Disc (number badge) background + text. */
  discBg: string;
  /** Primary accent text color on the card. */
  accentText: string;
  /** A small emoji motif hint for the land (decorative). */
  motif: string;
  /** CR-81: solid accent strip on the top edge of the navy play board -
   *  the land's "flag color" so each grade's board carries its identity. */
  nightRim: string;
  /** CR-82 (DESIGN-SPEC-v5 s5.1): land-tinted horizon glow rgba() painted
   *  behind the hero scene's gold horizon. */
  horizonGlow: string;
}

export const LANDS: Record<LandKey, Land> = {
  sky: {
    key: 'sky',
    nameVi: 'Bầu trời',
    subtitleVi: '',
    pageGradient: 'bg-gradient-to-b from-sky-400 via-sky-200 to-emerald-100',
    cardTint: 'bg-white/95',
    cardRing: 'ring-sky-300',
    discBg: 'bg-sky-400',
    accentText: 'text-sky-800',
    motif: '☁️',
    nightRim: 'bg-sky-400',
    horizonGlow: 'rgba(56,189,248,0.28)',
  },
  playground: {
    key: 'playground',
    nameVi: 'Sân chơi',
    subtitleVi: 'Vùng đất 1',
    pageGradient: 'bg-gradient-to-b from-amber-300 via-lime-100 to-emerald-200',
    cardTint: 'bg-lime-50/95',
    cardRing: 'ring-lime-400',
    discBg: 'bg-lime-500',
    accentText: 'text-lime-800',
    motif: '🌞',
    nightRim: 'bg-lime-400',
    horizonGlow: 'rgba(163,230,53,0.30)',
  },
  town: {
    key: 'town',
    nameVi: 'Thị trấn',
    subtitleVi: 'Vùng đất 2',
    pageGradient: 'bg-gradient-to-b from-sky-400 via-sky-200 to-orange-100',
    cardTint: 'bg-sky-50/95',
    cardRing: 'ring-sky-400',
    discBg: 'bg-sky-500',
    accentText: 'text-sky-800',
    motif: '🏠',
    nightRim: 'bg-sky-400',
    horizonGlow: 'rgba(56,189,248,0.28)',
  },
  jungle: {
    key: 'jungle',
    nameVi: 'Rừng rậm',
    subtitleVi: 'Vùng đất 3',
    pageGradient: 'bg-gradient-to-b from-emerald-400 via-green-200 to-lime-200',
    cardTint: 'bg-emerald-50/95',
    cardRing: 'ring-emerald-500',
    discBg: 'bg-emerald-600',
    accentText: 'text-emerald-900',
    motif: '🌴',
    nightRim: 'bg-emerald-400',
    horizonGlow: 'rgba(52,211,153,0.28)',
  },
  /* CR-82 (OM-6 / R-v5-04): city identity moves indigo -> orange/navy. */
  city: {
    key: 'city',
    nameVi: 'Thành phố',
    subtitleVi: 'Vùng đất 4',
    pageGradient: 'bg-gradient-to-b from-orange-300 via-amber-100 to-sky-100',
    cardTint: 'bg-orange-50/95',
    cardRing: 'ring-orange-400',
    discBg: 'bg-orange-500',
    accentText: 'text-orange-800',
    motif: '🏙️',
    nightRim: 'bg-orange-300',
    horizonGlow: 'rgba(253,186,116,0.30)',
  },
  /* CR-82 (OM-6 / R-v5-04): space goes navy cosmos; violet survives only
      in the closed inventory - nightRim, discBg, horizonGlow, the map
      card (cardTint + accentText) and one L1 nebula (scenePalette). */
  space: {
    key: 'space',
    nameVi: 'Vũ trụ',
    subtitleVi: 'Vùng đất 5',
    pageGradient: 'bg-gradient-to-b from-navy-950 via-navy-800 to-navy-700',
    cardTint: 'bg-violet-50/95',
    cardRing: 'ring-sky-400',
    discBg: 'bg-violet-500',
    accentText: 'text-violet-800',
    motif: '🚀',
    nightRim: 'bg-violet-400',
    horizonGlow: 'rgba(167,139,250,0.15)',
  },
  /** CR-14: VieSchool brand surface - deep navy + gold (landing palette)
      for adult-facing surfaces (login, admin). */
  brand: {
    key: 'brand',
    nameVi: 'VieSchool',
    subtitleVi: '',
    pageGradient: 'bg-gradient-to-b from-[#0b1224] via-[#101a36] to-[#0b1224]',
    cardTint: 'bg-[#121b33]/90',
    cardRing: 'ring-amber-300/50',
    discBg: 'bg-amber-400',
    accentText: 'text-amber-300',
    motif: '✨',
    nightRim: 'bg-amber-400',
    horizonGlow: 'rgba(252,211,77,0.30)',
  },
};

const GRADE_TO_LAND: Record<string, LandKey> = {
  'grade-1': 'playground',
  'grade-2': 'town',
  'grade-3': 'jungle',
  'grade-4': 'city',
  'grade-5': 'space',
};

/** Returns the land for a grade id, or the neutral sky land. */
export function getLand(gradeId?: string | null): Land {
  const key = gradeId ? GRADE_TO_LAND[gradeId] : undefined;
  return LANDS[key ?? 'sky'];
}

/** kids-UX (AC-8.x): age band derived from the selected grade. G1-2 =
 *  voice-first UI (76px targets everywhere, autoplay instructions);
 *  G3-5 = denser text UI (44px floor on administrative controls). */
export type KidBand = 'G12' | 'G345';

export function bandForGrade(gradeId?: string | null): KidBand {
  return gradeId === 'grade-1' || gradeId === 'grade-2' ? 'G12' : 'G345';
}

/* ------------------------------------------------------------------ */
/* CR-82 (DESIGN-SPEC-v5 s6.4): scene palettes. Hex lives HERE - the    */
/* token home - and never inside scene/mascot components (FF-6).        */
/* `day` = the v4 LandScene fills verbatim; `dusk`/`night` are derived  */
/* by mixHex toward navy; `lights` are never mixed so windows/stars/    */
/* flames stay bright at night.                                       */
/* ------------------------------------------------------------------ */

export type SceneTone = 'day' | 'dusk' | 'night';

export interface ScenePalette {
  /** Two ground/hill stops (mixed by tone). */
  ground: [string, string];
  /** Non-light art fills, keyed by name (mixed by tone). */
  props: Record<string, string>;
  /** Bright elements (windows, stars, sun, flames) - never mixed. */
  lights: Record<string, string>;
}

const SCENE_BASE: Record<LandKey, ScenePalette> = {
  sky: {
    ground: ['#86efac', '#4ade80'],
    props: {
      cloud: '#ffffff',
      moonShadow: '#bae6fd',
      flower1: '#fb7185',
      flower2: '#fbbf24',
      flower3: '#38bdf8',
      flower4: '#f472b6',
      flowerCenter: '#ffffff',
    },
    lights: { sunRay: '#fde047', sun: '#fbbf24', sunCore: '#fde68a', moon: '#fef9c3', sparkle: '#ffffff' },
  },
  playground: {
    ground: ['#a3e635', '#65a30d'],
    props: {
      cloud: '#ffffff',
      moonShadow: '#bae6fd',
      swingFrame: '#92400e',
      swingChain: '#78350f',
      swingSeat1: '#f59e0b',
      swingSeat2: '#ef4444',
      slidePole: '#0ea5e9',
      slideRamp: '#38bdf8',
      slideTop: '#0284c7',
      ball: '#f43f5e',
      ballSeam: '#ffffff',
      flower1: '#fbbf24',
      flower2: '#fb7185',
      flower3: '#38bdf8',
      flowerCenter: '#ffffff',
    },
    lights: { sunRay: '#fde047', sun: '#fbbf24', sunCore: '#fde68a', moon: '#fef9c3', sparkle: '#ffffff' },
  },
  town: {
    ground: ['#cbd5e1', '#94a3b8'],
    props: {
      cloud: '#ffffff',
      moonShadow: '#bae6fd',
      house1: '#fda4af',
      house1Roof: '#e11d48',
      house2: '#fdba74',
      house2Roof: '#ea580c',
      house3: '#fde68a',
      house3Roof: '#d97706',
      // OM-6: indigo house -> orange
      house4: '#fdba74',
      house4Roof: '#c2410c',
      house5: '#6ee7b7',
      house5Roof: '#059669',
      house6: '#f9a8d4',
      house6Roof: '#db2777',
      door: '#7c2d12',
      treeTrunk: '#92400e',
      tree1: '#22c55e',
      tree2: '#4ade80',
    },
    lights: { sunRay: '#fde047', sun: '#fbbf24', sunCore: '#fde68a', moon: '#fef9c3', sparkle: '#ffffff', window: '#e0f2fe', roadDash: '#ffffff' },
  },
  jungle: {
    ground: ['#166534', '#14532d'],
    props: {
      cloud: '#ffffff',
      moonShadow: '#86efac',
      leaf1: '#15803d',
      leaf2: '#16a34a',
      leaf3: '#22c55e',
      vine: '#15803d',
      vineLeaf1: '#22c55e',
      vineLeaf2: '#4ade80',
      toucan: '#0f172a',
      toucanBeak: '#f97316',
      toucanEye: '#ffffff',
      flower1: '#f43f5e',
      flower2: '#fb923c',
      flower3: '#e879f9',
      flowerCenter: '#fde047',
    },
    lights: { moon: '#fef9c3', sparkle: '#fef9c3' },
  },
  city: {
    // OM-6: navy towers + amber windows (was an indigo ramp).
    ground: ['#334155', '#1e293b'],
    props: {
      cloud: '#ffffff',
      moonShadow: '#93c5fd',
      tower1: '#2a4a82',
      tower2: '#3b5280',
      tower3: '#075985',
      tower4: '#475569',
      road: '#334155',
      bus: '#f43f5e',
      busWindow: '#bae6fd',
      busWheel: '#1e293b',
    },
    lights: { window: '#fde68a', windowDim: '#cbd5e1', roadDash: '#fde047', moon: '#fef9c3', sparkle: '#ffffff' },
  },
  space: {
    // OM-6: moon-rock slate ground (was violet ramp); the one violet
    // nebula is emitted by the space art's Far layer at <=0.15 alpha.
    ground: ['#94a3b8', '#64748b'],
    props: {
      crater: '#64748b',
      planet1: '#f97316',
      planet1Ring: '#fdba74',
      planet2: '#38bdf8',
      planet2Dark: '#0ea5e9',
      planet2Light: '#7dd3fc',
      rocketBody: '#f1f5f9',
      rocketWindow: '#38bdf8',
      rocketWindowRing: '#94a3b8',
      rocketFin: '#ef4444',
      flagPole: '#e2e8f0',
      flag: '#f43f5e',
      flagDot: '#fde047',
      // the closed-inventory violet nebula (alpha <= 0.15 at render)
      nebula: '#a78bfa',
    },
    lights: { star: '#fefce8', rocketFlame: '#fbbf24' },
  },
  brand: {
    ground: ['#101a36', '#0b1224'],
    props: {
      cloud: '#ffffff',
      hill: '#162C55',
      /** CR-82 polish: layered journey-night terrain + trail props. */
      hillFar: '#1a2c50',
      hillNear: '#0e1830',
      fg: '#070d1c',
      tree: '#0a1120',
      pole: '#3b4a6b',
      moonShadow: '#101a36',
    },
    lights: {
      sparkle: '#fef9c3',
      goldStar: '#f2c957',
      starWhite: '#ffffff',
      moon: '#fef9c3',
      trail: '#f2c957',
      pennant: '#f59e0b',
      window: '#fde68a',
    },
  },
};

/** Linear hex mix: returns mix(a -> b, t) as #rrggbb (a at t=0). */
export function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace('#', '');
  const pb = b.replace('#', '');
  const ai = parseInt(pa, 16);
  const bi = parseInt(pb, 16);
  const ar = (ai >> 16) & 0xff;
  const ag = (ai >> 8) & 0xff;
  const ab = ai & 0xff;
  const br = (bi >> 16) & 0xff;
  const bg = (bi >> 8) & 0xff;
  const bb = bi & 0xff;
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(mix(ar, br))}${hex(mix(ag, bg))}${hex(mix(ab, bb))}`;
}

const NAVY_900 = '#101a36';
const NAVY_950 = '#0b1224';
const TONE_MIX: Record<SceneTone, { toward: string; t: number }> = {
  day: { toward: NAVY_900, t: 0 },
  dusk: { toward: NAVY_900, t: 0.3 },
  night: { toward: NAVY_950, t: 0.5 },
};

const paletteCache = new Map<string, ScenePalette>();

/**
 * Tone-derived scene palette (DESIGN-SPEC-v5 s6.4). `day` returns the
 * base fills unchanged; `dusk`/`night` mix `ground` + `props` toward
 * navy; `lights` pass through unmixed (windows/stars stay bright).
 * Unknown land keys resolve to the sky palette (spec s6.2 N3).
 */
export function scenePalette(land: LandKey, tone: SceneTone): ScenePalette {
  const key = `${land}:${tone}`;
  const cached = paletteCache.get(key);
  if (cached) return cached;
  const base = SCENE_BASE[land] ?? SCENE_BASE.sky;
  const { toward, t } = TONE_MIX[tone] ?? TONE_MIX.day;
  if (t === 0) {
    paletteCache.set(key, base);
    return base;
  }
  const mixed: ScenePalette = {
    ground: [mixHex(base.ground[0], toward, t), mixHex(base.ground[1], toward, t)],
    props: Object.fromEntries(
      Object.entries(base.props).map(([k, v]) => [k, mixHex(v, toward, t)]),
    ),
    lights: { ...base.lights },
  };
  paletteCache.set(key, mixed);
  return mixed;
}

/* ------------------------------------------------------------------ */
/* CR-82 (DESIGN-SPEC-v5 s9.2, D5): Bé Heo palette - the plum outline   */
/* stays so the character reads crisp on navy and paper alike. Both the */
/* static SVG renderer and the Lottie generator draw from this map.     */
/* ------------------------------------------------------------------ */

export const MASCOT_PALETTE = {
  outline: '#4A2E3F',
  skin: '#FFB3C7',
  ear: '#F58BA9',
  snout: '#FF9FBD',
  nostril: '#C2587E',
  blush: '#F2789F',
  tongue: '#E76E95',
  sheen: '#FFD3E0',
  mouth: '#7A3552',
  white: '#FFFFFF',
  /** Celebrating confetti accents (already used by PigFace). */
  confettiGold: '#FBBF24',
  confettiEmerald: '#34D399',
  confettiPink: '#F472B6',
  confettiSky: '#60A5FA',
} as const;
