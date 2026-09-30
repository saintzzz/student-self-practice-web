import { useEffect, useRef, useState } from 'react';
import type { PicturePairMatchingQuestion as PicturePairMatchingQuestionType } from '../types';
import { EmojiVisual } from './EmojiVisual';
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
  /* CR-12 DS-X3: memory tiles become flip-card keys - gradient face,
     sheen + bottom edge; states keep their semantic colors. */
  const base =
    'flex min-h-[76px] w-full items-center justify-center rounded-2xl border-4 p-4 text-2xl font-bold ' +
    'shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(0,0,0,0.08),0_4px_10px_-4px_rgba(15,23,42,0.15)] ' +
    'transition hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none ' +
    'motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-amber-400/60 disabled:cursor-not-allowed';

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
  return `${base} border-[#2a3a5e] bg-gradient-to-b from-[#1d3465] to-[#162C55] text-white ` +
    'hover:border-amber-400/70 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.15),inset_0_-4px_0_rgba(0,0,0,0.08),0_8px_18px_-6px_rgba(56,189,248,0.5)]';
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
      <p className="mb-2 text-xl font-semibold text-amber-200">Ghép mỗi từ tiếng Anh với đúng hình của nó nhé!</p>
      <p data-testid="pair-matching-mistake-count" className="mb-2 text-lg font-bold text-rose-300">
        Sai: {state.mistakeCount}/{MAX_PAIR_MATCHING_MISTAKES}
      </p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
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
      </div>
    </div>
  );
}
