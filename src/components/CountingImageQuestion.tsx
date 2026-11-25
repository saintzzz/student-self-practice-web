import { useRef, useState } from 'react';
import type { CountingImageOption, CountingImageQuestion as CountingImageQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { EmojiVisual } from './EmojiVisual';
import { COUNTING_ART } from '../lib/content/countingArt';
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

/* CR-145 (art audit F-04): bespoke "N objects in one image" art replaces
   the repeated-emoji tile when a matching asset exists. */
function countingArtUrl(option: CountingImageOption): string | undefined {
  const slug = option.word.trim().toLowerCase().replace(/\s+/g, '-');
  return COUNTING_ART[`${slug}|${option.count}`];
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
  /* CR-145: all-or-nothing counting art - one missing/failed asset drops
     the whole visible group back to repeated emoji. */
  const [artFailed, setArtFailed] = useState(false);
  const optionArt = !artFailed && question.options.every(countingArtUrl);
  const promptArt = artFailed ? undefined : countingArtUrl(question.prompt);

  return (
    <div>
      <QuestionBanner text={instruction} speakerKey={speakerKey} />

      {isCountToImage ? (
        <p className="mb-3 text-4xl font-extrabold text-white">{countLabel(question.prompt)}</p>
      ) : (
        <div className="mb-3 text-6xl sm:text-7xl leading-relaxed" aria-hidden="true">
          <span className={material.exhibitPaper}>
            {/* count>1 forces svg mode - the counting art already contains
                N objects, so art renders as a single image frame. */}
            <EmojiVisual
              emoji={question.prompt.emoji}
              count={promptArt ? 1 : question.prompt.count}
              imageUrl={promptArt}
              onImageError={() => setArtFailed(true)}
            />
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
              <span aria-hidden="true" className={`text-4xl sm:text-5xl ${material.exhibitPaper} ${EXHIBIT_TILT[index % 2]}`}>
                <EmojiVisual
                  emoji={option.emoji}
                  count={optionArt ? 1 : option.count}
                  imageUrl={optionArt ? countingArtUrl(option) : undefined}
                  onImageError={() => setArtFailed(true)}
                />
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
