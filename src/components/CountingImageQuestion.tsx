import { useRef } from 'react';
import type { CountingImageOption, CountingImageQuestion as CountingImageQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { EmojiVisual } from './EmojiVisual';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import { InstructionSpeaker } from './InstructionSpeaker';

interface CountingImageQuestionProps {
  question: CountingImageQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

function countLabel(option: CountingImageOption): string {
  return `${option.count} ${option.count === 1 ? option.word : option.plural}`;
}

export default function CountingImageQuestion({
  question,
  selectedIndex,
  onSelectOption,
  speakerKey,
}: CountingImageQuestionProps) {
  const hasAnswered = selectedIndex !== null;
  const demo = useDemoHint('counting-image');
  const gridRef = useRef<HTMLDivElement>(null);
  const isCountToImage = question.direction === 'count-to-image';
  const instruction = isCountToImage ? 'Chọn hình có đúng số lượng nhé!' : 'Đếm số lượng rồi chọn đáp án đúng!';

  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-2">
        <p className="text-xl font-semibold text-amber-200">{instruction}</p>
        <InstructionSpeaker text={instruction} lang="vi-VN" autoplayKey={speakerKey} />
      </div>

      {isCountToImage ? (
        <p className="mb-3 text-4xl font-extrabold text-white">{countLabel(question.prompt)}</p>
      ) : (
        <div className="mb-3 text-6xl leading-relaxed" aria-hidden="true">
          <EmojiVisual emoji={question.prompt.emoji} count={question.prompt.count} />
        </div>
      )}

      <div ref={gridRef} className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={`${option.word}-${option.count}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
          >
            {getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}
            {isCountToImage ? (
              <span aria-hidden="true">
                <EmojiVisual emoji={option.emoji} count={option.count} />
              </span>
            ) : (
              countLabel(option)
            )}
          </button>
        ))}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={gridRef} onDone={demo.dismiss} />
        ) : null}
      </div>
    </div>
  );
}
