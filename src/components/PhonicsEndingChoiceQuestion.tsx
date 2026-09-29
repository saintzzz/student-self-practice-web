import type { PhonicsBlendChoiceQuestion, PhonicsFinalChoiceQuestion } from '../types';
import { EmojiVisual } from './EmojiVisual';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName } from './optionButtonStyle';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';

type EndingChoiceQuestion = PhonicsFinalChoiceQuestion | PhonicsBlendChoiceQuestion;

interface PhonicsEndingChoiceQuestionProps {
  question: EndingChoiceQuestion;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
}

/**
 * CR-06 phonics - final sounds and blends share the sound-choice shell:
 * the word is shown (with its picture) and spoken; the student picks a
 * letter/cluster from 4 text options. The two kinds differ only in what
 * the prompt asks about and the option aria-label prefix - driven by
 * `question.kind`, same pattern as CR-03's PhonicsSoundChoiceQuestion.
 */
export default function PhonicsEndingChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
}: PhonicsEndingChoiceQuestionProps) {
  const { hasPlayed, playbackFailed, play } = useAudioPlayback((onStatus) => speakWord(question.word, onStatus));
  const hasAnswered = selectedIndex !== null;

  const isFinal = question.kind === 'phonics-final-choice';
  const promptText = isFinal ? 'Từ này kết thúc bằng âm nào?' : 'Từ này bắt đầu bằng cụm âm nào?';
  const optionLabel = (option: string) => (isFinal ? `âm ${option}` : `cụm ${option}`);

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-sky-700">{promptText}</p>
      <div className="mb-3 flex items-center justify-center gap-3">
        <span aria-hidden="true" className="text-6xl [@media(max-height:420px)]:text-5xl">
          <EmojiVisual emoji={question.emoji} animated variant="block" />
        </span>
        <span className="text-4xl font-extrabold text-sky-900 [@media(max-height:420px)]:text-3xl">
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
        {question.options.map((option, index) => (
          <button
            key={`option-${index}-${option}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            aria-label={optionLabel(option)}
          >
            <span className="text-3xl font-extrabold">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
