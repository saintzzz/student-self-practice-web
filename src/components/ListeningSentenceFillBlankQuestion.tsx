import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import type { ListeningSentenceFillBlankQuestion as ListeningSentenceFillBlankQuestionType } from '../types';
import { speakSentence } from '../lib/speech';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import AudioPlaybackWarning from './AudioPlaybackWarning';
import { SUBMIT_ANSWER_BUTTON_CLASSNAME } from './actionButtonStyle';
import ListenButtons from './ListenButtons';
import QuestionBanner from './QuestionBanner';
import GapBankDrag from './drag/GapBankDrag';
import { useGapInputMode } from '../hooks/useGapInputMode';
import { useViewer } from '../lib/viewer/ViewerContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { IconBook, IconPencil } from './icons';
import { GAP_INPUT_TOGGLE } from '../lib/ui/tokens';

const INSTRUCTION = 'Nghe câu và điền từ còn thiếu nhé!';

interface ListeningSentenceFillBlankQuestionProps {
  question: ListeningSentenceFillBlankQuestionType;
  hasAnswered: boolean;
  onSubmit: (typedAnswer: string) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
  /** CR-82 (D-15): reports content-audio loading to the board's
      thinking-pose signal (child -> board). */
  onAudioLoadingChange?: (loading: boolean) => void;
}

/**
 * Round 2 of the v5 Batch/Round model (plan.md "Round 2 - Listening
 * Sentence Fill-Blank"). Reuses the exact same play-audio-button /
 * answer-input / submit-answer-button / answer-feedback contract as the
 * older bare-word ListeningFillBlankQuestion - only the content is now a
 * full sentence with the target word blanked out.
 *
 * CR-82 (DESIGN-SPEC-v5 s13.7, R-v5-10): on a bank-eligible G1-2 item the
 * word bank is the primary input AND typing is a peer choice on the same
 * surface - `gap-input-toggle` and tap-empty-gap-to-type switch modes,
 * clearing unsubmitted state and never submitting. G3-5 and ineligible
 * items keep the unchanged typed form. V8: a mid-item audio failure
 * forces typing for that item (toggle hidden, AudioPlaybackWarning
 * shown) without writing the stored preference.
 */
export default function ListeningSentenceFillBlankQuestion({
  question,
  hasAnswered,
  onSubmit,
  speakerKey,
  onAudioLoadingChange,
}: ListeningSentenceFillBlankQuestionProps) {
  const [inputValue, setInputValue] = useState('');
  const { band } = useViewer();
  const reducedMotion = usePrefersReducedMotion();
  const { mode: preferredMode, setMode: setPreferredMode } = useGapInputMode();
  const [announcement, setAnnouncement] = useState('');
  const bankOffered = !!question.bank && band === 'G12';
  const demo = useDemoHint(bankOffered ? 'gap-bank' : 'listening-sentence-fill-blank');
  const formRef = useRef<HTMLFormElement>(null);
  const bankRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hasPlayed, playbackFailed, isLoading, play, playSlow } = useAudioPlayback((onStatus, speed) =>
    speakSentence(question.sentence, onStatus, speed),
    question.sentence,
  );

  useEffect(() => {
    onAudioLoadingChange?.(isLoading);
  }, [isLoading, onAudioLoadingChange]);

  /* s13.7: V8 audio failure forces typing for this item only; the stored
     preference is left untouched so the next healthy item keeps it. */
  const mode: 'bank' | 'type' = bankOffered && !playbackFailed ? preferredMode : 'type';
  const showToggle = bankOffered && !playbackFailed && !hasAnswered;

  function switchMode(next: 'bank' | 'type'): void {
    if (hasAnswered) return;
    setPreferredMode(next); // session preference (D-14)
    setInputValue(''); // switching clears unsubmitted state, never submits
    setAnnouncement(next === 'type' ? 'Đã chuyển sang gõ tay' : 'Đã chuyển sang chọn từ');
    if (next === 'type') {
      /* s13.7: autofocus the input on switch (tap-the-gap lands here). */
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (hasAnswered) return;
    onSubmit(inputValue);
  }

  return (
    <div>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
      {mode === 'type' ? (
        <p className="mb-3 text-3xl font-extrabold text-white">{question.displaySentence}</p>
      ) : null}
      <ListenButtons hasPlayed={hasPlayed} play={play} playSlow={playSlow} />
      {playbackFailed && <AudioPlaybackWarning />}

      {mode === 'bank' ? (
        <div ref={bankRef} className="relative">
          <GapBankDrag
            displaySentence={question.displaySentence}
            options={question.bank!.options}
            disabled={hasAnswered}
            reducedMotion={reducedMotion}
            onRequestTyping={() => switchMode('type')}
            onSubmit={onSubmit}
          />
          {demo.showDemo && !hasAnswered ? (
            <DemoHint containerRef={bankRef} variant="drag" onDone={demo.dismiss} />
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} ref={formRef} className="relative flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <input
            type="text"
            ref={inputRef}
            data-testid="answer-input"
            value={inputValue}
            disabled={hasAnswered}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Gõ từ còn thiếu..."
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

      {/* s13.7: the mode toggle - "Gõ tay" offers typing from bank mode,
          "Chọn từ" returns to the bank. aria-pressed = typing mode on. */}
      {showToggle ? (
        <button
          type="button"
          data-testid="gap-input-toggle"
          aria-pressed={mode === 'type'}
          onClick={() => switchMode(mode === 'bank' ? 'type' : 'bank')}
          className={`${GAP_INPUT_TOGGLE} mt-4 inline-flex items-center gap-2`}
        >
          {mode === 'bank' ? (
            <>
              <IconPencil size={18} aria-hidden="true" /> Gõ tay
            </>
          ) : (
            <>
              <IconBook size={18} aria-hidden="true" /> Chọn từ
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
