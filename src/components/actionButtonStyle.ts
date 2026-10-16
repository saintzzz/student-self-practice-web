/**
 * Shared Tailwind class constants for the primary action buttons repeated
 * across question components and Round/Batch navigation (plan.md v9
 * "Touch Target Sizing" - NN/g's ~76px minimum for young-child touch
 * targets, 4x the 44px adult WCAG AAA baseline). Each constant is
 * margin-free so callers can compose their own spacing alongside it, e.g.
 * `` `mt-2 ${CONTINUE_BUTTON_CLASSNAME}` ``.
 *
 * CR-11 (A-29): every constant uses `inline-flex`, NOT `flex` - Chromium
 * renders `<button>` with `display:flex` as a fit-content box that also
 * ignores ancestor `text-align:center`, leaving CTAs glued to the left
 * edge of their cards. `inline-flex` keeps the internal centering AND
 * respects text-align/justify parents. Verified empirically.
 *
 * CR-11 premium language: light-top vertical gradient + an inset bottom
 * shade ("pressed toy" edge) so buttons read tactile, plus a soft lift
 * on hover. Colors keep CR-09 semantics: emerald = go/submit, amber =
 * progress/continue, indigo = audio.
 */
const PREMIUM_BASE =
  'inline-flex min-h-[76px] items-center justify-center gap-2 font-display font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-4px_0_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-4px_0_rgba(0,0,0,0.18),0_10px_20px_-6px_rgba(0,0,0,0.3)] active:translate-y-0 active:scale-95 active:shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.18),0_3px_8px_-4px_rgba(0,0,0,0.25)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-none disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-sm';

/** "Nghe" / "Nghe lại" audio-play buttons (listening + describe-image
 *  questions). CR-81: deep-navy "speaker block" on the board + amber
 *  accent ring - the rainbow indigo gradient was generic AI chrome. */
export const AUDIO_BUTTON_CLASSNAME =
  `${PREMIUM_BASE} rounded-2xl border-2 border-amber-300/50 bg-gradient-to-b from-[#2a4a82] to-[#162C55] px-8 py-3 text-2xl text-amber-100 focus:ring-amber-400/70`;

/** "Kiểm tra" submit buttons for the two typed-answer listening question
 *  kinds. CR-81: gold = the commit/advance action (same family as
 *  "Câu tiếp theo") - one primary voice on the board. */
export const SUBMIT_ANSWER_BUTTON_CLASSNAME =
  `${PREMIUM_BASE} rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-3 text-2xl text-amber-950 focus:ring-amber-400`;

/** "Câu tiếp theo" / "Vòng tiếp theo" / "Luyện tập bài mới" progression buttons. */
export const CONTINUE_BUTTON_CLASSNAME =
  `${PREMIUM_BASE} rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 px-10 py-3 text-2xl focus:ring-amber-500`;
