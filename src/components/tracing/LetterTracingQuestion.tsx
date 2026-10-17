import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LetterTracingQuestion as LetterTracingQuestionType, TracingMeta } from '../../types';
import { GLYPH_STROKES } from '../../data/tracing/strokes';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { speakWord } from '../../lib/speech';
import { playSfx } from '../../lib/sfx';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { useDemoHint } from '../../hooks/useDemoHint';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useViewer } from '../../lib/viewer/ViewerContext';
import {
  BTN_AUDIO,
  BTN_SECONDARY_NAVY,
  material,
  QUESTION_BODY,
  QUESTION_BODY_CENTER,
  TYPE_LETTER_WORD_PAPER,
} from '../../lib/ui/tokens';
import { EmojiVisual } from '../EmojiVisual';
import QuestionBanner from '../QuestionBanner';
import DemoHint from '../DemoHint';
import { IconEye, IconPencil, IconRefresh, IconSpeaker } from '../icons';
import TracingCanvas, { type StrokeState } from './TracingCanvas';

const INSTRUCTION = 'Tô theo nét chữ nhé. Bắt đầu từ chấm xanh.';
const RETRY_LINE = 'Gần đúng rồi - em tô lại nét này nhé.';
/** spec s16.4: the completion glow before the feedback sheet appears. */
const COMPLETE_GLOW_MS = 400;
const DEMO_MS_PER_STROKE = 1200;

export interface LetterTracingQuestionProps {
  question: LetterTracingQuestionType;
  hasAnswered: boolean;
  /** -> QuestionCard.onSubmitTracing (D-10 telemetry included). */
  onSubmit: (isCorrect: boolean, meta: TracingMeta) => void;
  speakerKey?: string;
  /** D-15: exhibit-speaker loading state forwarded to the board. */
  onAudioLoadingChange?: (loading: boolean) => void;
  /** spec s12.7: drawing suppresses the `thinking` pose. */
  onDrawingChange?: (drawing: boolean) => void;
}

/**
 * CR-82 (DESIGN-SPEC-v5 s12): letter tracing for G1-2 pre-writers -
 * paper slate + stroke guide + pointer ink, with the assisted ladder
 * (fail 2 -> demo + tolerance x1.5; fail 3 -> auto-draw) so a child is
 * never stuck, and the "Tô tự động từng nét" keyboard/switch path
 * (R-v5-07).
 */
export default function LetterTracingQuestion({
  question,
  hasAnswered,
  onSubmit,
  speakerKey,
  onAudioLoadingChange,
  onDrawingChange,
}: LetterTracingQuestionProps) {
  const glyph = GLYPH_STROKES[question.letter];
  const strokeCount = glyph?.strokes.length ?? 0;
  const { density } = useViewer();
  const reducedMotion = usePrefersReducedMotion();

  const [strokeStates, setStrokeStates] = useState<StrokeState[]>(
    () => Array.from({ length: strokeCount }, (_, i) => (i === 0 ? 'active' : 'pending')),
  );
  /** Failed attempts per stroke (meta.attempts). */
  const [attempts, setAttempts] = useState<number[]>(() => Array.from({ length: strokeCount }, () => 0));
  const [assisted, setAssisted] = useState(false);
  /** Strokes passed on their 1st/2nd try count toward isCorrect. */
  const cleanPassRef = useRef<boolean[]>(Array.from({ length: strokeCount }, () => false));
  const [demoTick, setDemoTick] = useState(0);
  const [statusLine, setStatusLine] = useState<string>('');
  const [glow, setGlow] = useState(false);
  const submittedRef = useRef(false);
  /* The delayed submit timer - must be cancellable so "Tô lại" inside
     the 400ms glow window (or unmount) cannot deliver a stale answer
     (external review r34-A4). */
  const submitTimerRef = useRef<number | null>(null);
  const slateRef = useRef<HTMLDivElement>(null);
  const demo = useDemoHint('letter-tracing');

  const activeStroke = strokeStates.findIndex((s) => s === 'active');

  const exampleWord = useMemo(() => getWordVisual(question.exampleWordId), [question.exampleWordId]);
  const spokenExhibit = useMemo(
    () => `${question.letter}, ${exampleWord?.word ?? question.letter}`,
    [question.letter, exampleWord],
  );
  const audio = useAudioPlayback(
    useCallback((onStatus, speed) => speakWord(spokenExhibit, onStatus, speed), [spokenExhibit]),
    spokenExhibit,
  );
  useEffect(() => {
    onAudioLoadingChange?.(audio.isLoading);
  }, [audio.isLoading, onAudioLoadingChange]);

  const finishLetter = useCallback(
    (states: StrokeState[], fails: number[], opts?: { forceCorrect?: boolean; assisted?: boolean }) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setGlow(true);
      setStatusLine('Em tô xong chữ rồi!');
      /* spec s12.5 step 5: isCorrect = every stroke passed within <=2
         attempts with no auto-draw. The keyboard/switch path (R-v5-07)
         submits isCorrect=true by spec - the assisted flag still marks
         it for skill-stat exclusion (D-10). `opts.assisted` carries the
         flag synchronously - `setAssisted` earlier in the same handler
         has not flushed into this closure yet (external review r34-A3). */
      const isCorrect =
        opts?.forceCorrect === true ||
        states.every((s, i) => s === 'done' && cleanPassRef.current[i] === true);
      const metaAssisted = opts?.assisted ?? assisted;
      /* The glow holds 400ms, then the sheet. */
      submitTimerRef.current = window.setTimeout(() => {
        submitTimerRef.current = null;
        onSubmit(isCorrect, { assisted: metaAssisted, attempts: fails });
      }, reducedMotion ? 0 : COMPLETE_GLOW_MS);
    },
    [assisted, onSubmit, reducedMotion],
  );

  /* Never deliver a pending submit after unmount (round exit). */
  useEffect(
    () => () => {
      if (submitTimerRef.current !== null) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
    },
    [],
  );

  const advanceFrom = useCallback(
    (states: StrokeState[], fails: number[], opts?: { forceCorrect?: boolean; assisted?: boolean }) => {
      if (states.every((s) => s === 'done' || s === 'auto')) {
        finishLetter(states, fails, opts);
        return;
      }
      const next = states.findIndex((s) => s === 'pending');
      if (next >= 0) {
        const nextStates = [...states];
        nextStates[next] = 'active';
        setStrokeStates(nextStates);
      }
    },
    [finishLetter],
  );

  const handleStrokeResult = useCallback(
    (r: { index: number; pass: boolean }) => {
      const fails = [...attempts];
      if (r.pass) {
        /* A pass on the 1st or 2nd try (<=1 fail) is "clean" for the
           isCorrect formula (spec s12.5 step 5, <=2 attempts). */
        cleanPassRef.current[r.index] = fails[r.index]! <= 1;
        const states = [...strokeStates];
        states[r.index] = 'done';
        setStrokeStates(states);
        setStatusLine(`Nét ${r.index + 1} trên ${strokeCount} xong rồi`);
        /* CR-82 (spec s16.3): tracing-stroke-done tap - ui tier, dropped
           while a verdict/reward or speech is playing. */
        playSfx('tap');
        advanceFrom(states, fails);
      } else {
        fails[r.index] = fails[r.index]! + 1;
        setAttempts(fails);
        setStatusLine(RETRY_LINE);
        /* CR-83: no spoken retry line - instruction voice is disabled
           product-wide; the visual status line above carries the hint. */
        if (fails[r.index]! === 2) {
          /* spec s12.5 step 3: auto-demo once + tolerance x1.5 (assisted). */
          setAssisted(true);
          setDemoTick((t) => t + 1);
        } else if (fails[r.index]! >= 3) {
          /* spec s12.5 step 4: the stroke draws itself, flow moves on. */
          setAssisted(true);
          const states = [...strokeStates];
          states[r.index] = 'auto';
          setStrokeStates(states);
          setDemoTick((t) => t + 1);
          /* Pass the flag explicitly - `assisted` in this closure is
             still false (r34-A3). */
          advanceFrom(states, fails, { assisted: true });
        }
      }
    },
    [attempts, strokeStates, strokeCount, advanceFrom],
  );

  const handleStartMiss = useCallback(() => {
    setStatusLine('Bắt đầu từ chấm xanh nhé.');
  }, []);

  /** "Tô lại" - a clean restart of the whole letter. */
  const handleReset = useCallback(() => {
    /* Cancel any pending glow-submit first - otherwise the stale answer
       fires moments after the board is wiped (r34-A4). */
    if (submitTimerRef.current !== null) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    submittedRef.current = false;
    setGlow(false);
    cleanPassRef.current = Array.from({ length: strokeCount }, () => false);
    setAttempts(Array.from({ length: strokeCount }, () => 0));
    setAssisted(false);
    setStrokeStates(Array.from({ length: strokeCount }, (_, i) => (i === 0 ? 'active' : 'pending')));
    setStatusLine('Tô lại từ nét đầu nhé.');
  }, [strokeCount]);

  /** Keyboard/switch path: each press auto-draws the next stroke (R-v5-07). */
  const handleAutoStep = useCallback(() => {
    const idx = activeStroke < 0 ? strokeStates.findIndex((s) => s === 'pending') : activeStroke;
    if (idx < 0) return;
    setAssisted(true);
    setDemoTick((t) => t + 1);
    const states = [...strokeStates];
    states[idx] = 'auto';
    setStrokeStates(states);
    setStatusLine(`Nét ${idx + 1} tự tô xong`);
    /* R-v5-07: the keyboard equivalent submits isCorrect=true (spec
       s12.7), always flagged assisted for skill stats - flag passed
       explicitly because `setAssisted` above has not flushed (r34-A3). */
    advanceFrom(states, attempts, { forceCorrect: true, assisted: true });
  }, [activeStroke, strokeStates, attempts, advanceFrom]);

  /* The demo overlay: the active stroke draws itself once (1200ms/stroke,
     spec s16.4). Under reduced motion the static arrows already carry the
     direction - no animation is queued. */
  const demoPath = demoTick > 0 && !reducedMotion && activeStroke >= 0 ? glyph?.strokes[activeStroke] : undefined;
  const demoPathD = useMemo(
    () => (demoPath ? demoPath.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ') : ''),
    [demoPath],
  );

  if (!glyph) {
    /* Stroke table gap - data-only miss, degrade to the assisted path so
       the round is never dead (same spirit as the canvas error row). */
    return (
      <div className={QUESTION_BODY}>
        <div className={QUESTION_BODY_CENTER}>
          <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
          <p className="text-slate-300">Chữ này chưa có nét mẫu - bấm "Tô tự động từng nét" để qua nhé.</p>
          <button
            type="button"
            data-testid="tracing-auto-step"
            className={`${BTN_SECONDARY_NAVY} mt-3`}
            onClick={() => onSubmit(true, { assisted: true, attempts: [] })}
          >
            <IconPencil size={20} /> Tô tự động từng nét
          </button>
        </div>
      </div>
    );
  }

  const exhibitText = exampleWord?.word ?? '';
  const letterIdx = exhibitText.toLowerCase().indexOf(question.letter.toLowerCase());

  return (
    <div className={QUESTION_BODY} data-tracing-attempts={JSON.stringify(attempts)}>
      <div className={QUESTION_BODY_CENTER}>
        <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />

        {/* Exhibit: word picture + the word with its target letter
            underlined, plus the "Nghe mẫu" speaker (s12.3). */}
        <div className={`${material.exhibitPaper} mb-3 flex items-center gap-3`}>
          {exampleWord && (
            <span className="text-4xl" aria-hidden="true">
              <EmojiVisual emoji={exampleWord.emoji} imageUrl={exampleWord.imageUrl} />
            </span>
          )}
          <span className={TYPE_LETTER_WORD_PAPER}>
            {letterIdx >= 0 ? (
              <>
                {exhibitText.slice(0, letterIdx)}
                <span className="underline decoration-amber-600 decoration-4">
                  {exhibitText.slice(letterIdx, letterIdx + question.letter.length)}
                </span>
                {exhibitText.slice(letterIdx + question.letter.length)}
              </>
            ) : (
              exhibitText
            )}
          </span>
          <button
            type="button"
            data-testid="play-audio-button"
            onClick={audio.play}
            className={BTN_AUDIO}
            aria-label={`Nghe mẫu: ${spokenExhibit}`}
          >
            <IconSpeaker size={20} /> Nghe mẫu
          </button>
        </div>

        {/* Controls - auto-step sits BEFORE the canvas in tab order
            (spec s12.7 keyboard/switch alternative). */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            data-testid="tracing-auto-step"
            disabled={hasAnswered || activeStroke < 0}
            onClick={handleAutoStep}
            className={`${BTN_SECONDARY_NAVY}`}
            style={{ minHeight: density.primaryMinH }}
          >
            <IconPencil size={20} /> Tô tự động từng nét
          </button>
          <button
            type="button"
            data-testid="tracing-demo"
            disabled={hasAnswered || activeStroke < 0}
            onClick={() => setDemoTick((t) => t + 1)}
            className={BTN_SECONDARY_NAVY}
            style={{ minHeight: density.primaryMinH }}
          >
            <IconEye size={20} /> Xem mẫu
          </button>
          <button
            type="button"
            data-testid="tracing-reset"
            disabled={hasAnswered}
            onClick={handleReset}
            className={BTN_SECONDARY_NAVY}
            style={{ minHeight: density.primaryMinH }}
          >
            <IconRefresh size={20} /> Tô lại
          </button>
        </div>

        {/* Slate: square paper, ô li guides inside the canvas component. */}
        <div
          ref={slateRef}
          data-testid="tracing-slate"
          role="group"
          aria-label={`Khung tô chữ ${question.letter}`}
          className={`relative mx-auto ${material.paperSlate} size-[min(82vw,46vh,380px)] overflow-hidden p-3 [@media(max-height:480px)]:size-[min(55vw,40vh,300px)] ${
            glow ? 'ring-4 ring-emerald-400' : ''
          }`}
        >
          <TracingCanvas
            glyph={glyph}
            grade={question.grade}
            activeStroke={activeStroke < 0 ? strokeCount : activeStroke}
            strokeStates={strokeStates}
            assisted={assisted}
            disabled={hasAnswered}
            reducedMotion={reducedMotion}
            onStrokeResult={handleStrokeResult}
            onStartMiss={handleStartMiss}
            onDrawingChange={(d) => onDrawingChange?.(d)}
          />
          {/* Auto-demo overlay: stroke draws itself once, then fades. */}
          {demoPathD && (
            <svg
              key={demoTick}
              viewBox="0 0 100 100"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full p-3"
            >
              <path
                data-testid="tracing-demo-path"
                d={demoPathD}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={100}
                style={{
                  animation: `tracing-demo-draw ${DEMO_MS_PER_STROKE}ms ease-out forwards`,
                }}
              />
            </svg>
          )}
          {demo.showDemo && !hasAnswered && glyph.strokes[0] && (
            <DemoHint
              containerRef={slateRef}
              variant="trace"
              path={glyph.strokes[0] as unknown as ReadonlyArray<readonly [number, number]>}
              onDone={demo.dismiss}
            />
          )}
        </div>

        {/* Stroke progress / retry line - polite live region (s12.7). */}
        <p aria-live="polite" data-testid="tracing-status" className="mt-3 min-h-[1.5rem] text-sm font-semibold text-sky-200">
          {statusLine}
        </p>
      </div>
      {/* The demo-draw keyframes are scoped to this feature (spec s16.4:
          1200ms per stroke, opacity/transform-free path draw). */}
      <style>{`
        @keyframes tracing-demo-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
