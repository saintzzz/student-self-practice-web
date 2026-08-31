import { useEffect, useRef, useState } from 'react';
import type { PicturePairMatchingQuestion as PicturePairMatchingQuestionType } from '../types';
import {
  MAX_PAIR_MATCHING_MISTAKES,
  clickPairMatchingTile,
  createPairMatchingBoardState,
  getPairMatchingOutcome,
  isPairMatchingTileMatched,
} from '../lib/rounds/pairMatchingBoard';

interface PicturePairMatchingQuestionProps {
  question: PicturePairMatchingQuestionType;
  hasAnswered: boolean;
  onSubmit: (isCorrect: boolean) => void;
}

function tileClassName(isMatched: boolean, isPending: boolean, isWrongFlash: boolean): string {
  const base =
    'flex min-h-[76px] w-full items-center justify-center rounded-2xl border-4 p-4 text-2xl font-bold ' +
    'transition focus:outline-none focus:ring-4 focus:ring-sky-500 disabled:cursor-not-allowed';

  if (isMatched) return `${base} border-emerald-500 bg-emerald-50 text-emerald-900`;
  if (isWrongFlash) return `${base} border-rose-500 bg-rose-50 text-rose-900`;
  if (isPending) return `${base} border-amber-400 bg-amber-50 text-sky-900`;
  return `${base} border-sky-200 bg-white text-sky-900 hover:border-sky-400`;
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
}: PicturePairMatchingQuestionProps) {
  const [state, setState] = useState(createPairMatchingBoardState);
  const hasSubmittedRef = useRef(false);
  const outcome = getPairMatchingOutcome(state);

  useEffect(() => {
    if (outcome === null || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    onSubmit(outcome === 'solved');
  }, [outcome, onSubmit]);

  function handleTileClick(tileIndex: number): void {
    if (hasAnswered) return;
    setState((prev) => clickPairMatchingTile(prev, question.tiles, tileIndex));
  }

  return (
    <div>
      <p className="mb-4 text-xl font-semibold text-sky-700">Ghép mỗi từ tiếng Anh với đúng hình của nó nhé!</p>
      <p data-testid="pair-matching-mistake-count" className="mb-4 text-lg font-bold text-rose-600">
        Sai: {state.mistakeCount}/{MAX_PAIR_MATCHING_MISTAKES}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {question.tiles.map((tile, index) => {
          const isMatched = outcome === 'failed' || isPairMatchingTileMatched(state, question.tiles, index);
          const isPending = state.pendingTileIndex === index;
          const isWrongFlash =
            !isMatched &&
            state.lastAttempt !== null &&
            !state.lastAttempt.correct &&
            (state.lastAttempt.tileIndexA === index || state.lastAttempt.tileIndexB === index);

          return (
            <button
              key={`tile-${index}`}
              type="button"
              data-testid={`pair-tile-${index}`}
              data-correct={isMatched ? 'true' : isWrongFlash ? 'false' : undefined}
              disabled={hasAnswered || isMatched || outcome !== null}
              onClick={() => handleTileClick(index)}
              className={tileClassName(isMatched, isPending, isWrongFlash)}
            >
              {tile.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
