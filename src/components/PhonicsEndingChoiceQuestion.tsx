import { useRef } from 'react';
import type { PhonicsBlendChoiceQuestion, PhonicsFinalChoiceQuestion } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { EmojiVisual } from './EmojiVisual';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';
import QuestionBanner from './QuestionBanner';
import { IconRefresh, IconSpeaker } from './icons';

type EndingChoiceQuestion = PhonicsFinalChoiceQuestion | PhonicsBlendChoiceQuestion;

interface PhonicsEndingChoiceQuestionProps {
  question: EndingChoiceQuestion;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
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
  speakerKey,
}: PhonicsEndingChoiceQuestionProps) {
  const { hasPlayed, playbackFailed, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(question.word, onStatus, speed), question.word);
  const hasAnswered = selectedIndex !== null;
  const demo = useDemoHint(question.kind);
  const gridRef = useRef<HTMLDivElement>(null);

  const isFinal = question.kind === 'phonics-final-choice';
  const promptText = isFinal ? 'Từ này kết thúc bằng âm nào?' : 'Từ này bắt đầu bằng cụm âm nào?';
  const optionLabel = (option: string) => (isFinal ? `âm ${option}` : `cụm ${option}`);

  return (
    <div>
      <QuestionBanner text={promptText} speakerKey={speakerKey} />
      <div className="mb-3 flex items-center justify-center gap-3">
        <span aria-hidden="true" className="text-6xl [@media(max-height:420px)]:text-5xl">
          <EmojiVisual emoji={question.emoji} animated variant="block" />
        </span>
        <span className="font-display text-4xl font-extrabold text-amber-100 [@media(max-height:420px)]:text-3xl">
          {question.word}
        </span>
        <button
          type="button"
          data-testid="play-audio-button"
          onClick={play}
          className={AUDIO_BUTTON_CLASSNAME}
        >
          {hasPlayed ? <><IconRefresh size={18} /> Nghe lại</> : <><IconSpeaker size={18} /> Nghe</>}
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

      <div ref={gridRef} className="relative grid grid-cols-2 gap-4 sm:grid-cols-4">
        {question.options.map((option, index) => (
          <button
            key={`option-${index}-${option}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
            aria-label={getOptionLabelPrefix(index, selectedIndex, question.correctIndex) + optionLabel(option)}
          >
            <span className="text-3xl font-extrabold">
              {getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}
              {option}
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
