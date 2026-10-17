import { useEffect, useMemo, useRef, useState } from 'react';
import { seededShuffleIndices } from '../../lib/prng';
import { spellableWords } from '../sources';
import { gameVerdictSfx } from '../mechanics';
import type { GameProps } from '../types';

const COLS = 6;
const ROWS = 5;
const HEARTS = 3;
const WORDS_PER_RUN = 3;
const DISTRACTORS = 3;
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

interface LetterCell {
  cell: number;
  letter: string;
  /** index into the target word, -1 = distractor */
  target: number;
}

/**
 * CR-85 Game 14 - Ran danh van (Word Worm): a turn-based snake. Arrow
 * buttons step the worm one cell; eat letters in spelling order to grow.
 * Wrong letter, wall or self-bite costs a heart - 3 hearts, 3 words.
 */
export default function WordWorm({ grade, seed, onEnd }: GameProps) {
  const words = useMemo(
    () => spellableWords(grade.id, seed, WORDS_PER_RUN).map((w) => w.word.toLowerCase()),
    [grade.id, seed],
  );
  const [wordIdx, setWordIdx] = useState(0);
  const [snake, setSnake] = useState<number[]>([Math.floor(ROWS / 2) * COLS + 2]);
  const [letterIdx, setLetterIdx] = useState(0);
  const [cells, setCells] = useState<LetterCell[]>([]);
  const [hearts, setHearts] = useState(HEARTS);
  const [eaten, setEaten] = useState(0);
  const endedRef = useRef(false);
  const snakeRef = useRef(snake);
  snakeRef.current = snake;

  const word = words[Math.min(wordIdx, words.length - 1)] ?? '';
  const totalLetters = useMemo(() => words.reduce((s, w) => s + w.length, 0), [words]);

  // Seed the letter cells for the current word on free cells.
  useEffect(() => {
    if (!word) return;
    const free = Array.from({ length: COLS * ROWS }, (_, i) => i).filter(
      (c) => !snakeRef.current.includes(c),
    );
    const order = seededShuffleIndices(free.length, `${seed}:worm:${wordIdx}`);
    const placed: LetterCell[] = [];
    for (let i = 0; i < word.length && i < order.length; i += 1) {
      placed.push({ cell: free[order[i]!]!, letter: word[i]!, target: i });
    }
    const others = ALPHA.split('').filter((c) => !word.includes(c));
    for (let d = 0; d < DISTRACTORS && word.length + d < order.length; d += 1) {
      const letter = others[(d * 7 + wordIdx * 3) % others.length]!;
      placed.push({ cell: free[order[word.length + d]!]!, letter, target: -1 });
    }
    setCells(placed);
    setLetterIdx(0);
  }, [wordIdx, word, seed]);

  const finish = (finalEaten: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnd({ points: finalEaten, maxPoints: totalLetters, correctCount: finalEaten });
  };

  const hurt = (newHearts: number) => {
    gameVerdictSfx(false);
    setHearts(newHearts);
    if (newHearts <= 0) finish(eaten);
  };

  const move = (dx: number, dy: number) => {
    if (endedRef.current || !word) return;
    const head = snakeRef.current[0]!;
    const hx = head % COLS;
    const hy = Math.floor(head / COLS);
    const nx = hx + dx;
    const ny = hy + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      hurt(hearts - 1); // wall bump
      return;
    }
    const next = ny * COLS + nx;
    if (snakeRef.current.includes(next)) {
      hurt(hearts - 1); // self-bite
      return;
    }
    const letter = cells.find((c) => c.cell === next);
    if (letter && letter.target === letterIdx) {
      // Correct letter - eat, grow, advance the spelling.
      gameVerdictSfx(true);
      const newEaten = eaten + 1;
      setEaten(newEaten);
      setSnake([next, ...snakeRef.current]);
      setCells((prev) => prev.filter((c) => c !== letter));
      if (letterIdx + 1 >= word.length) {
        if (wordIdx + 1 >= words.length) {
          finish(newEaten);
          return;
        }
        setWordIdx(wordIdx + 1);
      } else {
        setLetterIdx(letterIdx + 1);
      }
      return;
    }
    if (letter && letter.target !== letterIdx) {
      // Wrong letter costs a heart. Only expendable distractors are
      // removed - a real target letter stays on the board or the word
      // could never be finished (review r1 soft-lock).
      hurt(hearts - 1);
      if (letter.target === -1) {
        setCells((prev) => prev.filter((c) => c !== letter));
      }
      if (hearts - 1 <= 0) return;
    }
    setSnake([next, ...snakeRef.current.slice(0, -1)]);
  };

  const targetLetter = word[letterIdx] ?? '';
  const letterAt = (cell: number) => cells.find((c) => c.cell === cell);

  if (!word) return null;

  return (
    <div data-testid="game-word-worm" className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 text-xl" data-testid="worm-hearts">
        {Array.from({ length: HEARTS }, (_, i) => (
          <span key={i} className={i < hearts ? '' : 'opacity-25'}>❤️</span>
        ))}
      </div>
      {/* Spelling strip - the letter the worm must eat next glows. */}
      <div data-testid="worm-word" className="flex items-center gap-1.5">
        {word.split('').map((ch, i) => (
          <span
            key={i}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 font-display text-lg font-extrabold ${
              i < letterIdx
                ? 'border-emerald-300 bg-emerald-300/90 text-emerald-950'
                : i === letterIdx
                  ? 'border-amber-300 bg-amber-300/90 text-amber-950'
                  : 'border-white/25 bg-navy-800 text-slate-400'
            }`}
          >
            {ch}
          </span>
        ))}
      </div>
      {/* Board */}
      <div
        data-testid="worm-board"
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))` }}
      >
        {Array.from({ length: COLS * ROWS }, (_, cell) => {
          const isHead = snake[0] === cell;
          const isBody = !isHead && snake.includes(cell);
          const letter = letterAt(cell);
          return (
            <div
              key={cell}
              data-testid={`worm-cell-${cell}`}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-extrabold ${
                isHead
                  ? 'bg-emerald-400'
                  : isBody
                    ? 'bg-emerald-600/80'
                    : letter
                      ? 'border border-amber-200/60 bg-gradient-to-b from-amber-50 to-orange-100 text-slate-800'
                      : 'bg-navy-800/70'
              }`}
            >
              {isHead ? '🐛' : isBody ? '' : letter ? letter.letter : ''}
            </div>
          );
        })}
      </div>
      {/* Direction pad */}
      <div className="grid grid-cols-3 gap-1.5" data-testid="worm-pad">
        <span />
        <button type="button" data-testid="worm-up" aria-label="Lên" onClick={() => move(0, -1)} className="worm-btn">⬆️</button>
        <span />
        <button type="button" data-testid="worm-left" aria-label="Trái" onClick={() => move(-1, 0)} className="worm-btn">⬅️</button>
        <button type="button" data-testid="worm-down" aria-label="Xuống" onClick={() => move(0, 1)} className="worm-btn">⬇️</button>
        <button type="button" data-testid="worm-right" aria-label="Phải" onClick={() => move(1, 0)} className="worm-btn">➡️</button>
      </div>
      <p className="text-sm font-semibold text-slate-300">
        Ăn chữ <span className="text-amber-300">{targetLetter.toUpperCase()}</span> tiếp theo nhé!
      </p>
    </div>
  );
}
