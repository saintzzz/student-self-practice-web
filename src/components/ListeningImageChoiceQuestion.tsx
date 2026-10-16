import { useMemo, useRef, useState } from 'react';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import type { ListeningImageChoiceQuestion as ListeningImageChoiceQuestionType } from '../types';
import { getWordVisual } from '../lib/emoji/wordVisual';
import { EmojiVisual } from './EmojiVisual';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import { EXHIBIT, EXHIBIT_TILT } from '../lib/ui/tokens';
import ListenButtons from './ListenButtons';
import QuestionBanner from './QuestionBanner';

const INSTRUCTION = 'Nghe từ rồi chọn đúng hình nhé!';

interface ListeningImageChoiceQuestionProps {
  question: ListeningImageChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

/**
 * Round 2 addition (plan.md v8 "Round 2 Addition: Listening Image-Choice").
 * TTS speaks the target word; the student picks the matching image from 4
 * options - no typing. Reuses the same 4-option shell and `option-{index}`
 * testid as ImageChoiceQuestion/CountingImageQuestion, just with the prompt
 * and options reversed (audio prompt, image answer instead of image prompt,
 * text answer).
 */
export default function ListeningImageChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
  speakerKey,
}: ListeningImageChoiceQuestionProps) {
  const { hasPlayed, playbackFailed, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(question.word, onStatus, speed), question.word);
  const hasAnswered = selectedIndex !== null;

  // Photos are all-or-nothing across the 4 options (AC-5.2/5.4): only shown
  // when every option has an approved image, and one photo error drops the
  // whole group to the emoji fallback chain (AC-5.3).
  const [photoGroupFailed, setPhotoGroupFailed] = useState(false);
  const optionImageUrls = useMemo(() => {
    if (photoGroupFailed) return null;
    const urls = question.optionWordIds.map((id) => getWordVisual(id)?.imageUrl);
    return urls.every((u): u is string => typeof u === 'string') ? urls : null;
  }, [question.optionWordIds, photoGroupFailed]);
  const demo = useDemoHint('listening-image-choice');
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
      <ListenButtons hasPlayed={hasPlayed} play={play} playSlow={playSlow} />
      {playbackFailed && <AudioPlaybackWarning />}

      <div ref={gridRef} className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((emoji, index) => (
          <button
            key={`option-${index}-${emoji}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
            // CR-02: announce the picture content (the emoji char) so screen
            // readers get the same information sighted users see - the
            // matching task stays identical, the word itself is never leaked.
            // kids-UX: after judging, the label also says which tile was
            // picked vs the answer.
            aria-label={getOptionLabelPrefix(index, selectedIndex, question.correctIndex) + emoji}
          >
            <span className="text-base font-semibold">{getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}</span>
            {/* CR-81 S3: framed exhibit - emoji sits on a pinned card,
                alternating tilt reads hand-placed (inner span only). */}
            <span aria-hidden="true" className={`text-6xl ${EXHIBIT} ${EXHIBIT_TILT[index % 2]}`}>
              <EmojiVisual
                // Keyed on the group state so flipping to the fallback
                // remounts every option into svg mode - EmojiVisual derives
                // its mode at mount, so without the key the non-failed
                // options would stay in 'image' mode with no imageUrl and
                // render blank (AC-5.3: never an empty box).
                key={photoGroupFailed ? 'static' : 'photo'}
                emoji={emoji}
                imageUrl={optionImageUrls?.[index]}
                loading="lazy"
                onImageError={() => setPhotoGroupFailed(true)}
                variant="block"
              />
            </span>
          </button>
        ))}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={gridRef} onDone={demo.dismiss} />
        ) : null}
      </div>
    </div>
  );
}
