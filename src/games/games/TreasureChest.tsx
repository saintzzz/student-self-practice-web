import { useEffect, useMemo, useRef, useState } from 'react';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { imageChoiceRounds } from '../sources';
import { GameRoundDots, WordChoiceField, gameVerdictSfx } from '../mechanics';
import type { GameProps } from '../types';

const ROUNDS = 5;
const LOCKS = 3;

/**
 * CR-84 Game 10 - Hom kho bau (Treasure Chest): a locked chest holds 3
 * padlocks. Every first/second-try correct answer cracks a lock; a miss
 * earns nothing. Open all 3 locks before the questions run out to loot
 * the chest. Scoring: first-try 2 / second-try 1 / 0 per round, max 10.
 */
export default function TreasureChest({ grade, seed, onEnd }: GameProps) {
  const rounds = useMemo(() => imageChoiceRounds(grade.id, seed, ROUNDS), [grade.id, seed]);
  const [round, setRound] = useState(0);
  const [locksOpen, setLocksOpen] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lock, setLock] = useState(false);
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[Math.min(round, rounds.length - 1)];

  const advance = (earned: number, opened: boolean, newCorrect: number) => {
    const nextPoints = points + earned;
    const nextLocks = locksOpen + (opened ? 1 : 0);
    setPoints(nextPoints);
    setLocksOpen(nextLocks);
    setWrongPicks([]);
    const done = round + 1 >= rounds.length || nextLocks >= LOCKS;
    if (done) {
      if (endedRef.current) return;
      endedRef.current = true;
      onEnd({ points: nextPoints, maxPoints: ROUNDS * 2, correctCount: newCorrect });
      return;
    }
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
      const earned = wrongPicks.length === 0 ? 2 : 1;
      timerRef.current = setTimeout(() => advance(earned, true, newCorrect), 650);
      return;
    }
    const next = [...wrongPicks, index];
    setWrongPicks(next);
    if (next.length >= 2) {
      timerRef.current = setTimeout(() => advance(0, false, newCorrect), 650);
      return;
    }
    setLock(false);
  };

  if (!q) return null;
  const visual = getWordVisual(q.wordId);

  return (
    <div data-testid="game-treasure-chest" className="flex flex-col items-center gap-4">
      <GameRoundDots total={rounds.length} done={round} />
      <div
        data-testid="chest-visual"
        className={`relative flex h-28 w-40 items-center justify-center rounded-3xl border-4 border-amber-700/80 bg-gradient-to-b from-amber-600 to-amber-800 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.6)] ${locksOpen >= LOCKS ? 'game-flip-in' : ''}`}
      >
        <span className="text-6xl">{locksOpen >= LOCKS ? '🎁' : '🧰'}</span>
        <div className="absolute -bottom-3 flex gap-2">
          {Array.from({ length: LOCKS }).map((_, i) => (
            <span
              key={i}
              data-testid={`lock-${i}`}
              className={`text-2xl transition-all motion-reduce:transition-none ${i < locksOpen ? '-translate-y-2 opacity-30' : ''}`}
            >
              {i < locksOpen ? '🔓' : '🔒'}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <span className="text-4xl">{visual?.emoji ?? q.emoji}</span>
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
      <p className="text-sm font-semibold text-slate-300">Trả lời đúng để mở ổ khóa nhé!</p>
    </div>
  );
}
