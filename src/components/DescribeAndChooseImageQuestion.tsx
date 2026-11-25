import { useEffect, useRef, useState } from 'react';
import type { CountingImageOption, DescribeAndChooseImageQuestion as DescribeAndChooseImageQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { EmojiVisual } from './EmojiVisual';
import { COUNTING_ART } from '../lib/content/countingArt';
import { speakSentence } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import PressableOptionButton from './PressableOptionButton';
import { EXHIBIT_TILT, material } from '../lib/ui/tokens';
import { useViewer } from '../lib/viewer/ViewerContext';
import ListenButtons from './ListenButtons';
import QuestionBanner from './QuestionBanner';

const INSTRUCTION = 'Nghe hoặc đọc câu rồi chọn hình đúng nhé!';

/* CR-145 (art audit F-04): bespoke "N objects in one image" art for the
   count options, same lookup as CountingImageQuestion. */
function countingArtUrl(option: CountingImageOption): string | undefined {
  const slug = option.word.trim().toLowerCase().replace(/\s+/g, '-');
  return COUNTING_ART[`${slug}|${option.count}`];
}

interface DescribeAndChooseImageQuestionProps {
  question: DescribeAndChooseImageQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
  /** CR-82 (D-15): reports content-audio loading to the board's
      thinking-pose signal (child -> board). */
  onAudioLoadingChange?: (loading: boolean) => void;
}

/**
 * Round 4 of the v5/v6 Batch/Round model (plan.md "Round 4 - Describe and
 * Choose Image"). The description sentence is spoken via TTS and shown on
 * screen; the 4 options always render as repeated-emoji images (same shell
 * as CountingImageQuestion's count-to-image direction), reusing
 * `option-{index}` and the shared correct/incorrect option styling.
 */
export default function DescribeAndChooseImageQuestion({
  question,
  selectedIndex,
  onSelectOption,
  speakerKey,
  onAudioLoadingChange,
}: DescribeAndChooseImageQuestionProps) {
  const { hasPlayed, playbackFailed, isLoading, play, playSlow } = useAudioPlayback((onStatus, speed) =>
    speakSentence(question.sentence, onStatus, speed),
    question.sentence,
  );

  useEffect(() => {
    onAudioLoadingChange?.(isLoading);
  }, [isLoading, onAudioLoadingChange]);
  const hasAnswered = selectedIndex !== null;
  const { density } = useViewer();
  const demo = useDemoHint('describe-and-choose-image');
  const gridRef = useRef<HTMLDivElement>(null);
  /* CR-145: all-or-nothing counting art - one missing/failed asset drops
     the whole option set back to repeated emoji. */
  const [artFailed, setArtFailed] = useState(false);
  const optionArt = !artFailed && question.options.every(countingArtUrl);

  return (
    <div>
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
      <p className="mb-3 text-3xl font-extrabold text-white">{question.sentence}</p>
      <ListenButtons hasPlayed={hasPlayed} play={play} playSlow={playSlow} />
      {playbackFailed && <AudioPlaybackWarning />}

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
            // CR-02: announce the visible content (emoji repeated count
            // times) - every option announces equally, so nothing about
            // the correct answer is given away. kids-UX: after judging,
            // the label also says which tile was picked vs the answer.
            aria-label={getOptionLabelPrefix(index, selectedIndex, question.correctIndex) + option.emoji.repeat(option.count)}
          >
            <span className="text-base font-semibold">{getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}</span>
            <span aria-hidden="true" className={`text-4xl sm:text-6xl leading-relaxed ${material.exhibitPaper} ${EXHIBIT_TILT[index % 2]}`}>
              <EmojiVisual
                emoji={option.emoji}
                count={optionArt ? 1 : option.count}
                imageUrl={optionArt ? countingArtUrl(option) : undefined}
                onImageError={() => setArtFailed(true)}
              />
            </span>
          </PressableOptionButton>
        ))}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={gridRef} onDone={demo.dismiss} />
        ) : null}
      </div>
    </div>
  );
}
