import { useRef, useState } from 'react';
import type { CountingImageOption, CountingImageQuestion as CountingImageQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { EmojiVisual } from './EmojiVisual';
import { countingOptionArtUrl, resolveCountingGroupArt } from '../lib/content/countingArtResolve';
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
  /* CR-145 r225: two all-or-nothing tiers (bespoke scene art, then
     repeated concept art) - one missing/failed asset drops the whole
     visible group back to repeated emoji. The EmojiVisual key tracks the
     resolved mode so a mid-render failure remounts into svg/emoji mode
     instead of leaving a mounted 'image' visual with no imageUrl. */
  const [artFailed, setArtFailed] = useState(false);
  const optionArtMode = artFailed ? null : resolveCountingGroupArt(question.options);
  const promptArtMode = artFailed ? null : resolveCountingGroupArt([question.prompt]);

  return (
    <div>
      <QuestionBanner text={instruction} speakerKey={speakerKey} />

      {isCountToImage ? (
        <p className="mb-3 text-4xl font-extrabold text-white">{countLabel(question.prompt)}</p>
      ) : (
        <div className="mb-3 text-6xl sm:text-7xl leading-relaxed" aria-hidden="true">
          <span className={material.exhibitPaper}>
            <EmojiVisual
              key={promptArtMode ?? 'emoji'}
              emoji={question.prompt.emoji}
              count={promptArtMode === 'single' ? 1 : question.prompt.count}
              imageUrl={promptArtMode ? countingOptionArtUrl(question.prompt, promptArtMode) : undefined}
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
                  key={optionArtMode ?? 'emoji'}
                  emoji={option.emoji}
                  count={optionArtMode === 'single' ? 1 : option.count}
                  imageUrl={optionArtMode ? countingOptionArtUrl(option, optionArtMode) : undefined}
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
