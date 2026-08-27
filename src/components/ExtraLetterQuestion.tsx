import type { ExtraLetterQuestion as ExtraLetterQuestionType } from '../types';

interface ExtraLetterQuestionProps {
  question: ExtraLetterQuestionType;
  selectedLetterIndex: number | null;
  onSelectLetter: (index: number) => void;
}

function getTileClassName(index: number, selectedLetterIndex: number | null, extraIndex: number): string {
  const base =
    'relative flex h-16 w-16 items-center justify-center rounded-2xl border-4 text-3xl font-extrabold uppercase transition focus:outline-none focus:ring-4 focus:ring-sky-500';

  if (selectedLetterIndex === null) {
    return `${base} border-sky-200 bg-white text-sky-900 hover:border-sky-400`;
  }

  if (index === extraIndex) {
    return `${base} border-emerald-500 bg-emerald-50 text-emerald-900`;
  }

  if (index === selectedLetterIndex) {
    return `${base} tile-shake border-rose-500 bg-rose-50 text-rose-900`;
  }

  return `${base} border-sky-200 bg-white text-sky-900 opacity-50`;
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
      <p className="mb-4 text-xl font-semibold text-sky-700">
        Từ này có 1 chữ cái thừa! Bấm vào chữ cái em nghĩ là thừa nhé.
      </p>
      <div className="mb-6 flex flex-wrap justify-center gap-3">
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
                🎯
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
