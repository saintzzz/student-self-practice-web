import { useMemo, useRef, useState } from 'react';
import { seededShuffleIndices } from '../../lib/prng';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { imageChoiceRounds } from '../sources';
import { WordChoiceField, gameVerdictSfx } from '../mechanics';
import type { GameProps } from '../types';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

type Cell = 'X' | 'O' | null;

function winnerOf(board: Cell[]): 'X' | 'O' | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a!] && board[a!] === board[b!] && board[a!] === board[c!]) return board[a!];
  }
  return null;
}

/**
 * CR-83 Game 6 - Caro (Tic-tac-toe): tap an empty cell, answer the
 * picture->word question to claim it; a miss hands that cell - and a
 * free extra cell - to the computer. Win = 3-in-row before the board
 * fills. Score = correct answers + result bonus (win 4 / draw 2), max 9.
 */
export default function TicTacToe({ grade, seed, onEnd }: GameProps) {
  const rounds = useMemo(() => imageChoiceRounds(grade.id, seed, 9), [grade.id, seed]);
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [pendingCell, setPendingCell] = useState<number | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lock, setLock] = useState(false);
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = rounds[Math.min(qIdx, rounds.length - 1)];

  const finish = (finalBoard: Cell[], correct: number) => {
    if (endedRef.current) return;
    const w = winnerOf(finalBoard);
    const full = finalBoard.every(Boolean);
    if (!w && !full) return;
    endedRef.current = true;
    const bonus = w === 'X' ? 4 : w === null ? 2 : 0;
    timerRef.current = setTimeout(
      () => onEnd({ points: correct + bonus, maxPoints: 9, correctCount: correct }),
      700,
    );
  };

  const cpuMove = (b: Cell[], exclude?: number): Cell[] => {
    const empties = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0 && i !== exclude);
    if (!empties.length) return b;
    const pick = seededShuffleIndices(empties.length, `${seed}:cpu:${b.join('')}`)[0]!;
    const next = [...b];
    next[empties[pick]!] = 'O';
    return next;
  };

  const pickCell = (i: number) => {
    if (lock || board[i] || pendingCell !== null || endedRef.current) return;
    setPendingCell(i);
  };

  const answer = (index: number) => {
    if (pendingCell === null || lock || !q) return;
    const correct = index === q.correctIndex;
    gameVerdictSfx(correct);
    setLock(true);
    const nextCorrect = correctCount + (correct ? 1 : 0);
    setCorrectCount(nextCorrect);
    let next = [...board];
    if (correct) {
      next[pendingCell] = 'X';
      // CPU replies if the game is still open.
      if (!winnerOf(next) && next.some((c) => !c)) next = cpuMove(next);
    } else {
      next = cpuMove(next, pendingCell);
    }
    setBoard(next);
    setPendingCell(null);
    setQIdx(qIdx + 1);
    timerRef.current = setTimeout(() => {
      setLock(false);
      finish(next, nextCorrect);
    }, 700);
  };

  return (
    <div data-testid="game-tic-tac-toe" className="flex flex-col items-center gap-4">
      <div className="grid w-56 grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            data-testid={`ttt-cell-${i}`}
            disabled={!!cell || pendingCell !== null || lock}
            onClick={() => pickCell(i)}
            className={`flex aspect-square items-center justify-center rounded-2xl border-2 font-display text-3xl font-extrabold transition motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-300 ${
              pendingCell === i
                ? 'border-amber-300 bg-amber-100/90'
                : cell === 'X'
                  ? 'border-rose-300/80 bg-gradient-to-b from-rose-50 to-rose-100 text-rose-600'
                  : cell === 'O'
                    ? 'border-sky-300/80 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-600'
                    : 'border-sky-400/40 bg-gradient-to-b from-navy-700 to-navy-900 hover:-translate-y-0.5'
            }`}
          >
            {cell ?? ''}
          </button>
        ))}
      </div>
      {pendingCell !== null && q && !endedRef.current ? (
        <div className="w-full rounded-2xl border border-white/10 bg-navy-800/60 p-4">
          <p className="mb-3 flex items-center justify-center gap-2 text-center text-base font-semibold text-slate-200">
            <span className="text-4xl">{getWordVisual(q.wordId)?.emoji ?? q.emoji}</span> là từ nào?
          </p>
          <WordChoiceField
            options={q.options}
            correctIndex={q.correctIndex}
            disabled={lock}
            onPick={answer}
          />
        </div>
      ) : (
        !endedRef.current && (
          <p data-testid="ttt-prompt" className="text-base font-semibold text-slate-300">
            Chạm một ô trống để đặt X của em (trả lời đúng mới được đặt!)
          </p>
        )
      )}
    </div>
  );
}
