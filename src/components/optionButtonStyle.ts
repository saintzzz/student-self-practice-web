/**
 * Shared styling for the 4-option "pick one" button shell used by
 * ImageChoiceQuestion, CountingImageQuestion, and
 * DescribeAndChooseImageQuestion (all structurally "pick 1 of 4 options",
 * see plan.md v3/v5).
 */
export function getOptionButtonClassName(
  index: number,
  selectedIndex: number | null,
  correctIndex: number,
): string {
  /* CR-12 DS-X3: key-cap tile - gradient face, inset top sheen + bottom
     edge, lift + ring glow on hover. Status colors unchanged. */
  const base =
    'flex min-h-[76px] w-full items-center justify-center rounded-2xl border-4 p-5 text-2xl font-bold ' +
    'shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-4px_0_rgba(0,0,0,0.08),0_4px_10px_-4px_rgba(15,23,42,0.15)] ' +
    'transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] motion-reduce:transition-none ' +
    'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-sky-500';

  if (selectedIndex === null) {
    return `${base} border-sky-200 bg-gradient-to-b from-white to-sky-50/80 text-sky-900 ` +
      'hover:border-sky-400 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-4px_0_rgba(0,0,0,0.08),0_8px_18px_-6px_rgba(56,189,248,0.5)]';
  }

  if (index === correctIndex) {
    return `${base} border-emerald-500 bg-gradient-to-b from-emerald-50 to-emerald-100/70 text-emerald-900 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-4px_0_rgba(5,150,105,0.25),0_6px_14px_-6px_rgba(5,150,105,0.45)]';
  }

  if (index === selectedIndex) {
    return `${base} border-rose-500 bg-gradient-to-b from-rose-50 to-rose-100/70 text-rose-900 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-4px_0_rgba(225,29,72,0.25),0_6px_14px_-6px_rgba(225,29,72,0.45)]';
  }

  return `${base} border-sky-200 bg-gradient-to-b from-white to-sky-50/80 text-sky-900 opacity-50`;
}
