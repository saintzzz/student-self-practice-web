import { useRef } from 'react';
import type { ImageChoiceQuestion as ImageChoiceQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { getWordVisual } from '../lib/emoji/wordVisual';
import { EmojiVisual } from './EmojiVisual';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import { InstructionSpeaker } from './InstructionSpeaker';

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
      <div className="mb-2 flex items-center justify-center gap-2">
        <p className="text-xl font-semibold text-amber-200">{INSTRUCTION}</p>
        <InstructionSpeaker text={INSTRUCTION} lang="vi-VN" autoplayKey={speakerKey} />
      </div>
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
