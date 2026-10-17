import { useRef } from 'react';
import type { CountingImageOption, CountingImageQuestion as CountingImageQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { EmojiVisual } from './EmojiVisual';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import PressableOptionButton from './PressableOptionButton';
import { EXHIBIT_TILT, material } from '../lib/ui/tokens';
import { useViewer } from '../lib/viewer/ViewerContext';
import QuestionBanner from './QuestionBanner';

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
  const { density } = useViewer();
  const demo = useDemoHint('counting-image');
  const gridRef = useRef<HTMLDivElement>(null);
  const isCountToImage = question.direction === 'count-to-image';
  const instruction = isCountToImage ? 'Chọn hình có đúng số lượng nhé!' : 'Đếm số lượng rồi chọn đáp án đúng!';

  return (
    <div>
      <QuestionBanner text={instruction} speakerKey={speakerKey} />

      {isCountToImage ? (
        <p className="mb-3 text-4xl font-extrabold text-white">{countLabel(question.prompt)}</p>
      ) : (
        <div className="mb-3 text-6xl leading-relaxed" aria-hidden="true">
          <span className={material.exhibitPaper}>
            <EmojiVisual emoji={question.prompt.emoji} count={question.prompt.count} />
          </span>
        </div>
      )}

      <div ref={gridRef} className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <PressableOptionButton
            key={`${option.word}-${option.count}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex, density.tileMinH)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
          >
            {getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}
            {isCountToImage ? (
              <span aria-hidden="true" className={`${material.exhibitPaper} ${EXHIBIT_TILT[index % 2]}`}>
                <EmojiVisual emoji={option.emoji} count={option.count} />
              </span>
            ) : (
              countLabel(option)
            )}
          </PressableOptionButton>
        ))}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={gridRef} onDone={demo.dismiss} />
        ) : null}
      </div>
    </div>
  );
}
