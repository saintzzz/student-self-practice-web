import { useEffect, useMemo, useRef, useState } from 'react';
import { imageChoiceRounds } from '../sources';
import { GameRoundDots, WordChoiceField, gameVerdictSfx } from '../mechanics';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { specFor } from '../levels';
import { HeartMeter } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 8;
const PATH = 6;
const SLIMES = ['🟢', '👾', '🦠', '🧟'];

interface Slime {
  id: number;
  cell: number;
  emoji: string;
}

/**
 * CR-85 Game 15 - Giu thanh (Castle Guard, Tower-Defense-lite): slimes
 * march the path toward the castle. Correct answer fires a bolt that
 * pops the front slime; a miss lets the whole wave creep one cell. A
 * slime reaching the gate costs a heart - 3 hearts, 8 waves.
 */
export default function CastleGuard({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const creep = Math.round(spec.speedScale);
  const rounds = useMemo(() => imageChoiceRounds(grade.id, seed, spec.rounds), [grade.id, seed, spec.rounds]);
  const [round, setRound] = useState(0);
  const [slimes, setSlimes] = useState<Slime[]>([{ id: 0, cell: 0, emoji: SLIMES[0]! }]);
  const [hearts, setHearts] = useState(spec.lives);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [boltAt, setBoltAt] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextSlimeId = useRef(1);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[Math.min(round, rounds.length - 1)];

  const finish = (finalCorrect: number, finalPoints: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnd({ points: finalPoints, maxPoints: rounds.length, correctCount: finalCorrect , attempted: rounds.length});
  };

  const advance = (newSlimes: Slime[], newHearts: number, newCorrect: number, newPoints: number) => {
    // Wave result already computed; new slime enters for the next round.
    setSlimes(newSlimes);
    setHearts(newHearts);
    setWrongPicks([]);
    setBoltAt(null);
    if (newHearts <= 0 || round + 1 >= rounds.length) {
      finish(newCorrect, newPoints);
      return;
    }
    const emoji = SLIMES[(round + 1) % SLIMES.length]!;
    const id = nextSlimeId.current++;
    setSlimes((prev) => [...prev, { id, cell: 0, emoji }]);
    setRound(round + 1);
    setLock(false);
  };

  const pick = (index: number) => {
    if (lock || !q || endedRef.current) return;
    const correct = index === q.correctIndex;
    gameVerdictSfx(correct);
    setLock(true);
    const newCorrect = correctCount + (correct ? 1 : 0);
    setCorrectCount(newCorrect);
    if (correct) {
      // First-try = full point; a second-try answer pops the slime but
      // only earns half, so a miss caps the run below 3 stars.
      const newPoints = points + (wrongPicks.length === 0 ? 1 : 0.5);
      setPoints(newPoints);
      // Bolt pops the slime closest to the gate (max cell).
      const front = slimes.reduce<Slime | null>(
        (best, s) => (best === null || s.cell > best.cell ? s : best),
        null,
      );
      if (front) setBoltAt(front.id);
      timerRef.current = setTimeout(() => {
        advance(slimes.filter((s) => s.id !== front?.id), hearts, newCorrect, newPoints);
      }, 700);
      return;
    }
    const next = [...wrongPicks, index];
    setWrongPicks(next);
    if (next.length >= spec.missLimit) {
      timerRef.current = setTimeout(() => {
        // Missed round: the whole wave creeps forward one cell.
        let newHearts = hearts;
        const moved: Slime[] = [];
        for (const s of slimes) {
          if (s.cell + creep >= PATH) newHearts -= 1;
          else moved.push({ ...s, cell: s.cell + creep });
        }
        advance(moved, newHearts, newCorrect, points);
      }, 750);
      return;
    }
    setLock(false);
  };

  if (!q) return null;
  const visual = getWordVisual(q.wordId);

  return (
    <div data-testid="game-castle-guard" className="flex flex-col items-center gap-4">
      <GameRoundDots total={rounds.length} done={round} />
      <HeartMeter testId="castle-hearts" lives={hearts} max={spec.lives} />
      {/* The path: slimes enter at cell 0, castle at the right end. */}
      <div data-testid="castle-path" className="flex items-center gap-1.5">
        {Array.from({ length: PATH }, (_, cell) => (
          <div
            key={cell}
            data-testid={`path-cell-${cell}`}
            className="flex h-14 w-12 items-center justify-center rounded-xl border-2 border-amber-900/50 bg-gradient-to-b from-amber-800/60 to-amber-950/70 text-3xl"
          >
            {slimes
              .filter((s) => s.cell === cell)
              .map((s) => (
                <span
                  key={s.id}
                  className={boltAt === s.id ? 'game-flip-in' : 'game-drift'}
                >
                  <EmojiVisual emoji={boltAt === s.id ? '💥' : s.emoji} variant="block" />
                </span>
              ))}
          </div>
        ))}
        <div
          data-testid="castle-gate"
          className="flex h-16 w-14 items-center justify-center rounded-2xl border-4 border-amber-700/80 bg-gradient-to-b from-amber-500/70 to-amber-700/70 text-4xl"
        >
          <EmojiVisual emoji="🏰" variant="block" />
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji={visual?.emoji ?? q.emoji} imageUrl={visual?.imageUrl} animated variant="block" className="text-4xl" />
        <span className="text-base font-semibold text-slate-500">là từ nào?</span>
      </div>
      <WordChoiceField
        key={q.id}
        options={q.options}
        correctIndex={q.correctIndex}
        wrongPicks={wrongPicks}
        disabled={lock}
        onPick={pick}
      />
      <p className="text-sm font-semibold text-slate-300">Đúng để bắn hạ quái, sai là quái tiến gần cổng!</p>
    </div>
  );
}
