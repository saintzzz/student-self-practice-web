/**
 * CR-09 app-level design tokens (design-spec section 14). Single source
 * of truth for the "playful classroom" look: surfaces, type, chips and
 * entry motion. Components import these constants instead of spelling
 * out ad-hoc palette/radius classes - same pattern the codebase already
 * uses in actionButtonStyle.ts / optionButtonStyle.ts, widened to the
 * full surface.
 *
 * Invariants encoded here (do not relax):
 *  - 76px minimum interactive targets on anything touched alone.
 *  - status colors keep their semantics: emerald = correct/go,
 *    rose = wrong, amber = progress/score, sky = info, indigo = audio.
 *  - every animation is transform/opacity and pairs with
 *    motion-reduce:animate-none.
 */

/** Big white content card - the "scene" each screen lives in. */
export const CARD =
  'rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200/60 sm:p-8';

/** Tinted card variant for feedback/summary accents. */
export const CARD_TINT = {
  emerald: 'rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200',
  rose: 'rounded-3xl bg-rose-50 p-5 ring-1 ring-rose-200',
  amber: 'rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200',
  sky: 'rounded-3xl bg-sky-50 p-5 ring-1 ring-sky-200',
} as const;

/** Type tokens - display font on headings/numbers, system for body. */
export const H1 = 'font-display text-4xl font-extrabold text-sky-900';
export const H2 = 'font-display text-xl font-bold text-sky-900';
export const PROMPT = 'text-xl text-sky-700';
export const BODY = 'text-lg text-slate-700';

/** Ghost navigation pills ("Quay lai", "Nguon hinh anh"). */
export const NAV_PILL =
  'inline-flex min-h-[76px] items-center justify-center rounded-full bg-white px-6 py-3 text-lg font-bold text-sky-700 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-50 hover:ring-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-400 [@media(max-height:420px)]:min-h-0';

/** Header chips for the active-play bar (round / timer / score). */
const CHIP_BASE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-base font-bold ring-1';
export const CHIP_SKY = `${CHIP_BASE} bg-sky-50 text-sky-800 ring-sky-200`;
export const CHIP_AMBER = `${CHIP_BASE} bg-amber-50 text-amber-800 ring-amber-200`;
export const CHIP_AMBER_URGENT = `${CHIP_BASE} bg-rose-50 text-rose-700 ring-rose-300 animate-pulse motion-reduce:animate-none`;
export const CHIP_EMERALD = `${CHIP_BASE} bg-emerald-50 text-emerald-800 ring-emerald-200`;

/** Round progress track: outer rounded track + sky gradient fill. */
export const PROGRESS_TRACK =
  'h-3 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-sky-100 ring-1 ring-sky-200';
export const PROGRESS_FILL =
  'h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-300 motion-reduce:transition-none';

/** Screen enter animation - fade + 8px rise, transform/opacity only. */
export const SCREEN_ENTER = 'animate-screen-enter motion-reduce:animate-none';
