import { useRef } from 'react';
import type { ImageChoiceQuestion as ImageChoiceQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { getWordVisual } from '../lib/emoji/wordVisual';
import { EmojiVisual } from './EmojiVisual';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import { EXHIBIT } from '../lib/ui/tokens';
import QuestionBanner from './QuestionBanner';

const INSTRUCTION = 'Từ nào đúng với hình này?';

interface ImageChoiceQuestionProps {
  question: ImageChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

export default function ImageChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
  speakerKey,
}: ImageChoiceQuestionProps) {
  const hasAnswered = selectedIndex !== null;
  const demo = useDemoHint('image-choice');
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
      <div
        className="mb-3 text-8xl [@media(max-height:420px)]:text-6xl"
        aria-hidden="true"
      >
        {/* CR-81 S3: exhibit frame - the prompt visual reads as a card
            pinned to the board, not a bare emoji on navy. */}
        <span className={EXHIBIT}>
          <EmojiVisual
            emoji={question.emoji}
            animated
            imageUrl={getWordVisual(question.wordId)?.imageUrl}
            variant="block"
          />
        </span>
      </div>
      <div ref={gridRef} className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
          >
            {getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}
            {option}
          </button>
        ))}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={gridRef} onDone={demo.dismiss} />
        ) : null}
      </div>
    </div>
  );
}
