import { OPTION_PICKED_WRONG, OPTION_REVEAL_CORRECT } from '../lib/ui/tokens';

/**
 * Shared styling for the 4-option "pick one" button shell used by
 * ImageChoiceQuestion, CountingImageQuestion, and
 * DescribeAndChooseImageQuestion (all structurally "pick 1 of 4 options",
 * see plan.md v3/v5).
 *
 * kids-UX (design-kids-ux s3.4, AC-3.2): after a WRONG pick the chosen tile
 * turns desaturated slate (`OPTION_PICKED_WRONG`) - never rose/red shame -
 * and the correct tile is the only emerald surface (`OPTION_REVEAL_CORRECT`).
 * A right pick keeps the existing emerald celebration.
 */
export function getOptionButtonClassName(
  index: number,
  selectedIndex: number | null,
  correctIndex: number,
): string {
  /* CR-12 DS-X3: key-cap tile - gradient face, inset top sheen + bottom
     edge, lift + ring glow on hover. CR-16: navy tile on the branded dark
     play surface; status colors keep their semantics (emerald = correct,
     rose = wrong). */
  const base =
    'flex min-h-[76px] w-full items-center justify-center rounded-2xl border-4 p-5 text-2xl font-bold ' +
    'shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(0,0,0,0.25),0_4px_10px_-4px_rgba(0,0,0,0.4)] ' +
    'transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] motion-reduce:transition-none ' +
    'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-amber-400/60';

  if (selectedIndex === null) {
    return `${base} border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] text-white ` +
      'hover:border-amber-400/70 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(0,0,0,0.25),0_8px_18px_-6px_rgba(245,158,11,0.45)]';
  }

  const missed = selectedIndex !== correctIndex;

  if (index === correctIndex) {
    /* kids-UX: on a missed pick the correct tile is the ONLY emerald
       surface - flat light token, no celebratory gradient. */
    if (missed) return `${base} ${OPTION_REVEAL_CORRECT}`;
    return `${base} border-emerald-400 bg-gradient-to-b from-emerald-500/25 to-emerald-600/20 text-emerald-100 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(5,150,105,0.3),0_6px_14px_-6px_rgba(5,150,105,0.5)]';
  }

  if (index === selectedIndex) {
    /* kids-UX: the missed pick desaturates to slate (not rose) so the tile
       reads "that one" instead of "wrong". */
    return `${base} ${OPTION_PICKED_WRONG} opacity-80`;
  }

  return `${base} border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] text-white opacity-40`;
}

/**
 * kids-UX (design s3.4): color never carries verdict meaning alone - the
 * picked tile gets a visible "Em chọn:" prefix and the revealed correct
 * tile "Đáp án:" once an answer is judged. Returns '' before answering and
 * for untouched options.
 */
export function getOptionLabelPrefix(
  index: number,
  selectedIndex: number | null,
  correctIndex: number,
): string {
  if (selectedIndex === null) return '';
  if (index === correctIndex) return 'Đáp án: ';
  if (index === selectedIndex) return 'Em chọn: ';
  return '';
}

/**
 * kids-UX (design s3.4): the picked tile is desaturated slate now, so
 * color classes can no longer be the machine-readable verdict signal.
 * These attributes expose the judged state semantically - `data-correct`
 * on the revealed/correct tile and `aria-invalid` on the missed pick -
 * for assistive tech and test outcome readers alike.
 */
export function getOptionStateAttrs(
  index: number,
  selectedIndex: number | null,
  correctIndex: number,
): { 'data-correct'?: 'true'; 'aria-invalid'?: 'true' } {
  if (selectedIndex === null) return {};
  if (index === correctIndex) return { 'data-correct': 'true' };
  if (index === selectedIndex) return { 'aria-invalid': 'true' };
  return {};
}
