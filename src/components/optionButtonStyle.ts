import { material } from '../lib/ui/tokens';

/**
 * Shared styling for the 4-option "pick one" button shell used by
 * ImageChoiceQuestion, CountingImageQuestion, and
 * DescribeAndChooseImageQuestion (all structurally "pick 1 of 4 options",
 * see plan.md v3/v5).
 *
 * kids-UX (design-kids-ux s3.4, AC-3.2): after a WRONG pick the chosen tile
 * turns desaturated slate (`material.tilePickedWrong`) - never rose/red
 * shame - and the correct tile is the only emerald surface
 * (`material.tileRevealCorrect`). A right pick keeps the emerald celebration.
 *
 * CR-82 (DESIGN-SPEC-v5 s7.2): every state is a `material.tile*` token -
 * the base keeps structure only (flex, radius, border width, ink size,
 * focus), each branch owns its complete face+shadow so tokens never
 * concatenate onto judged classes.
 */
export function getOptionButtonClassName(
  index: number,
  selectedIndex: number | null,
  correctIndex: number,
  /**
   * CR-82 s7.2: `useViewer().density.tileMinH` - G1-2 image options floor
   * at 96px, everyone else at 76px. Kept a literal-class lookup so both
   * values survive Tailwind's source scan.
   */
  minHeightPx: number = 76,
): string {
  const minH = minHeightPx >= 96 ? 'min-h-[96px]' : 'min-h-[76px]';
  const base =
    `flex ${minH} w-full items-center justify-center rounded-[1.25rem] border-2 p-5 text-2xl font-bold ` +
    `transition ${material.tileFocus}`;

  if (selectedIndex === null) {
    return `${base} ${material.tileFace} ${material.tileHover} ${material.tilePress}`;
  }

  const missed = selectedIndex !== correctIndex;

  if (index === correctIndex) {
    /* kids-UX: on a missed pick the correct tile is the ONLY emerald
       surface - flat light token, no celebratory gradient. */
    if (missed) return `${base} ${material.tileRevealCorrect}`;
    return `${base} ${material.tileCorrect}`;
  }

  if (index === selectedIndex) {
    /* kids-UX: the missed pick desaturates to sunk slate (not rose) so
       the tile reads "that one" instead of "wrong". */
    return `${base} ${material.tilePickedWrong} opacity-80`;
  }

  return `${base} ${material.tileFace} ${material.tileDisabled}`;
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
