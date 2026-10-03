import type { PhonicsRhymeChoiceQuestion as PhonicsRhymeChoiceQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName } from './optionButtonStyle';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';

interface PhonicsRhymeChoiceQuestionProps {
  question: PhonicsRhymeChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
}

/**
 * CR-06 phonics - rhyming (PRD section 15.2): the prompt word is shown
 * (with its picture) and spoken; the student picks the option WORD that
 * rhymes with it. Options are text, not pictures - rhyming is a
 * sound+spelling skill, so hiding the rime ending behind a picture would
 * remove exactly what the child must compare (BA ruling 15.2). Option
 * buttons carry their word text as the accessible name; exactly one option
 * is in the prompt's rhyme group.
 */
export default function PhonicsRhymeChoiceQuestion({
  question,
  selectedIndex,
  onSelectOption,
}: PhonicsRhymeChoiceQuestionProps) {
  const { hasPlayed, playbackFailed, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(question.word, onStatus, speed));
  const hasAnswered = selectedIndex !== null;

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-amber-200">Từ nào có vần giống từ này?</p>
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

      <div className="grid grid-cols-2 gap-4">
        {question.options.map((option, index) => (
          <button
            key={`option-${index}-${option}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
          >
            <span className="text-2xl font-extrabold [@media(max-height:420px)]:text-xl">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
