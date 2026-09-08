/**
 * Shared Tailwind class constants for the primary action buttons repeated
 * across question components and Round/Batch navigation (plan.md v9
 * "Touch Target Sizing" - NN/g's ~76px minimum for young-child touch
 * targets, 4x the 44px adult WCAG AAA baseline). Each constant is
 * margin-free so callers can compose their own spacing alongside it, e.g.
 * `` `mt-2 ${CONTINUE_BUTTON_CLASSNAME}` ``.
 */

/** "Nghe" / "Nghe lại" audio-play buttons (listening + describe-image questions). */
export const AUDIO_BUTTON_CLASSNAME =
  'flex min-h-[76px] items-center justify-center rounded-full bg-indigo-500 px-8 py-3 text-2xl font-bold text-white shadow-md transition hover:bg-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-400';

/** "Kiểm tra" submit buttons for the two typed-answer listening question kinds. */
export const SUBMIT_ANSWER_BUTTON_CLASSNAME =
  'flex min-h-[76px] items-center justify-center rounded-2xl bg-emerald-500 px-8 py-3 text-2xl font-bold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300';

/** "Câu tiếp theo" / "Vòng tiếp theo" / "Luyện tập bài mới" progression buttons. */
export const CONTINUE_BUTTON_CLASSNAME =
  'flex min-h-[76px] items-center justify-center rounded-2xl bg-amber-500 px-10 py-3 text-2xl font-bold text-white shadow-md transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300';
