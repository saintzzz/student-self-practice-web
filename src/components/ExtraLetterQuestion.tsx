import type { ExtraLetterQuestion as ExtraLetterQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';

interface ExtraLetterQuestionProps {
  question: ExtraLetterQuestionType;
  selectedLetterIndex: number | null;
  onSelectLetter: (index: number) => void;
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
    'font-extrabold uppercase shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-4px_0_rgba(0,0,0,0.08),0_4px_10px_-4px_rgba(15,23,42,0.15)] ' +
    'transition hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none ' +
    'motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-sky-500 [@media(max-width:360px)]:text-2xl';

  if (selectedLetterIndex === null) {
    return `${base} border-sky-200 bg-gradient-to-b from-white to-sky-50/80 text-sky-900 ` +
      'hover:border-sky-400 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-4px_0_rgba(0,0,0,0.08),0_8px_18px_-6px_rgba(56,189,248,0.5)]';
  }

  if (index === extraIndex) {
    return `${base} border-emerald-500 bg-gradient-to-b from-emerald-50 to-emerald-100/70 text-emerald-900 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-4px_0_rgba(5,150,105,0.25),0_6px_14px_-6px_rgba(5,150,105,0.45)]';
  }

  if (index === selectedLetterIndex) {
    return `${base} tile-shake border-rose-500 bg-gradient-to-b from-rose-50 to-rose-100/70 text-rose-900 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_0_-4px_0_rgba(225,29,72,0.25),0_6px_14px_-6px_rgba(225,29,72,0.45)]';
  }

  return `${base} border-sky-200 bg-gradient-to-b from-white to-sky-50/80 text-sky-900 opacity-50`;
}

export default function ExtraLetterQuestion({
  question,
  selectedLetterIndex,
  onSelectLetter,
}: ExtraLetterQuestionProps) {
  const hasAnswered = selectedLetterIndex !== null;
  const wasCorrect = hasAnswered && selectedLetterIndex === question.extraIndex;

  return (
    <div>
      {/* CR-12: smaller prompt on <=600px heights so long words (3 tile
          rows) keep the next-button near the fold on short phones. */}
      <p className="mb-2 text-xl font-semibold text-sky-700 [@media(max-height:600px)]:text-base">
        Từ này có 1 chữ cái thừa! Bấm vào chữ cái em nghĩ là thừa nhé.
      </p>
      <div className="mb-2 flex justify-center gap-1.5 sm:gap-3">
        {question.displayLetters.map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            type="button"
            data-testid={`letter-tile-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectLetter(index)}
            className={getTileClassName(index, selectedLetterIndex, question.extraIndex)}
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
