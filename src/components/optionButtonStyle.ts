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
  const base =
    'w-full rounded-2xl border-4 p-5 text-2xl font-bold transition focus:outline-none focus:ring-4 focus:ring-sky-500';

  if (selectedIndex === null) {
    return `${base} border-sky-200 bg-white text-sky-900 hover:border-sky-400`;
  }

  if (index === correctIndex) {
    return `${base} border-emerald-500 bg-emerald-50 text-emerald-900`;
  }

  if (index === selectedIndex) {
    return `${base} border-rose-500 bg-rose-50 text-rose-900`;
  }

  return `${base} border-sky-200 bg-white text-sky-900 opacity-50`;
}
