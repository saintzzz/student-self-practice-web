import { useEffect, useRef } from 'react';
import type { PhonicsSoundChoiceQuestion as PhonicsSoundChoiceQuestionType } from '../types';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { EmojiVisual } from './EmojiVisual';
import { useLottieSlot } from './fx/LottieBudget';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { getOptionButtonClassName, getOptionLabelPrefix, getOptionStateAttrs } from './optionButtonStyle';
import PressableOptionButton from './PressableOptionButton';
import { AUDIO_BUTTON_CLASSNAME } from './actionButtonStyle';
import QuestionBanner from './QuestionBanner';
import { IconRefresh, IconSpeaker } from './icons';

const INSTRUCTION = 'Từ này bắt đầu bằng âm nào?';

interface PhonicsSoundChoiceQuestionProps {
  question: PhonicsSoundChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
  /** CR-82 (D-15): reports content-audio loading to the board's
      thinking-pose signal (child -> board). */
  onAudioLoadingChange?: (loading: boolean) => void;
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
  speakerKey,
  onAudioLoadingChange,
}: PhonicsSoundChoiceQuestionProps) {
  const { hasPlayed, playbackFailed, isLoading, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(question.word, onStatus, speed), question.word);

  useEffect(() => {
    onAudioLoadingChange?.(isLoading);
  }, [isLoading, onAudioLoadingChange]);

  /* CR-82 (D-20): the prompt illustration animates only when the board
     allocator grants the 'prompt' slot. */
  const promptSlot = useLottieSlot('prompt');
  const hasAnswered = selectedIndex !== null;
  const demo = useDemoHint('phonics-sound-choice');
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
      <div className="mb-3 flex items-center justify-center gap-3">
        <span aria-hidden="true" className="text-6xl [@media(max-height:420px)]:text-5xl">
          <EmojiVisual emoji={question.emoji} animated={promptSlot} variant="block" />
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
        {question.options.map((sound, index) => (
          <PressableOptionButton
            key={`option-${index}-${sound}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
            aria-label={getOptionLabelPrefix(index, selectedIndex, question.correctIndex) + `âm ${sound}`}
          >
            <span className="text-3xl font-extrabold">
              {getOptionLabelPrefix(index, selectedIndex, question.correctIndex)}
              {sound}
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
