import type { ImageChoiceQuestion as ImageChoiceQuestionType } from '../types';

interface ImageChoiceQuestionProps {
  question: ImageChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
}

function getOptionClassName(index: number, selectedIndex: number | null, correctIndex: number): string {
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

export default function ImageChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
}: ImageChoiceQuestionProps) {
  const hasAnswered = selectedIndex !== null;

  return (
    <div>
      <p className="mb-4 text-xl font-semibold text-sky-700">Từ nào đúng với hình này?</p>
      <div className="mb-6 text-8xl" aria-hidden="true">
        {question.emoji}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionClassName(index, selectedIndex, question.correctIndex)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
