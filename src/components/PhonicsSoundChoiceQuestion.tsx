import type { PhonicsSoundChoiceQuestion as PhonicsSoundChoiceQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName } from './optionButtonStyle';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';

interface PhonicsSoundChoiceQuestionProps {
  question: PhonicsSoundChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
}

/**
 * Phonics direction A (CR-03): the word is shown (with its picture) and
 * spoken; the student picks the letter/digraph of its initial sound from 4
 * options. Options are plain text buttons (big letters) so they carry their
 * own accessible names - the opposite direction of PhonicsWordChoiceQuestion.
 */
export default function PhonicsSoundChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
}: PhonicsSoundChoiceQuestionProps) {
  const { hasPlayed, playbackFailed, play } = useAudioPlayback((onStatus) => speakWord(question.word, onStatus));
  const hasAnswered = selectedIndex !== null;

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-amber-200">Từ này bắt đầu bằng âm nào?</p>
      <div className="mb-3 flex items-center justify-center gap-3">
        <span aria-hidden="true" className="text-6xl [@media(max-height:420px)]:text-5xl">
          <EmojiVisual emoji={question.emoji} animated variant="block" />
        </span>
        <span className="text-4xl font-extrabold text-white [@media(max-height:420px)]:text-3xl">
          {question.word}
        </span>
        <button
          type="button"
          data-testid="play-audio-button"
          onClick={play}
          className={AUDIO_BUTTON_CLASSNAME}
        >
          {hasPlayed ? '🔁 Nghe lại' : '🔊 Nghe'}
        </button>
      </div>
      {playbackFailed && <AudioPlaybackWarning />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {question.options.map((sound, index) => (
          <button
            key={`option-${index}-${sound}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            aria-label={`âm ${sound}`}
          >
            <span className="text-3xl font-extrabold">{sound}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
