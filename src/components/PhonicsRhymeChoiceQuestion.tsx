import { useRef } from 'react';
import type { PhonicsRhymeChoiceQuestion as PhonicsRhymeChoiceQuestionType } from '../types';
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

const INSTRUCTION = 'Từ nào có vần giống từ này?';

interface PhonicsRhymeChoiceQuestionProps {
  question: PhonicsRhymeChoiceQuestionType;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
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
  speakerKey,
}: PhonicsRhymeChoiceQuestionProps) {
  const { hasPlayed, playbackFailed, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(question.word, onStatus, speed), question.word);
  const hasAnswered = selectedIndex !== null;
  const demo = useDemoHint('phonics-rhyme-choice');
  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
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

      <div ref={gridRef} className="relative grid grid-cols-2 gap-4">
        {question.options.map((option, index) => (
          <button
            key={`option-${index}-${option}`}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionButtonClassName(index, selectedIndex, question.correctIndex)}
            {...getOptionStateAttrs(index, selectedIndex, question.correctIndex)}
          >
            <span className="text-2xl font-extrabold [@media(max-height:420px)]:text-xl">
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
