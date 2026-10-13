import type { ExtraLetterQuestion as ExtraLetterQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';
import { OPTION_PICKED_WRONG, OPTION_REVEAL_CORRECT } from '../lib/ui/tokens';
import { getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import { InstructionSpeaker } from './InstructionSpeaker';

const INSTRUCTION = 'Từ này có 1 chữ cái thừa! Bấm vào chữ cái em nghĩ là thừa nhé.';

interface ExtraLetterQuestionProps {
  question: ExtraLetterQuestionType;
  selectedLetterIndex: number | null;
  onSelectLetter: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

function getTileClassName(index: number, selectedLetterIndex: number | null, extraIndex: number): string {
  /* CR-12 DS-X3: letter tiles become "key caps" - gradient face, top
     sheen + deep bottom edge, lift on hover like a toy keyboard. */
  /* CR-12 DS-X3: letter tiles become "key caps" - gradient face, top
     sheen + deep bottom edge, lift on hover like a toy keyboard.
     CR-12 fix: tiles must stay on ONE row so the letters still read as
     a word - flex-1 lets them share the row, max-w caps at 76px, and
     the 76px HEIGHT is preserved so the touch target stays generous
     even when narrow screens make tiles thin. */
  const base =
    'relative flex h-[76px] min-w-0 flex-1 max-w-[76px] items-center justify-center rounded-2xl border-4 text-3xl ' +
    'font-extrabold uppercase shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(0,0,0,0.08),0_4px_10px_-4px_rgba(15,23,42,0.15)] ' +
    'transition hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none ' +
    'motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-amber-400/60 [@media(max-width:360px)]:text-2xl';

  if (selectedLetterIndex === null) {
    return `${base} border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] text-white ` +
      'hover:border-amber-400/70 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(0,0,0,0.08),0_8px_18px_-6px_rgba(56,189,248,0.5)]';
  }

  const missed = selectedLetterIndex !== extraIndex;

  if (index === extraIndex) {
    /* kids-UX (design s3.4): on a missed pick the extra letter is the only
       emerald surface - flat token, no celebratory gradient. */
    if (missed) return `${base} ${OPTION_REVEAL_CORRECT}`;
    return `${base} border-emerald-400 bg-gradient-to-b from-emerald-500/25 to-emerald-600/15 text-emerald-100 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(5,150,105,0.25),0_6px_14px_-6px_rgba(5,150,105,0.45)]';
  }

  if (index === selectedLetterIndex) {
    /* kids-UX: desaturated slate (not rose) marks "the tile em chọn" -
       keeps the tile-shake hint but drops the red shame treatment. */
    return `${base} tile-shake ${OPTION_PICKED_WRONG} opacity-80`;
  }

  return `${base} border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] text-white opacity-50`;
}

export default function ExtraLetterQuestion({
  question,
  selectedLetterIndex,
  onSelectLetter,
  speakerKey,
}: ExtraLetterQuestionProps) {
  const hasAnswered = selectedLetterIndex !== null;
  const wasCorrect = hasAnswered && selectedLetterIndex === question.extraIndex;

  return (
    <div>
      {/* CR-12: smaller prompt on <=600px heights so long words (3 tile
          rows) keep the next-button near the fold on short phones. */}
      <div className="mb-2 flex items-center justify-center gap-2">
        <p className="text-xl font-semibold text-amber-200 [@media(max-height:600px)]:text-base">
          {INSTRUCTION}
        </p>
        <InstructionSpeaker text={INSTRUCTION} lang="vi-VN" autoplayKey={speakerKey} />
      </div>
      <div className="mb-2 flex justify-center gap-1.5 sm:gap-3">
        {question.displayLetters.map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            type="button"
            data-testid={`letter-tile-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectLetter(index)}
            className={getTileClassName(index, selectedLetterIndex, question.extraIndex)}
            /* kids-UX s3.4: here "correct" means the extra letter - the
               tile to remove. */
            {...getOptionStateAttrs(index, selectedLetterIndex, question.extraIndex)}
            /* kids-UX s3.4: 76px key-cap tiles cannot hold a text prefix,
               so the "Em chọn / Đáp án" label rides the accessible name. */
            aria-label={
              getOptionLabelPrefix(index, selectedLetterIndex, question.extraIndex)
                ? getOptionLabelPrefix(index, selectedLetterIndex, question.extraIndex) + letter
                : undefined
            }
          >
            {letter}
            {wasCorrect && index === question.extraIndex && (
              <span
                aria-hidden="true"
                className="dart-arrow pointer-events-none absolute -top-7 text-2xl"
              >
                <EmojiVisual emoji="🎯" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
