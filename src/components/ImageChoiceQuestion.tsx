import type { ImageChoiceQuestion as ImageChoiceQuestionType } from '../types';
import { getWordVisual } from '../lib/emoji/wordVisual';
import { EmojiVisual } from './EmojiVisual';
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
      <p className="mb-2 text-xl font-semibold text-amber-200">Từ nào đúng với hình này?</p>
      <div
        className="mb-3 text-8xl [@media(max-height:420px)]:text-6xl"
        aria-hidden="true"
      >
        <EmojiVisual
          emoji={question.emoji}
          animated
          imageUrl={getWordVisual(question.wordId)?.imageUrl}
          variant="block"
        />
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
