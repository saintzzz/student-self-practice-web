import { useMemo, useState } from 'react';
import type { PhonicsWordChoiceQuestion as PhonicsWordChoiceQuestionType } from '../types';
import { getWordVisual } from '../lib/emoji/wordVisual';
import { getSoundUtterance } from '../lib/phonics/initialSounds';
import { EmojiVisual } from './EmojiVisual';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';
import { InstructionSpeaker } from './InstructionSpeaker';

const INSTRUCTION = 'Nghe âm rồi chọn đúng hình nhé!';

interface PhonicsWordChoiceQuestionProps {
  question: PhonicsWordChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

/**
 * Phonics direction B (CR-03): the letter sound is shown big and spoken;
 * the student picks the picture whose word starts with that sound - the
 * phonics twin of ListeningImageChoiceQuestion (audio prompt, image answer,
 * same 4-option shell, same all-or-nothing photo group as AC-5.2/5.3).
 */
export default function PhonicsWordChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
  speakerKey,
}: PhonicsWordChoiceQuestionProps) {
  // speakWord on a bare key ("c") reads the letter name ("see"); the
  // utterance "c, as in cat" carries the actual sound via the example.
  const { hasPlayed, playbackFailed, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(getSoundUtterance(question.sound), onStatus, speed), getSoundUtterance(question.sound));
  const hasAnswered = selectedIndex !== null;

  const [photoGroupFailed, setPhotoGroupFailed] = useState(false);
  const optionImageUrls = useMemo(() => {
    if (photoGroupFailed) return null;
    const urls = question.optionWordIds.map((id) => getWordVisual(id)?.imageUrl);
    return urls.every((u): u is string => typeof u === 'string') ? urls : null;
  }, [question.optionWordIds, photoGroupFailed]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-center gap-2">
        <p className="text-xl font-semibold text-amber-200">{INSTRUCTION}</p>
        <InstructionSpeaker text={INSTRUCTION} lang="vi-VN" autoplayKey={speakerKey} />
      </div>
      <div className="mb-3 flex items-center justify-center gap-3">
        <span className="text-6xl font-extrabold text-white [@media(max-height:420px)]:text-5xl">
          {question.sound}
        </span>
        <button
          type="button"
          data-testid="play-audio-button"
          onClick={play}
          className={AUDIO_BUTTON_CLASSNAME}
        >
          {hasPlayed ? '🔁 Nghe lại' : '🔊 Nghe'}
        </button>
        {hasPlayed && (
          <button
            type="button"
            data-testid="play-slow-button"
            onClick={playSlow}
            className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-slate-700/80 px-5 py-2 text-lg font-bold text-sky-200 ring-1 ring-sky-400/40 transition hover:bg-slate-600/80 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-sky-400"
          >
            🐢 Nghe chậm
          </button>
        )}
      </div>
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
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
            // CR-02: announce the picture content (the emoji char) - same
            // information a sighted user gets, the word is never leaked.
            // kids-UX: after judging, the label also says which tile was
            // picked vs the answer.
            aria-label={getOptionLabelPrefix(index, selectedIndex, question.correctIndex) + emoji}
          >
            <span className="text-base font-semibold">{getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}</span>
            <span aria-hidden="true" className="text-6xl">
              <EmojiVisual
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
