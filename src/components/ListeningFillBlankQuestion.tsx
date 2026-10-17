import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import type { ListeningFillBlankQuestion as ListeningFillBlankQuestionType } from '../types';
import { speakWord } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { SUBMIT_ANSWER_BUTTON_CLASSNAME } from './actionButtonStyle';
import ListenButtons from './ListenButtons';
import QuestionBanner from './QuestionBanner';
import SpellItDrag from './drag/SpellItDrag';
import { useViewer } from '../lib/viewer/ViewerContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const INSTRUCTION_TYPED = 'Nghe và gõ từ em nghe được nhé!';
const INSTRUCTION_SPELL = 'Nghe và xếp chữ cái thành từ nhé!';

interface ListeningFillBlankQuestionProps {
  question: ListeningFillBlankQuestionType;
  hasAnswered: boolean;
  onSubmit: (typedAnswer: string) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
  /** CR-82 (D-15): reports content-audio loading to the board's
      thinking-pose signal (child -> board). */
  onAudioLoadingChange?: (loading: boolean) => void;
}

export default function ListeningFillBlankQuestion({
  question,
  hasAnswered,
  onSubmit,
  speakerKey,
  onAudioLoadingChange,
}: ListeningFillBlankQuestionProps) {
  const [inputValue, setInputValue] = useState('');
  const { band } = useViewer();
  const reducedMotion = usePrefersReducedMotion();
  /* CR-82 (D-04): the payload carries the Spell-it tiles baked at build
     time; band === 'G12' is the defense-in-depth render gate. */
  const spellMode = !!question.spell && band === 'G12';
  const demo = useDemoHint(spellMode ? 'listening-fill-blank-spell' : 'listening-fill-blank');
  const formRef = useRef<HTMLFormElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const { hasPlayed, playbackFailed, isLoading, play, playSlow } = useAudioPlayback((onStatus, speed) => speakWord(question.word, onStatus, speed), question.word);

  useEffect(() => {
    onAudioLoadingChange?.(isLoading);
  }, [isLoading, onAudioLoadingChange]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (hasAnswered) return;
    onSubmit(inputValue);
  }

  return (
    <div>
      <QuestionBanner text={spellMode ? INSTRUCTION_SPELL : INSTRUCTION_TYPED} speakerKey={speakerKey} />
      <ListenButtons hasPlayed={hasPlayed} play={play} playSlow={playSlow} />
      {playbackFailed && <AudioPlaybackWarning />}
      {spellMode ? (
        <div ref={boardRef} className="relative">
          <SpellItDrag
            tiles={question.spell!.tiles}
            slotCount={question.word.length}
            disabled={hasAnswered}
            reducedMotion={reducedMotion}
            onSubmit={onSubmit}
          />
          {demo.showDemo && !hasAnswered ? (
            <DemoHint containerRef={boardRef} variant="drag" onDone={demo.dismiss} />
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} ref={formRef} className="relative flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <input
            type="text"
            data-testid="answer-input"
            value={inputValue}
            disabled={hasAnswered}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Gõ từ em nghe được..."
            className="min-h-[76px] w-full rounded-2xl border-4 border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] px-5 py-4 text-2xl font-semibold text-white shadow-inner transition focus:border-amber-400/70 focus:outline-none focus:ring-4 focus:ring-amber-400/60 focus:shadow-[0_8px_20px_-8px_rgba(56,189,248,0.5)] disabled:bg-white/10 sm:w-64"
          />
          <button type="submit" data-testid="submit-answer-button" disabled={hasAnswered} className={SUBMIT_ANSWER_BUTTON_CLASSNAME}>
            Kiểm tra
          </button>
          {demo.showDemo && !hasAnswered ? (
            <DemoHint containerRef={formRef} onDone={demo.dismiss} />
          ) : null}
        </form>
      )}
    </div>
  );
}
