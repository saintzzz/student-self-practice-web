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
  'inline-flex min-h-[76px] min-w-[240px] items-center justify-center rounded-3xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 px-8 text-2xl font-extrabold text-amber-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(180,83,9,0.35),0_6px_0_#b45309,0_16px_24px_-10px_rgba(245,158,11,0.55)] transition hover:brightness-105 active:translate-y-[6px] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(180,83,9,0.35),0_0_0_#b45309] data-[pressed]:translate-y-[6px] data-[pressed]:shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(180,83,9,0.35),0_0_0_#b45309] motion-reduce:active:translate-y-0 motion-reduce:data-[pressed]:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 motion-reduce:transition-none';

/** Secondary exploration entry - quiet, never competes with CTA_GOLD_XL. */
export const DISCLOSURE_BTN =
  'inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full bg-white/10 px-4 text-sm font-bold text-sky-200 ring-1 ring-white/15 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300';

/** CR-85 redesign: hub tiles are DESTINATION cards - each carries its
 *  own gradient identity on the navy board (Lingokids zone-card idiom)
 *  instead of identical pale-paper rows. White text + frosted icon chip
 *  keep contrast on every hue; the per-tile emoji watermark adds the
 *  illustration layer. 96px for G1-2 hands; G3-5 drops to 76px. */
export type HubTone = 'sky' | 'orange' | 'emerald' | 'amber' | 'rose';

/* Candy-bright 300->500 surfaces carry NAVY text only. White fails AA
 * on these hues (~1.9:1); slate-900 vs the darkest endpoint (rose-500)
 * measures ~4.9:1 - AA for small copy. 600 endpoints would drop to
 * ~3.8:1, so the palette stops at 500 and the depth edge is -600. */
const HUB_TILE_BASE =
  'relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border-b-4 px-4 text-left font-bold text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_10px_22px_-10px_rgba(0,0,0,0.5)] transition hover:brightness-105 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 motion-reduce:transition-none';

const HUB_TONE_STYLES: Record<HubTone, { border: string; gradient: string }> = {
  sky: { border: 'border-sky-600', gradient: 'bg-gradient-to-br from-sky-300 to-sky-500' },
  orange: { border: 'border-orange-600', gradient: 'bg-gradient-to-br from-orange-300 to-orange-500' },
  emerald: { border: 'border-emerald-600', gradient: 'bg-gradient-to-br from-emerald-300 to-emerald-500' },
  amber: { border: 'border-amber-600', gradient: 'bg-gradient-to-br from-amber-300 to-amber-500' },
  rose: { border: 'border-rose-600', gradient: 'bg-gradient-to-br from-rose-300 to-rose-500' },
};

export function hubTileClass(tone: HubTone, minH: 96 | 76): string {
  const s = HUB_TONE_STYLES[tone];
  return `${HUB_TILE_BASE} ${s.border} ${s.gradient} ${minH === 96 ? 'min-h-[96px] text-lg' : 'min-h-[76px] text-base'}`;
}

/** Expanded tile state on a colored surface: brighten + white ring. */
export const HUB_TILE_EXPANDED = 'brightness-110 ring-2 ring-white/60';

/** The hub's container inside the navy launchpad card. CR-81 S6:
 *  de-nested - the paper tile rows sit directly on the navy board
 *  instead of a card-in-card panel. */
export const HUB_PANEL = 'mt-4';

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

/** action.audio on navy - quiet board-blue face, amber ring hint.
 *  `exam-listen` and every Nghe-mẫu control maps here. CR-81: indigo
 *  removed from the palette - audio reads as a board control. */
export const BTN_AUDIO =
  'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-[#1d3465] px-4 py-2 font-bold text-sky-100 ring-1 ring-[#3b5280] transition hover:bg-[#24406f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none';

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
  'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2.5 font-extrabold text-amber-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 data-[pressed]:translate-y-0 data-[pressed]:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 motion-reduce:data-[pressed]:scale-100';

/* ------------------------------------------------------------------ */
/* CR-79 "toy-block" depth layer (DESIGN-SPEC-v3 s3)                    */
/* Tactile pressed-depth on navy play surfaces ONLY - exam.* surfaces   */
/* and paper parent surfaces never use these.                           */
/* ------------------------------------------------------------------ */

export const scene = {
  /** Layered depth glow behind the practice play surface. */
  glow: 'bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgba(56,89,165,0.38),transparent),radial-gradient(ellipse_50%_40%_at_15%_100%,rgba(245,158,11,0.10),transparent)]',
  /** CR-82 hero scene (DESIGN-SPEC-v5 s5.1). */
  root: 'pointer-events-none fixed inset-0 z-0 overflow-hidden',
  skyDusk: 'bg-gradient-to-b from-navy-950 via-navy-900 to-navy-700',
  skyNight: 'bg-gradient-to-b from-navy-950 via-navy-950 to-navy-800',
  horizonGold:
    'bg-[radial-gradient(90%_38%_at_50%_100%,rgba(251,191,36,0.28),transparent_70%)]',
  horizonGoldNight:
    'bg-[radial-gradient(90%_38%_at_50%_100%,rgba(251,191,36,0.14),transparent_70%)]',
  scrim:
    'bg-[radial-gradient(62%_52%_at_50%_44%,rgba(11,18,36,0.55),transparent_76%)]',
  layer:
    'scene-layer absolute inset-x-[-8%] bottom-0 will-change-transform transition-transform duration-700 ease-out-quint motion-reduce:transition-none',
} as const;

export const toy = {
  /** Toy-block face: gradient + top sheen + solid offset base. Border
   *  color is deliberately NOT baked in - callers add `border-[#2a3a5e]`
   *  or a `toy.tints[i]` tint so the two never fight. */
  face: 'bg-gradient-to-b from-[#1d3465] to-[#162C55] ' +
    'shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_5px_0_#0a1730]',
  faceHover:
    'hover:border-amber-400/70 hover:-translate-y-0.5 ' +
    'hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_7px_0_#0a1730] motion-reduce:hover:translate-y-0',
  /** Press = sink 5px into the base. Under reduced-motion the sink is
   *  flattened; the shadow swap still gives press feedback. */
  pressed:
    'active:translate-y-[5px] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_0_0_#0a1730] ' +
    'motion-reduce:transition-none motion-reduce:active:translate-y-0',
  correctGlow:
    'shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_0_0_3px_rgba(52,211,153,0.55),0_0_18px_rgba(52,211,153,0.45)]',
} as const;

/** @deprecated superseded by hubTileClass + HUB_CHIP (CR-85 redesign). */
export const HUB_ICON_TINTS = [
  'bg-sky-200/80 text-sky-700',
  'bg-rose-200/80 text-rose-700',
  'bg-amber-200/80 text-amber-800',
  'bg-emerald-200/80 text-emerald-700',
] as const;

/** Scroll-safe vertical centering for question-kind roots (CR-79 s4):
 *  centers content when the card has spare height, scrolls when floors
 *  exceed the available height - tiles never compress. */
export const QUESTION_BODY =
  'flex min-h-0 flex-1 flex-col overflow-y-auto';
export const QUESTION_BODY_CENTER = 'my-auto w-full';

/* ------------------------------------------------------------------ */
/* CR-81 "night journey" board language (DESIGN-SPEC-v4)                */
/* ------------------------------------------------------------------ */

/** QuestionBanner: left-aligned speech-scroll strip carrying the
 *  instruction. Slate-on-slate - amber stays reserved for reward/
 *  progress markers (S10). */
export const QUESTION_BANNER =
  'mb-3 flex w-full items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-2.5 text-left ring-1 ring-white/10';

/** Exhibit frame: the light inner panel an emoji/image prompt or option
 *  sits inside - a "polaroid pinned to the board" instead of a bare
 *  emoji floating on navy (S3). Wrap the visual, never the button. */
export const EXHIBIT =
  'inline-block rounded-2xl bg-slate-50/95 px-3 py-1.5 shadow-[inset_0_2px_6px_rgba(15,23,42,0.15),0_1px_0_rgba(255,255,255,0.12)]';
/** Slight alternating tilt so exhibits look hand-pinned, not templated
 *  - applied by index parity, transform-only. */
export const EXHIBIT_TILT = ['-rotate-[1.5deg]', 'rotate-[1.5deg]'] as const;

/* ------------------------------------------------------------------ */
/* CR-82 (DESIGN-SPEC-v5) - material layer, type layer, exam paper,     */
/* drag/tracing/flashcard tokens. Contrast pairs are recorded per       */
/* token row in the spec (measured on the composited surface).          */
/* ------------------------------------------------------------------ */

/** CR-82 s5.2 material.* - soft-3D toy surfaces on navy. */
export const material = {
  /** The play board itself (e3). */
  board:
    'rounded-[2rem] bg-gradient-to-b from-navy-800 to-navy-850 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-2px_0_rgba(0,0,0,0.25),0_32px_64px_-24px_rgba(0,0,0,0.75),0_12px_24px_-12px_rgba(0,0,0,0.5)]',
  /* CR-82 polish: the tile family reads as cream "Scrabble"/letter tiles
     on the navy board - light face + dark ink pops the affordance and
     matches the exam paper material (Duolingo/Reading Eggs idiom). */
  tileFace:
    'rounded-[1.25rem] border-2 border-amber-200/90 bg-gradient-to-b from-white via-amber-50 to-amber-100/80 text-slate-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-3px_0_rgba(146,64,14,0.14),0_6px_0_#c99a4e,0_14px_20px_-10px_rgba(0,0,0,0.6)]',
  tileHover:
    '[@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-amber-400 [@media(hover:hover)]:hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-3px_0_rgba(146,64,14,0.14),0_8px_0_#c99a4e,0_18px_24px_-10px_rgba(0,0,0,0.6)] motion-reduce:hover:translate-y-0',
  tilePress:
    'active:translate-y-[6px] active:shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-3px_0_rgba(146,64,14,0.14),0_0_0_#c99a4e] data-[pressed]:translate-y-[6px] data-[pressed]:shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-3px_0_rgba(146,64,14,0.14),0_0_0_#c99a4e] transition-[transform,box-shadow] duration-100 ease-out-quint motion-reduce:active:translate-y-0 motion-reduce:data-[pressed]:translate-y-0',
  tileDisabled:
    'cursor-not-allowed opacity-50 saturate-50 shadow-[0_2px_0_#c99a4e]',
  tileFocus:
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70',
  tileCorrect:
    'border-emerald-400 bg-gradient-to-b from-emerald-500/30 to-emerald-600/20 text-emerald-100 shadow-[inset_0_2px_0_rgba(255,255,255,0.18),0_6px_0_#065f46,0_0_22px_rgba(52,211,153,0.45)]',
  /** Kept reveal state (light surface, emerald-900 on emerald-100). */
  tileRevealCorrect: OPTION_REVEAL_CORRECT,
  /** Sunk slate "that one, done" (kept pairing) + pressed-in depth. */
  tilePickedWrong: `${OPTION_PICKED_WRONG} translate-y-[4px] shadow-none`,
  /** Warm paper exhibit - replaces slate-50/95 EXHIBIT for play. */
  exhibitPaper:
    'inline-block rounded-2xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200/70 shadow-[inset_0_1px_0_#ffffff,inset_0_-6px_12px_-8px_rgba(146,64,14,0.18),0_4px_10px_-4px_rgba(0,0,0,0.45)]',
  /** Warm paper slate - tracing + flashcard front. */
  paperSlate:
    'rounded-[2rem] bg-amber-50 ring-1 ring-amber-200 shadow-[inset_0_2px_0_#ffffff,0_8px_0_rgba(146,64,14,0.45),0_24px_48px_-20px_rgba(0,0,0,0.7)]',
  /** Gold CTA material (folds into CTA_GOLD_XL; kept for composites). */
  goldCta:
    'rounded-3xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(180,83,9,0.35),0_6px_0_#b45309,0_16px_24px_-10px_rgba(245,158,11,0.55)]',
  /** Play chrome strip - tokenizes the inline BatchScreen bar. */
  chrome:
    'rounded-2xl bg-navy-chrome/85 ring-1 ring-navy-rim backdrop-blur-md shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6),0_4px_12px_-6px_rgba(0,0,0,0.4)] sm:rounded-full',
} as const;

/* ---------------- CR-82 s5.3 type layer ---------------- */

/** Geometry tokens - face/size/weight/leading, NO color. Components
 *  never import these directly (FF-2b); only composites below. */
export const TYPE_HERO_GLYPH_GEO =
  'font-display text-7xl font-extrabold leading-[1.1] sm:text-8xl [@media(max-height:420px)]:text-5xl';
export const TYPE_CARD_GLYPH_GEO =
  'font-display text-6xl font-extrabold leading-[1.1]';
export const TYPE_HERO_NUMBER_GEO =
  'font-display text-6xl font-extrabold leading-none tabular-nums';
export const TYPE_SECTION_GEO =
  'font-display text-2xl font-bold leading-tight tracking-tight';
export const TYPE_PROMPT_GEO_G12 = 'text-2xl font-bold leading-snug';
export const TYPE_PROMPT_GEO_G345 = 'text-xl font-bold leading-snug';
export const TYPE_INSTRUCTION_GEO = 'text-base font-medium leading-normal sm:text-lg';
export const TYPE_BODY_GEO = 'text-base font-normal leading-relaxed';
export const TYPE_CAPTION_GEO = 'text-sm font-medium leading-snug';
export const TYPE_IPA_GEO = 'font-mono text-sm font-medium leading-snug';
export const TYPE_LETTER_TILE_GEO = 'font-letter text-3xl font-bold leading-none';
export const TYPE_LETTER_CARD_GEO = 'font-letter text-6xl font-bold leading-[1.1]';
export const TYPE_LETTER_WORD_GEO = 'font-letter text-3xl font-bold leading-snug';
/** tabular-nums utility - the ONLY token allowed next to a composite. */
export const TYPE_NUMERAL = 'tabular-nums';

/** Ink tokens - one per surface class. */
export const INK_NAVY = 'text-white';
export const INK_NAVY_SOFT = 'text-slate-100';
export const INK_NAVY_MUTED = 'text-slate-300';
export const INK_NAVY_IPA = 'text-sky-200';
export const INK_NAVY_HERO =
  'text-amber-100 drop-shadow-[0_3px_0_rgba(0,0,0,0.35)]';
export const INK_PAPER = 'text-slate-900';
export const INK_PAPER_SOFT = 'text-slate-700';
export const INK_PAPER_HERO = 'text-navy-800';

/** Surface composites - the only type tokens components import. */
export const TYPE_HERO_GLYPH_NAVY = `${TYPE_HERO_GLYPH_GEO} ${INK_NAVY_HERO}`;
export const TYPE_CARD_GLYPH_PAPER = `${TYPE_CARD_GLYPH_GEO} ${INK_PAPER_HERO}`;
export const TYPE_HERO_NUMBER_NAVY = `${TYPE_HERO_NUMBER_GEO} ${INK_NAVY}`;
export const TYPE_HERO_NUMBER_PAPER = `${TYPE_HERO_NUMBER_GEO} ${INK_PAPER_HERO}`;
export const TYPE_PROMPT_NAVY_G12 = `${TYPE_PROMPT_GEO_G12} ${INK_NAVY}`;
export const TYPE_PROMPT_NAVY_G345 = `${TYPE_PROMPT_GEO_G345} ${INK_NAVY}`;
export const TYPE_PROMPT_PAPER_G12 = `${TYPE_PROMPT_GEO_G12} ${INK_PAPER}`;
export const TYPE_PROMPT_PAPER_G345 = `${TYPE_PROMPT_GEO_G345} ${INK_PAPER}`;
export const TYPE_INSTRUCTION_NAVY = `${TYPE_INSTRUCTION_GEO} ${INK_NAVY_SOFT}`;
export const TYPE_SECTION_NAVY = `${TYPE_SECTION_GEO} ${INK_NAVY}`;
export const TYPE_SECTION_PAPER = `${TYPE_SECTION_GEO} ${INK_PAPER}`;
export const TYPE_BODY_NAVY = `${TYPE_BODY_GEO} ${INK_NAVY_MUTED}`;
export const TYPE_BODY_PAPER = `${TYPE_BODY_GEO} ${INK_PAPER_SOFT}`;
export const TYPE_CAPTION_NAVY = `${TYPE_CAPTION_GEO} ${INK_NAVY_MUTED}`;
export const TYPE_CAPTION_PAPER = `${TYPE_CAPTION_GEO} ${INK_PAPER_SOFT}`;
export const TYPE_IPA_NAVY = `${TYPE_IPA_GEO} ${INK_NAVY_IPA}`;
export const TYPE_LETTER_TILE_NAVY = `${TYPE_LETTER_TILE_GEO} ${INK_NAVY}`;
export const TYPE_LETTER_TILE_PAPER = `${TYPE_LETTER_TILE_GEO} ${INK_PAPER}`;
export const TYPE_LETTER_CARD_NAVY = `${TYPE_LETTER_CARD_GEO} ${INK_NAVY}`;
export const TYPE_LETTER_WORD_PAPER = `${TYPE_LETTER_WORD_GEO} ${INK_PAPER}`;
export const TYPE_TITLE = H1;

/** v4 name kept as an alias (fixes D1: font-black -> font-extrabold). */
export const DISPLAY_GLYPH = TYPE_HERO_GLYPH_NAVY;

/* ---------------- CR-82 s10 exam paper tokens ---------------- */

export const EXAM_DESK = 'flex min-h-screen flex-col bg-desk p-2 text-white sm:p-4';
export const EXAM_SHEET =
  'mx-auto my-3 w-full max-w-3xl flex-1 rounded-[1.25rem] bg-slate-50 p-5 text-slate-800 ring-1 ring-slate-200 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_24px_48px_-24px_rgba(0,0,0,0.8)] sm:p-8';
export const EXAM_SHEET_HEADER =
  'mb-5 flex items-baseline justify-between border-b-2 border-slate-200 pb-3 font-display text-lg font-bold text-slate-700';
export const EXAM_QNUM =
  'mr-2 inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-navy-800 px-2 font-display text-base font-extrabold text-white tabular-nums';
export const EXAM_OPTION_PAPER =
  'flex min-h-[64px] w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left font-medium text-slate-800 ring-1 ring-slate-300 shadow-sm transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-600 motion-reduce:transition-none';
export const EXAM_OPTION_KEY =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700';
export const EXAM_SELECTED_PAPER = 'bg-sky-100 text-sky-900 ring-2 ring-sky-600';
export const EXAM_SELECTED_KEY_PAPER = 'bg-sky-700 text-white';
export const EXAM_NAV_FLAGGED = 'bg-amber-100 text-amber-900 ring-amber-400';
export const EXAM_NAV_CELL_PAPER =
  'h-12 w-12 rounded-lg bg-white text-slate-700 ring-1 ring-slate-300';
export const EXAM_NAV_ANSWERED_PAPER =
  'bg-emerald-50 text-emerald-800 ring-emerald-400';
export const EXAM_TIMER =
  'inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-desk-well px-3 font-mono text-xl font-extrabold tabular-nums text-amber-300 sm:text-2xl';
export const EXAM_TIMER_URGENT = 'bg-rose-600 text-white';
export const EXAM_VERDICT_CORRECT =
  'rounded-xl border-l-4 border-emerald-600 bg-emerald-50 p-4 text-emerald-800';
export const EXAM_VERDICT_WRONG =
  'rounded-xl border-l-4 border-slate-400 bg-slate-100 p-4 text-slate-700';
export const EXAM_RING_LABEL = 'tabular-nums text-sm font-extrabold text-white';
/** The ONE gold action in the untimed practice sitting (N1): CTA_GOLD_XL
 *  geometry; G3-5 tightens to min-h-64 via `!min-h-[64px]` in the
 *  component (G1-2 keeps the 76px floor). Never rendered in the timed
 *  exam sitting. */
export const EXAM_PRACTICE_NEXT = `${CTA_GOLD_XL} min-w-[200px]`;
/** Paper ghost for "Đánh dấu câu này" + sheet nav buttons - secondary
 *  chrome inside EXAM_SHEET (sky-800 on sky-100, 6.59:1). */
export const EXAM_SHEET_BTN =
  'inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-sky-100 px-4 py-2 font-bold text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none';

/* ---------------- CR-82 s13 drag tokens ---------------- */

export const SPELL_SLOT =
  'flex h-[76px] min-w-[48px] max-w-[64px] flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-sky-300/70 bg-navy-900/60';
export const SPELL_SLOT_TARGET =
  'border-solid border-amber-300 ring-4 ring-amber-300/40';
export const SPELL_SLOT_FILLED = 'border-solid';
export const SPELL_TILE = `${material.tileFace} h-[76px] w-[64px] ${TYPE_LETTER_TILE_PAPER}`;
export const WORD_CHIP = `${material.tileFace} min-h-[76px] px-5 text-xl font-bold`;
export const GAP_INPUT_TOGGLE = `${BTN_SECONDARY_NAVY} min-h-[48px]`;
export const SENTENCE_GAP =
  'inline-flex min-h-[56px] min-w-[7ch] items-center justify-center rounded-xl border-2 border-dashed border-sky-300/70 bg-navy-900/60 px-3 align-middle';
export const DRAG_GHOST =
  `${material.tileFace} scale-[1.08] rotate-[3deg] shadow-[0_28px_48px_-16px_rgba(0,0,0,0.75)]`;

/* ---------------- CR-82 s12 tracing tokens ---------------- */

export const TRACE_RULE = 'stroke-amber-200';
export const TRACE_RULE_BASE = 'stroke-slate-400';
export const TRACE_TRACK = 'stroke-amber-200';
export const TRACE_CENTERLINE = 'stroke-slate-500';
export const TRACE_START = 'fill-emerald-700';
export const TRACE_ARROW = 'stroke-slate-500';
export const TRACE_INK = '#0369a1'; // sky-700 - canvas strokeStyle
export const TRACE_DONE = 'stroke-emerald-600';

/* ---------------- CR-82 s14 flashcard tokens ---------------- */

export const FLASH_CARD = `${material.paperSlate} relative aspect-[3/4] w-[min(84vw,360px)] [perspective:1200px]`;
export const FLASH_FLIP =
  'absolute inset-0 rounded-[2rem] [transform-style:preserve-3d] transition-transform duration-400 ease-in-out-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-600 motion-reduce:transition-none';
export const FLASH_FLIP_BACK = '[transform:rotateY(180deg)]';
export const FLASH_FACE_FRONT =
  'absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 [backface-visibility:hidden] text-slate-900';
export const FLASH_FACE_BACK =
  'absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] bg-gradient-to-b from-navy-800 to-navy-850 text-white [transform:rotateY(180deg)] [backface-visibility:hidden]';
export const FLASH_SWIPE_LABEL_KNOWN =
  'absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-1 text-lg font-extrabold text-white';
export const FLASH_SWIPE_LABEL_AGAIN =
  'absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-slate-700 px-3 py-1 text-lg font-extrabold text-white';
/* Deck decisions sit over the busy land vignette - they must be SOLID
   toy buttons, not glass (r: user report - translucent pills read as
   invisible on the scenery). Soft-3D edge idiom like the game shelf. */
export const BTN_FLASH_AGAIN =
  'inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-slate-900 bg-gradient-to-b from-slate-500 to-slate-700 px-5 font-extrabold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_8px_18px_-8px_rgba(0,0,0,0.55)] transition hover:brightness-110 active:translate-y-0.5 active:border-b-2 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 min-h-[76px]';
export const BTN_FLASH_KNOWN =
  /* Dark text on the candy gradient (r41: white on emerald-400 ~1.9:1
     failed AA; emerald-950 on emerald-300/500 >=6:1 - same fix idiom as
     the CR-87 hub tiles). */
  'inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-800 bg-gradient-to-b from-emerald-300 to-emerald-500 px-5 font-extrabold text-emerald-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_8px_18px_-8px_rgba(0,0,0,0.55)] transition hover:brightness-105 active:translate-y-0.5 active:border-b-2 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 min-h-[76px]';
export const FLASH_PANEL = `${material.paperSlate} p-6 text-center`;
export const CHIP_PAPER_EMERALD = `${CHIP_BASE} bg-emerald-100 text-emerald-800 ring-emerald-300`;
export const CHIP_PAPER_SKY = `${CHIP_BASE} bg-sky-100 text-sky-800 ring-sky-300`;

/* ---------------- CR-82 misc ---------------- */

/** Gold hairline for premium frames (ExamResult, flashcard summary). */
export const GOLD_HAIRLINE =
  'ring-1 ring-amber-300/60 shadow-[inset_0_0_0_1px_rgba(253,230,138,0.25)]';

/** Frosted icon chip on the colored hub tile (was: rotating paper tints). */
export const HUB_CHIP =
  'mt-0.5 shrink-0 rounded-xl bg-white/40 p-1.5 text-slate-900 ring-1 ring-white/60';

/** CR-85 redesign: Game Zone cards share the destination-tone system -
 *  each game carries its own hue instead of a uniform amber grid.
 *  `hero` = the full-width "Tro choi hom nay" featured card. */
export function gameCardClass(tone: HubTone): string {
  const s = HUB_TONE_STYLES[tone];
  return `relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border-b-4 ${s.border} ${s.gradient} px-3 py-4 text-center text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_8px_18px_-8px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70`;
}

export function gameHeroClass(tone: HubTone): string {
  const s = HUB_TONE_STYLES[tone];
  return `relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border-b-4 ${s.border} ${s.gradient} px-4 py-4 text-left text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_10px_22px_-10px_rgba(0,0,0,0.5)] transition hover:brightness-105 active:scale-[0.99] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70`;
}
