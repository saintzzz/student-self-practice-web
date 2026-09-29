/**
 * CR-10 "Hanh trinh cua Be Heo" land theming (design-spec s16.1).
 * One adventure world: each grade is a land with its own palette,
 * scene motif and Vietnamese name. Non-grade surfaces (login, admin,
 * credits) use the neutral `sky` land so every screen belongs to the
 * same world. Pure descriptor map - no DOM here.
 */

export type LandKey = 'sky' | 'playground' | 'town' | 'jungle' | 'city' | 'space';

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
  },
  city: {
    key: 'city',
    nameVi: 'Thành phố',
    subtitleVi: 'Vùng đất 4',
    pageGradient: 'bg-gradient-to-b from-indigo-400 via-indigo-200 to-rose-100',
    cardTint: 'bg-indigo-50/95',
    cardRing: 'ring-indigo-400',
    discBg: 'bg-indigo-500',
    accentText: 'text-indigo-800',
    motif: '🏙️',
  },
  space: {
    key: 'space',
    nameVi: 'Vũ trụ',
    subtitleVi: 'Vùng đất 5',
    pageGradient: 'bg-gradient-to-b from-indigo-900 via-violet-800 to-indigo-950',
    cardTint: 'bg-indigo-50/95',
    cardRing: 'ring-violet-400',
    discBg: 'bg-violet-500',
    accentText: 'text-violet-800',
    motif: '🚀',
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
