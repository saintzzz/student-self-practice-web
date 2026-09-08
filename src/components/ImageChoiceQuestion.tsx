import type { ImageChoiceQuestion as ImageChoiceQuestionType } from '../types';
import { getOptionButtonClassName } from './optionButtonStyle';

interface ImageChoiceQuestionProps {
  question: ImageChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
}

export default function ImageChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
}: ImageChoiceQuestionProps) {
  const hasAnswered = selectedIndex !== null;

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-sky-700">Từ nào đúng với hình này?</p>
      <div className="mb-3 text-8xl" aria-hidden="true">
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
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
