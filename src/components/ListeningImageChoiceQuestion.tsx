import { useMemo, useState } from 'react';
import type { ListeningImageChoiceQuestion as ListeningImageChoiceQuestionType } from '../types';
import { getWordVisual } from '../lib/emoji/wordVisual';
import { EmojiVisual } from './EmojiVisual';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName } from './optionButtonStyle';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';

interface ListeningImageChoiceQuestionProps {
  question: ListeningImageChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
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
}: ListeningImageChoiceQuestionProps) {
  const { hasPlayed, playbackFailed, play } = useAudioPlayback((onStatus) => speakWord(question.word, onStatus));
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

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-amber-200">Nghe từ rồi chọn đúng hình nhé!</p>
      <button
        type="button"
        data-testid="play-audio-button"
        onClick={play}
        className={`mb-3 ${AUDIO_BUTTON_CLASSNAME}`}
      >
        {hasPlayed ? '🔁 Nghe lại' : '🔊 Nghe'}
      </button>
      {playbackFailed && <AudioPlaybackWarning />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {question.options.map((emoji, index) => (
          <button
            key={`option-${index}-${emoji}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            // CR-02: announce the picture content (the emoji char) so screen
            // readers get the same information sighted users see - the
            // matching task stays identical, the word itself is never leaked.
            aria-label={emoji}
          >
            <span aria-hidden="true" className="text-6xl">
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
      </div>
    </div>
  );
}
