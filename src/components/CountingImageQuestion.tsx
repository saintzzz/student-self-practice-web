import type { CountingImageOption, CountingImageQuestion as CountingImageQuestionType } from '../types';
import { getOptionButtonClassName } from './optionButtonStyle';

interface CountingImageQuestionProps {
  question: CountingImageQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
}

function countLabel(option: CountingImageOption): string {
  return `${option.count} ${option.count === 1 ? option.word : option.plural}`;
}

function repeatedEmoji(option: CountingImageOption): string {
  return option.emoji.repeat(option.count);
}

export default function CountingImageQuestion({
  question,
  selectedIndex,
  onSelectOption,
}: CountingImageQuestionProps) {
  const hasAnswered = selectedIndex !== null;
  const isCountToImage = question.direction === 'count-to-image';

  return (
    <div>
      <p className="mb-4 text-xl font-semibold text-sky-700">
        {isCountToImage ? 'Chọn hình có đúng số lượng nhé!' : 'Đếm số lượng rồi chọn đáp án đúng!'}
      </p>

      {isCountToImage ? (
        <p className="mb-6 text-4xl font-extrabold text-sky-900">{countLabel(question.prompt)}</p>
      ) : (
        <div className="mb-6 text-6xl leading-relaxed" aria-hidden="true">
          {repeatedEmoji(question.prompt)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={`${option.word}-${option.count}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
          >
            {isCountToImage ? (
              <span aria-hidden="true">{repeatedEmoji(option)}</span>
            ) : (
              countLabel(option)
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
