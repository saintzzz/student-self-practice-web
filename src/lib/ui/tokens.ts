/**
 * CR-09 app-level design tokens (design-spec section 14). Single source
 * of truth for the "playful classroom" look: surfaces, type, chips and
 * entry motion. Components import these constants instead of spelling
 * out ad-hoc palette/radius classes - same pattern the codebase already
 * uses in actionButtonStyle.ts / optionButtonStyle.ts, widened to the
 * full surface.
 *
 * CR-11 (design-spec s17): premium finish - subtle card gradients,
 * glassy chips, gold score pills, tighter display type.
 *
 * Invariants encoded here (do not relax):
 *  - 76px minimum interactive targets on anything touched alone.
 *  - status colors keep their semantics: emerald = correct/go,
 *    rose = wrong, amber = progress/score, sky = info, indigo = audio.
 *  - every animation is transform/opacity and pairs with
 *    motion-reduce:animate-none.
 */

/** CR-16: the whole play surface now rides the VieSchool navy/gold brand
    (same family as CARD_DARK used on login/admin since CR-14). Status
    colors keep their semantics on dark: emerald = correct, rose = wrong,
    amber = progress/score. */
export const CARD =
  'rounded-3xl bg-gradient-to-b from-[#162C55] to-[#0E1F42] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_20px_40px_-16px_rgba(0,0,0,0.6),0_8px_16px_-8px_rgba(0,0,0,0.4)] ring-1 ring-[#2a3a5e] sm:p-8';

/** CR-14: VieSchool dark card - navy glass + gold ring for brand
    surfaces (login/admin) matching the vieschool.com landing. */
export const CARD_DARK =
  'rounded-3xl bg-[#121b33]/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_40px_-16px_rgba(0,0,0,0.6),0_8px_16px_-8px_rgba(0,0,0,0.4)] ring-1 ring-[#2a3a5e] backdrop-blur-sm sm:p-8';

export const NAV_PILL_DARK =
  'inline-flex min-h-[76px] items-center justify-center rounded-full bg-white/10 px-6 py-3 text-lg font-bold text-amber-200 shadow-md ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 hover:ring-amber-300/50 focus:outline-none focus:ring-4 focus:ring-amber-300/60 [@media(max-height:420px)]:min-h-0';

/** Tinted card variant for feedback/summary accents (CR-16 dark tints). */
export const CARD_TINT = {
  emerald: 'rounded-3xl bg-emerald-500/15 p-5 ring-1 ring-emerald-400/40',
  rose: 'rounded-3xl bg-rose-500/15 p-5 ring-1 ring-rose-400/40',
  amber: 'rounded-3xl bg-amber-500/15 p-5 ring-1 ring-amber-400/40',
  sky: 'rounded-3xl bg-sky-500/15 p-5 ring-1 ring-sky-400/40',
} as const;

/** Type tokens - display font on headings/numbers, system for body. */
export const H1 = 'font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl';
export const H2 = 'font-display text-xl font-bold tracking-tight text-white';
export const PROMPT = 'text-xl text-amber-100';
export const BODY = 'text-lg text-slate-300';

/** Ghost navigation pills ("Quay lai", "Nguon hinh anh") - navy glass. */
export const NAV_PILL =
  'inline-flex min-h-[76px] items-center justify-center rounded-full bg-white/10 px-6 py-3 text-lg font-bold text-amber-200 shadow-md ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 hover:ring-amber-300/50 focus:outline-none focus:ring-4 focus:ring-amber-300/60 [@media(max-height:420px)]:min-h-0';

/** Header chips for the active-play bar (round / timer / score) - navy glass. */
const CHIP_BASE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-base font-bold ring-1 backdrop-blur-sm';
export const CHIP_SKY = `${CHIP_BASE} bg-sky-500/15 text-sky-200 ring-sky-400/30`;
export const CHIP_AMBER = `${CHIP_BASE} bg-amber-500/15 text-amber-200 ring-amber-400/30`;
export const CHIP_AMBER_URGENT = `${CHIP_BASE} bg-rose-500/20 text-rose-200 ring-rose-400/40 animate-pulse motion-reduce:animate-none`;
export const CHIP_EMERALD = `${CHIP_BASE} bg-emerald-500/15 text-emerald-200 ring-emerald-400/30`;

/** Gold gradient score pills - the "treasure" look on summary screens. */
export const SCORE_PILL =
  'inline-flex items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-2 font-display text-xl font-extrabold text-amber-950 shadow-[0_6px_16px_-4px_rgba(245,158,11,0.55)] ring-4 ring-amber-200/80';
export const SCORE_PILL_LG =
  'inline-flex items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-3 font-display text-4xl font-extrabold text-amber-950 shadow-[0_10px_24px_-6px_rgba(245,158,11,0.6)] ring-4 ring-amber-200/80';

/** Round progress track: navy track + gold gradient fill. */
export const PROGRESS_TRACK =
  'h-3 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur-sm';
export const PROGRESS_FILL =
  'relative h-full overflow-hidden rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-300 motion-reduce:transition-none';

/** Screen enter animation - fade + 8px rise, transform/opacity only. */
export const SCREEN_ENTER = 'animate-screen-enter motion-reduce:animate-none';
