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
 * Invariants encoded here (CR-73 amendment - band-based touch floors):
 *  - 76px minimum on G1-2 standalone controls; 64px on G3-5 standalone;
 *    48px floor for other kid controls; 44px adult; 36px chips in a row.
 *  - status colors keep their semantics: emerald = correct/go,
 *    rose = destructive/urgent status only (never answer-wrong - that is
 *    slate `feedback.wrong`), amber = warning/progress, sky = info,
 *    indigo = audio. Gold fills = reward + next-step only.
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

/** CR-69: compact NAV_PILL for account/administrative rows - same navy-glass
 * look, but floored at the 44px touch minimum instead of the primary 76px. */
export const NAV_PILL_SM =
  'inline-flex min-h-[44px] items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-amber-200 shadow-md ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15 hover:ring-amber-300/50 focus:outline-none focus:ring-4 focus:ring-amber-300/60';

/** Header chips for the active-play bar (round / timer / score) - navy glass. */
const CHIP_BASE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-base font-bold ring-1 backdrop-blur-sm';
export const CHIP_SKY = `${CHIP_BASE} bg-sky-500/15 text-sky-200 ring-sky-400/30`;
export const CHIP_AMBER = `${CHIP_BASE} bg-amber-500/15 text-amber-200 ring-amber-400/30`;
export const CHIP_AMBER_URGENT = `${CHIP_BASE} bg-rose-500/20 text-rose-200 ring-rose-400/40 animate-pulse motion-reduce:animate-none`;
export const CHIP_EMERALD = `${CHIP_BASE} bg-emerald-500/15 text-emerald-200 ring-emerald-400/30`;
/** Light gold "treasure" chip - needs DARK text on the light gradient
 * (CR-44: never reuse CHIP_AMBER's amber-200 text here - invisible). */
export const CHIP_GOLD = `${CHIP_BASE} bg-gradient-to-b from-amber-100 to-amber-200/90 text-amber-950 shadow-md ring-amber-300/80`;

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

/* ------------------------------------------------------------------ */
/* kids-UX redesign (design-spec-kids-ux s4.1 / ADR KUX-2)               */
/* Gold semantic discipline: gold = "the next step" OR "treasure just    */
/* earned". A screen may contain at most ONE gold action button.         */
/* ------------------------------------------------------------------ */

/** The one gold primary-path button on a kid screen ("Chơi", "Nhận quà").
 *  76px tall, wide, unmistakable. Never render two of these per screen. */
export const CTA_GOLD_XL =
  'inline-flex min-h-[76px] min-w-[240px] items-center justify-center rounded-3xl border-b-4 border-amber-600 bg-amber-400 px-8 text-2xl font-extrabold text-amber-950 shadow-lg shadow-amber-400/30 transition hover:bg-amber-300 active:translate-y-0.5 motion-reduce:active:translate-y-0 active:border-b-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 motion-reduce:transition-none';

/** Secondary exploration entry - quiet, never competes with CTA_GOLD_XL. */
export const DISCLOSURE_BTN =
  'inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full bg-white/10 px-4 text-sm font-bold text-sky-200 ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300';

/** Hub section tile (CR-73 `tile.hub` contract): paper pairs - the hub
 *  is a light paper panel inside the navy launchpad card. 96px for G1-2
 *  hands; G3-5 drops to 76px via TRAIL_TILE_SM. Focus ring sky-600
 *  (4.1:1 non-text on paper - sky-400 was 2.14:1, below the 3:1 floor). */
export const TRAIL_TILE =
  'flex min-h-[96px] w-full items-center gap-3 rounded-2xl border-b-4 border-sky-200 bg-sky-50 px-4 text-left text-lg font-bold text-slate-800 transition hover:bg-sky-100 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none';
export const TRAIL_TILE_SM =
  'flex min-h-[76px] w-full items-center gap-3 rounded-2xl border-b-4 border-sky-200 bg-sky-50 px-4 text-left text-base font-bold text-slate-800 transition hover:bg-sky-100 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none';
/** Expanded tile visual (contract "S" state): chevron rotates via
 *  markup swap; the tile keeps the selected wash + ring. */
export const TRAIL_TILE_EXPANDED = 'bg-sky-100 ring-1 ring-sky-400';

/** The light paper panel holding hub sections inside the navy
 *  launchpad card (CR-73 §5.1). Navy cards nested inside keep their
 *  `surface.raised` - the panel is a container, not a text surface. */
export const HUB_PANEL =
  'mt-4 rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-200 sm:p-5';

/** Drill / exam / advanced actions on the paper hub panel (CR-73 remap:
 *  indigo is `action.audio` only - exam entries now read in the navy
 *  exam register, drill/advanced as paper secondary). */
export const BTN_DRILL =
  'min-h-[64px] rounded-2xl bg-sky-100 px-4 font-bold text-sky-800 transition hover:bg-sky-200 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none';
export const BTN_EXAM =
  'min-h-[64px] rounded-2xl border-b-4 border-[#0b1224] bg-[#162C55] px-4 font-bold text-white transition hover:bg-[#1d3a6b] active:translate-y-0.5 motion-reduce:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none';
export const BTN_ADVANCED =
  'min-h-[64px] rounded-2xl border-2 border-sky-300 bg-white/70 px-4 font-bold text-sky-800 transition hover:bg-sky-50 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none';

/** Strong action row on paper (sky-700 + white = 5.93:1) - FormPicker
 *  "start this form" rows. */
export const BTN_PAPER_ACTION =
  'min-h-[44px] rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none';

/** Gift-box reward pick: three identical boxes, child taps one. */
export const GIFT_BOX =
  'flex min-h-[96px] min-w-[96px] items-center justify-center rounded-3xl border-4 border-amber-300 bg-amber-50 text-6xl shadow-md transition hover:scale-105 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 motion-reduce:transition-none motion-reduce:hover:scale-100';

/** Post-answer option states (AC-3.2): the picked-but-wrong tile is
 *  desaturated slate - NOT rose/red shaming; the reveal tile is the only
 *  emerald surface. Labels carry the meaning, color only reinforces. */
export const OPTION_PICKED_WRONG = 'bg-slate-200 text-slate-700 border-slate-400';
export const OPTION_REVEAL_CORRECT =
  'bg-emerald-100 text-emerald-900 border-emerald-500 ring-2 ring-emerald-300';

/** Parent-facing "paper" surfaces - light, calm, print-friendly (R5).
 *  Separated from the navy play chrome so a parent instantly reads
 *  "this part is for me". */
export const PAPER_PANEL = 'rounded-2xl bg-white p-5 text-slate-800 ring-1 ring-sky-200';
export const PAPER_ACCENT = 'text-sky-700';
export const PAPER_TREND_UP = 'text-emerald-600';
export const PAPER_PROGRESS_TRACK = 'h-2 overflow-hidden rounded-full bg-sky-200';
export const PAPER_PROGRESS_FILL = 'h-full rounded-full bg-sky-500';
export const PAPER_CHART = 'stroke-slate-600';

/** Parent gate keypad key - 64px squares, light paper surface. */
export const GATE_KEY =
  'min-h-[64px] min-w-[64px] rounded-2xl border-b-4 border-sky-300 bg-white text-2xl font-bold text-slate-800 transition hover:bg-sky-50 active:translate-y-0.5 motion-reduce:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-reduce:transition-none';
export const BTN_PAPER_SECONDARY =
  'min-h-[64px] rounded-xl bg-sky-100 px-4 font-bold text-sky-800 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 motion-reduce:transition-none';
export const COPY_BTN =
  'inline-flex min-h-[48px] items-center justify-center gap-1 rounded-xl bg-slate-100 px-4 font-semibold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300';

/** Exam hybrid brand (R7): exam interior keeps its IOE mono look; the
 *  only brand injection is this small badge in the exam header. */
export const EXAM_HEADER_BRAND =
  'inline-flex items-center gap-1 rounded-full bg-[#0b1224] px-3 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-300/40';

/* ------------------------------------------------------------------ */
/* CR-73 semantic layer - exam surface (exam.card/exam.line primitives). */
/* Exam gold remediation: NO amber fills inside the exam hall - gold is  */
/* reward/next-step only. exam.selected = orange RING + light text (the */
/* old orange-500 fill + white text failed at 2.80:1).                   */
/* ------------------------------------------------------------------ */

/** exam.option + exam aux keys (T/F, extra-letter, `exam-tile-*`
 *  word-order tiles): non-gold exam.card fill, focus ring, 64px floor. */
export const EXAM_OPTION =
  'min-h-[64px] rounded-xl bg-[#16232e] px-4 py-3 font-bold text-white ring-1 ring-[#22303d] transition hover:bg-[#132433] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 active:translate-y-0.5 motion-reduce:active:translate-y-0 motion-reduce:transition-none';
/** exam.selected state - apply alongside EXAM_OPTION when picked. */
export const EXAM_SELECTED = 'ring-2 ring-orange-500 text-orange-200';
/** exam.navStrip cell (question strip `exam-nav-*`): 48px floor. */
export const EXAM_NAV_CELL =
  'flex h-12 w-12 items-center justify-center rounded-lg bg-[#16232e] text-sm font-bold text-white ring-1 ring-[#22303d] transition hover:bg-[#132433] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60';
/** answered strip cell - status.success translucent + check icon in
 *  markup (8.11:1 on exam.card, never color-alone). */
export const EXAM_NAV_ANSWERED = 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40';

/** action.audio (navy variant) - indigo = audio, interactive only.
 *  `exam-listen` and every Nghe-mẫu control maps here. */
export const BTN_AUDIO =
  'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-indigo-500/20 px-4 py-2 font-bold text-indigo-200 ring-1 ring-indigo-400/40 transition hover:bg-indigo-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none';

/** action.secondary on navy surfaces (white/10 + sky-200 = 9.19:1).
 *  Used for all reclassified card buttons inside navy CARDs. */
export const BTN_SECONDARY_NAVY =
  'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 font-bold text-sky-200 ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none';

/** action.secondary on paper surfaces (sky-100 + sky-800 = 6.59:1). */
export const BTN_SECONDARY_PAPER =
  'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-sky-100 px-4 py-2.5 font-bold text-sky-800 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none';

/** reward.earned - the only gold gradient allowed off `action.primary`
 *  paths (pet evolve congrats, quest claim). Reward, not navigation. */
export const BTN_REWARD_EARNED =
  'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2.5 font-extrabold text-amber-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100';
