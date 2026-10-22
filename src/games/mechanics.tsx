import { playSfx } from '../lib/sfx';
import { IconSpeaker } from '../components/icons';
import { speakWord } from '../lib/speech';
import { seededShuffleIndices } from '../lib/prng';
import { EmojiVisual } from '../components/EmojiVisual';
import type { SpellTile } from '../types';

/**
 * CR-83 shared step-mechanics - the bare interactives the six arcade
 * games are built on, exported through `GAME_MECHANICS` so exam/practice
 * surfaces can adopt the same steps later (the "sap xep cho phan thi"
 * contract). Each field owns ONLY the interaction: prompts, rounds,
 * scoring and framing live in the game shells.
 */

/* ------------------------------------------------------------------ */
/* EmojiChoiceField - pick 1 of 4 picture options.                      */
/* Used by: BalloonPop ('balloon'), FishingCatch ('fish'), WhackMole    */
/* ('mole'), FeedThePig ('food'); and any 'listening-image-choice' /    */
/* 'describe-and-choose-image' surface.                                 */
/* ------------------------------------------------------------------ */

export interface EmojiChoiceFieldProps {
  /** 4 emoji strings (already resolved by the caller). */
  options: readonly string[];
  correctIndex: number;
  /** Which visual dress the options wear inside the game scene. */
  variant?: 'grid' | 'balloon' | 'fish' | 'mole' | 'food';
  /** Indexes already tapped wrongly - render dimmed/disabled. */
  wrongPicks?: readonly number[];
  disabled?: boolean;
  onPick: (index: number) => void;
}

const BALLOON_COLORS = [
  'from-rose-400 to-rose-600',
  'from-sky-400 to-sky-600',
  'from-amber-400 to-amber-600',
  'from-emerald-400 to-emerald-600',
];

export function EmojiChoiceField({
  options,
  correctIndex,
  variant = 'grid',
  wrongPicks = [],
  disabled,
  onPick,
}: EmojiChoiceFieldProps) {
  return (
    <div
      data-testid="emoji-choice-field"
      className={variant === 'fish' ? 'grid grid-cols-4 gap-2' : 'grid grid-cols-2 gap-3'}
    >
      {options.map((emoji, i) => {
        const wrong = wrongPicks.includes(i);
        const base =
          'relative flex items-center justify-center transition motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-300';
        if (variant === 'balloon') {
          return (
            <button
              key={i}
              type="button"
              data-testid={`option-${i}`}
              data-correct={i === correctIndex}
              disabled={disabled || wrong}
              onClick={() => onPick(i)}
              className={`${base} game-bob mx-auto h-24 w-20 flex-col rounded-t-full rounded-b-[3rem] bg-gradient-to-b ${BALLOON_COLORS[i % 4]} text-4xl shadow-[inset_0_4px_0_rgba(255,255,255,0.3),0_8px_18px_-6px_rgba(0,0,0,0.5)] hover:-translate-y-1 active:scale-95 disabled:opacity-35 disabled:hover:translate-y-0 ${wrong ? 'game-shake' : ''}`}
              style={{ animationDelay: `${i * 220}ms` }}
            >
              {/* CR-91: light disc stage so the art reads on the balloon
                  (was: raw emoji on a saturated fill - same value band,
                  the picture was the least legible element). */}
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-[inset_0_2px_0_rgba(255,255,255,0.8),0_2px_6px_-2px_rgba(0,0,0,0.35)]">
                <EmojiVisual emoji={emoji} variant="block" className="text-3xl" />
              </span>
              <span aria-hidden className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-inherit" />
            </button>
          );
        }
        if (variant === 'fish') {
          return (
            <button
              key={i}
              type="button"
              data-testid={`option-${i}`}
              data-correct={i === correctIndex}
              disabled={disabled || wrong}
              onClick={() => onPick(i)}
              className={`${base} game-drift h-20 rounded-2xl border-2 border-sky-200/50 bg-gradient-to-b from-sky-400 to-sky-600 text-3xl shadow-[inset_0_2px_0_rgba(255,255,255,0.4),0_6px_14px_-6px_rgba(0,0,0,0.5)] hover:-translate-y-1 active:scale-95 disabled:opacity-35 disabled:hover:translate-y-0 ${wrong ? 'game-shake' : ''}`}
              style={{ animationDelay: `${i * 340}ms` }}
            >
              {/* CR-91: light disc stage - art pops, tile keeps its hue. */}
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-[inset_0_2px_0_rgba(255,255,255,0.8),0_2px_6px_-2px_rgba(0,0,0,0.3)]">
                <EmojiVisual emoji={emoji} variant="block" className="text-2xl" />
              </span>
            </button>
          );
        }
        if (variant === 'mole') {
          return (
            <button
              key={i}
              type="button"
              data-testid={`option-${i}`}
              data-correct={i === correctIndex}
              disabled={disabled || wrong}
              onClick={() => onPick(i)}
              className={`${base} mx-auto h-24 w-24 flex-col overflow-hidden rounded-b-full rounded-t-[2rem] border-b-8 border-amber-950/60 bg-gradient-to-b from-amber-800/70 to-amber-950/80 shadow-[inset_0_10px_18px_-6px_rgba(0,0,0,0.7)] active:scale-95 disabled:opacity-40 ${wrong ? 'game-shake' : ''}`}
              aria-label={`Lỗ ${i + 1}: ${emoji}`}
            >
              <span
                className={`game-peek flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-amber-100 to-amber-200 text-4xl shadow-[inset_0_3px_0_rgba(255,255,255,0.6)] ${wrong ? 'opacity-40' : ''}`}
                style={{ animationDelay: `${i * 300}ms` }}
              >
                <EmojiVisual emoji={emoji} variant="block" />
              </span>
            </button>
          );
        }
        if (variant === 'food') {
          return (
            <button
              key={i}
              type="button"
              data-testid={`option-${i}`}
              data-correct={i === correctIndex}
              disabled={disabled || wrong}
              onClick={() => onPick(i)}
              className={`${base} game-bob mx-auto h-24 w-24 flex-col rounded-full border-4 border-amber-100/80 bg-gradient-to-b from-amber-50 to-orange-100 text-4xl shadow-[inset_0_4px_0_rgba(255,255,255,0.7),0_10px_20px_-8px_rgba(0,0,0,0.55)] hover:-translate-y-1 active:scale-95 disabled:opacity-35 disabled:hover:translate-y-0 ${wrong ? 'game-shake' : ''}`}
              style={{ animationDelay: `${i * 240}ms` }}
            >
              <EmojiVisual emoji={emoji} variant="block" className="text-4xl drop-shadow-sm" />
            </button>
          );
        }
        return (
          <button
            key={i}
            type="button"
            data-testid={`option-${i}`}
            data-correct={i === correctIndex}
            disabled={disabled || wrong}
            onClick={() => onPick(i)}
            className={`${base} h-24 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 text-5xl shadow-[0_8px_20px_-8px_rgba(0,0,0,0.55)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 ${wrong ? 'game-shake' : ''}`}
          >
            <EmojiVisual emoji={emoji} variant="block" />
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WordChoiceField - pick 1 of 4 word tiles (cream Scrabble family).    */
/* Used by: RacingCars, TicTacToe; adoptable by every MCQ kind.         */
/* ------------------------------------------------------------------ */

export interface WordChoiceFieldProps {
  options: readonly string[];
  correctIndex: number;
  wrongPicks?: readonly number[];
  disabled?: boolean;
  onPick: (index: number) => void;
}

export function WordChoiceField({
  options,
  correctIndex,
  wrongPicks = [],
  disabled,
  onPick,
}: WordChoiceFieldProps) {
  return (
    <div data-testid="word-choice-field" className="grid grid-cols-2 gap-3">
      {options.map((word, i) => {
        const wrong = wrongPicks.includes(i);
        return (
          <button
            key={i}
            type="button"
            data-testid={`option-${i}`}
            data-correct={i === correctIndex}
            disabled={disabled || wrong}
            onClick={() => onPick(i)}
            className={`flex min-h-[64px] items-center justify-center rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-3 text-xl font-extrabold text-slate-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-4px_0_rgba(180,83,9,0.2),0_8px_20px_-8px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-amber-300 disabled:opacity-40 disabled:hover:translate-y-0 ${wrong ? 'game-shake' : ''}`}
          >
            {word}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LetterOrderField - tap letter bubbles in spelling order.             */
/* Used by: LetterCatch; adoptable by 'listening-fill-blank' spell.     */
/* ------------------------------------------------------------------ */

export interface LetterOrderFieldProps {
  /** All bubbles on the strip - target letters + distractors. */
  tiles: readonly SpellTile[];
  /** Letters placed so far (tile ids, in order). */
  placedIds: readonly string[];
  /** Currently flashing-wrong tile id (one shot). */
  wrongTileId?: string | null;
  disabled?: boolean;
  onTap: (tile: SpellTile) => void;
}

export function LetterOrderField({
  tiles,
  placedIds,
  wrongTileId,
  disabled,
  onTap,
}: LetterOrderFieldProps) {
  return (
    <div data-testid="letter-order-field" className="flex flex-wrap justify-center gap-2.5">
      {tiles.map((tile, i) => {
        const placed = placedIds.includes(tile.id);
        const wrong = wrongTileId === tile.id;
        return (
          <button
            key={tile.id}
            type="button"
            data-testid={`letter-${tile.id}`}
            disabled={disabled || placed}
            onClick={() => onTap(tile)}
            className={`game-bubble flex h-14 w-14 items-center justify-center rounded-full font-display text-2xl font-extrabold transition motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-sky-300 ${
              placed
                ? 'scale-75 bg-emerald-300 text-emerald-950 opacity-40'
                : 'bg-gradient-to-b from-sky-300 to-sky-500 text-sky-950 shadow-[inset_0_3px_0_rgba(255,255,255,0.45),0_6px_14px_-4px_rgba(14,165,233,0.5)] hover:-translate-y-1 active:scale-90'
            } ${wrong ? 'game-shake' : ''}`}
            style={{ animationDelay: `${i * 160}ms` }}
          >
            {tile.letter}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PairBoardField - face-down memory grid (emoji <-> word pairs).       */
/* Used by: MemoryMatch; adoptable by 'picture-pair-matching' rounds.   */
/* ------------------------------------------------------------------ */

export interface PairBoardTile {
  id: string;
  pairId: string;
  face: 'emoji' | 'word';
  label: string;
}

export interface PairBoardFieldProps {
  tiles: readonly PairBoardTile[];
  /** Indexes currently face-up (unmatched). */
  openIndexes: readonly number[];
  /** Indexes permanently matched. */
  matchedIndexes: ReadonlySet<number>;
  onFlip: (index: number) => void;
}

export function PairBoardField({ tiles, openIndexes, matchedIndexes, onFlip }: PairBoardFieldProps) {
  return (
    <div data-testid="pair-board-field" className="grid w-full max-w-sm grid-cols-4 gap-2.5">
      {tiles.map((tile, i) => {
        const faceUp = openIndexes.includes(i) || matchedIndexes.has(i);
        return (
          <button
            key={tile.id}
            type="button"
            data-testid={`memory-card-${i}`}
            data-face-up={faceUp}
            disabled={faceUp}
            onClick={() => onFlip(i)}
            aria-label={faceUp ? tile.label : 'Lật thẻ'}
            className={`flex aspect-square items-center justify-center rounded-2xl border-2 transition motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-300 ${
              faceUp
                ? 'game-flip-in border-amber-200/80 bg-gradient-to-b from-amber-50 to-orange-100'
                : 'border-sky-400/40 bg-gradient-to-b from-navy-700 to-navy-900 hover:-translate-y-0.5'
            } ${matchedIndexes.has(i) ? 'ring-2 ring-emerald-300' : ''}`}
          >
            {faceUp ? (
              tile.face === 'emoji' ? (
                <EmojiVisual emoji={tile.label} variant="block" className="text-4xl" />
              ) : (
                <span className="px-1 text-center text-lg font-extrabold text-slate-800">{tile.label}</span>
              )
            ) : (
              <span className="text-2xl text-sky-300/70">★</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ModelSpeaker - explicit "Nghe" replay chip for audio-prompt games.   */
/* ------------------------------------------------------------------ */

export function ModelSpeaker({ word }: { word: string }) {
  return (
    <button
      type="button"
      data-testid="game-listen-button"
      onClick={() => speakWord(word)}
      aria-label={`Nghe từ ${word}`}
      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-2.5 text-lg font-bold text-amber-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.45),0_4px_10px_-3px_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-300"
    >
      <IconSpeaker size={20} /> Nghe từ
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared bits                                                    */
/* ------------------------------------------------------------------ */

export function GameRoundDots({
  total,
  done,
  testId = 'game-round-dots',
}: {
  total: number;
  done: number;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="flex items-center gap-1.5" aria-label={`Câu ${done + 1} trên ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < done ? 'bg-amber-300' : i === done ? 'bg-rose-400' : 'bg-white/20'}`}
        />
      ))}
    </div>
  );
}

/** Shared verdict tap sfx helper used by every shell. */
export function gameVerdictSfx(correct: boolean): void {
  playSfx(correct ? 'correct' : 'wrong');
}

/* ------------------------------------------------------------------ */
/* CR-101: generalized 50:50 hint (QuizShow's lifeline for every        */
/* choice-field game). One use PER RUN - hides two wrong options. The  */
/* hidden indexes are kept in a separate `hints` state (never merged   */
/* into wrongPicks for scoring) so a hint costs no heart, no point and */
/* no missLimit slot - it is a bail-out, not a failure.                 */
/* ------------------------------------------------------------------ */

/** Two distinct wrong option indexes, deterministic per question seed. */
export function pickFiftyFifty(correctIndex: number, count: number, seed: string): number[] {
  const wrong = Array.from({ length: count }, (_, i) => i).filter((i) => i !== correctIndex);
  return seededShuffleIndices(wrong.length, `${seed}:5050`)
    .slice(0, 2)
    .map((i) => wrong[i]!);
}

export function HintButton({
  used,
  disabled,
  onUse,
}: {
  used: boolean;
  disabled?: boolean;
  onUse: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="hint-5050"
      disabled={used || disabled}
      onClick={onUse}
      aria-label="Trợ giúp 50:50 - giấu 2 đáp án sai"
      className="rounded-full border-2 border-sky-300/60 bg-navy-800/80 px-5 py-2 text-sm font-bold text-sky-200 transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-40 disabled:hover:translate-y-0"
    >
      {used ? 'Đã dùng 50:50' : <><EmojiVisual emoji="💡" variant="inline" /> Trợ giúp 50:50</>}
    </button>
  );
}
