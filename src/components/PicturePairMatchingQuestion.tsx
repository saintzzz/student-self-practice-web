import { useEffect, useRef, useState } from 'react';
import type { PicturePairMatchingQuestion as PicturePairMatchingQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';
import {
  MAX_PAIR_MATCHING_MISTAKES,
  clickPairMatchingTile,
  createPairMatchingBoardState,
  dropPairMatchingTile,
  getPairMatchingOutcome,
  isPairMatchingTileMatched,
} from '../lib/rounds/pairMatchingBoard';
import { useViewer } from '../lib/viewer/ViewerContext';
import { useDragTile } from '../hooks/useDragTile';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import { QUESTION_BODY, QUESTION_BODY_CENTER, toy } from '../lib/ui/tokens';

import { InstructionSpeaker } from './InstructionSpeaker';

const INSTRUCTION = 'Ghép mỗi từ tiếng Anh với đúng hình của nó nhé!';

interface PicturePairMatchingQuestionProps {
  question: PicturePairMatchingQuestionType;
  hasAnswered: boolean;
  onSubmit: (isCorrect: boolean) => void;
  /** kids-UX s3.2: round-scoped autoplay key for the instruction speaker. */
  speakerKey?: string;
}

function tileClassName(isMatched: boolean, isPending: boolean, isWrongFlash: boolean, dragEnabled: boolean): string {
  /* CR-79 toy-block: structural base keeps size/radius/focus only - each
     state branch now owns its complete face+shadow so tokens never
     concatenate onto judged classes. r30: touch-none while drag is armed -
     pan-y lets the browser steal vertical/diagonal drags via pointercancel;
     the surrounding card still scrolls from non-tile space. */
  const base =
    'flex min-h-[76px] w-full items-center justify-center rounded-2xl border-4 p-4 text-2xl font-bold ' +
    `transition focus:outline-none focus:ring-4 focus:ring-amber-400/60 disabled:cursor-not-allowed ${dragEnabled ? 'touch-none' : 'touch-pan-y'}`;

  if (isMatched) {
    return `${base} border-emerald-400 bg-gradient-to-b from-emerald-500/25 to-emerald-600/15 text-emerald-100 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(5,150,105,0.25),0_6px_14px_-6px_rgba(5,150,105,0.45)]';
  }
  if (isWrongFlash) {
    return `${base} border-rose-400 bg-gradient-to-b from-rose-500/25 to-rose-600/15 text-rose-100 ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(225,29,72,0.25),0_6px_14px_-6px_rgba(225,29,72,0.45)]';
  }
  if (isPending) {
    return `${base} border-amber-400/70 bg-gradient-to-b from-amber-500/25 to-amber-600/15 text-white ` +
      'shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(217,119,6,0.25),0_6px_14px_-6px_rgba(217,119,6,0.45)]';
  }
  /* CR-79 toy.face/faceHover/pressed - the "toy block" read. */
  return `${base} ${toy.face} ${toy.faceHover} ${toy.pressed} border-[#2a3a5e] text-white`;
}

/**
 * Round 4 addition (plan.md v8 "Round 4 Addition: Picture-Pair-Matching
 * Board"). Renders the board's 8 shuffled tiles and drives the pure
 * `clickPairMatchingTile` reducer locally in component state - the same
 * "internal multi-step interaction, single final submit callback" shape as
 * `hooks/usePronunciationRecording.ts` (see that file for the precedent).
 * `onSubmit(isCorrect)` fires exactly once, the moment the board resolves
 * (all 4 pairs found, or the mistake budget exceeded - AC32).
 *
 * QuestionCard mounts this with `key={question.id}` (same as every other
 * kind), so a fresh board always starts from a clean reducer state.
 */
export default function PicturePairMatchingQuestion({
  question,
  hasAnswered,
  onSubmit,
  speakerKey,
}: PicturePairMatchingQuestionProps) {
  const [state, setState] = useState(createPairMatchingBoardState);
  const hasSubmittedRef = useRef(false);
  const outcome = getPairMatchingOutcome(state);
  const viewer = useViewer();
  const demo = useDemoHint('picture-pair-matching');
  const gridRef = useRef<HTMLDivElement>(null);

  /* CR-79: drag-to-connect for G1-2; tap stays for everyone. */
  const dragEnabled = viewer.band === 'G12' && !hasAnswered && outcome === null;
  const drag = useDragTile({
    enabled: dragEnabled,
    targetAttr: 'data-pair-index',
    onDrop: (src, dst) =>
      setState((prev) => dropPairMatchingTile(prev, question.tiles, src, dst)),
  });

  useEffect(() => {
    if (outcome === null || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    onSubmit(outcome === 'solved');
  }, [outcome, onSubmit]);

  function handleTileClick(tileIndex: number, detail: number): void {
    if (hasAnswered) return;
    if (drag.shouldSuppressClick(detail)) return;
    setState((prev) => clickPairMatchingTile(prev, question.tiles, tileIndex));
  }

  return (
    <div className={QUESTION_BODY}>
      <div className={QUESTION_BODY_CENTER}>
      <div className="mb-2 flex items-center justify-center gap-2">
        <p className="text-xl font-semibold text-amber-200">{INSTRUCTION}</p>
        <InstructionSpeaker text={INSTRUCTION} lang="vi-VN" autoplayKey={speakerKey} />
      </div>
      <p data-testid="pair-matching-mistake-count" className="mb-2 text-lg font-bold text-rose-300">
        Sai: {state.mistakeCount}/{MAX_PAIR_MATCHING_MISTAKES}
      </p>

      <div ref={gridRef} className="relative grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        {question.tiles.map((tile, index) => {
          const isMatched = outcome === 'failed' || isPairMatchingTileMatched(state, question.tiles, index);
          const isPending = state.pendingTileIndex === index;
          const isWrongFlash =
            !isMatched &&
            state.lastAttempt !== null &&
            !state.lastAttempt.correct &&
            (state.lastAttempt.tileIndexA === index || state.lastAttempt.tileIndexB === index);
          const isDropHover =
            drag.dragging && drag.hoverIndex === index && index !== drag.sourceIndex && !isMatched;

          return (
            <button
              key={`tile-${index}`}
              type="button"
              data-testid={`pair-tile-${index}`}
              data-pair-index={index}
              data-correct={isMatched ? 'true' : isWrongFlash ? 'false' : undefined}
              disabled={hasAnswered || isMatched || outcome !== null}
              onClick={(e) => handleTileClick(index, e.detail)}
              onPointerDown={drag.onPointerDown(index)}
              onPointerMove={drag.onPointerMove}
              onPointerUp={drag.onPointerUp}
              onPointerCancel={drag.onPointerCancel}
              onLostPointerCapture={drag.onLostPointerCapture}
              className={
                tileClassName(isMatched, isPending, isWrongFlash, dragEnabled) +
                (isDropHover ? ' ring-4 ring-amber-300' : '')
              }
              // CR-02: picture tiles announce their emoji so screen readers
              // can play the same matching game sighted users get; word
              // tiles already carry their text label.
              aria-label={tile.tileType === 'picture' ? tile.label : undefined}
            >
              {tile.tileType === 'picture' ? (
                <span aria-hidden="true">
                  <EmojiVisual emoji={tile.label} />
                </span>
              ) : (
                tile.label
              )}
            </button>
          );
        })}
        {demo.showDemo && !hasAnswered ? (
          <DemoHint containerRef={gridRef} variant="drag" onDone={demo.dismiss} />
        ) : null}
      </div>
      {drag.ghostNode}
      </div>
    </div>
  );
}
