import { useMemo, useRef, useState } from 'react';
import { playSfx } from '../../lib/sfx';
import { listeningImageRounds } from '../sources';
import { EmojiChoiceField, GameRoundDots, gameVerdictSfx } from '../mechanics';
import type { GameProps } from '../types';

const ROUNDS = 5;

/**
 * CR-83 Game 4 - Cau ca (Fishing): the target word is READ on the card
 * (text prompt, plus a replay speaker for pre-readers); four fish carry
 * picture options. Tap the right fish to land it in the bucket.
 */
export default function FishingCatch({ grade, seed, onEnd }: GameProps) {
  const rounds = useMemo(
    () => listeningImageRounds(grade.id, seed, ROUNDS),
    [grade.id, seed],
  );
  const [round, setRound] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lock, setLock] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = rounds[round];
  if (!q) return null;

  const advance = (addedPoints: number, wasCorrect: boolean) => {
    const nextPoints = points + addedPoints;
    const nextCorrect = correctCount + (wasCorrect ? 1 : 0);
    setPoints(nextPoints);
    setCorrectCount(nextCorrect);
    setWrongPicks([]);
    if (round + 1 >= rounds.length) {
      onEnd({ points: nextPoints, maxPoints: ROUNDS * 2, correctCount: nextCorrect });
      return;
    }
    setRound(round + 1);
    setLock(false);
  };

  const pick = (index: number) => {
    if (lock) return;
    if (index === q.correctIndex) {
      gameVerdictSfx(true);
      playSfx('pop');
      setLock(true);
      const earned = wrongPicks.length === 0 ? 2 : 1;
      timerRef.current = setTimeout(() => advance(earned, true), 500);
      return;
    }
    gameVerdictSfx(false);
    const next = [...wrongPicks, index];
    setWrongPicks(next);
    if (next.length >= 2) {
      setLock(true);
      timerRef.current = setTimeout(() => advance(0, false), 650);
    }
  };

  return (
    <div data-testid="game-fishing-catch" className="flex flex-col items-center gap-5">
      <GameRoundDots total={rounds.length} done={round} />
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-6 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <span className="font-display text-3xl font-extrabold tracking-wide text-slate-800">{q.word}</span>
      </div>
      <div className="w-full rounded-3xl border border-sky-300/30 bg-gradient-to-b from-sky-500/25 to-sky-800/40 px-3 py-5">
        <EmojiChoiceField
          options={q.options}
          correctIndex={q.correctIndex}
          variant="fish"
          wrongPicks={wrongPicks}
          disabled={lock}
          onPick={pick}
        />
      </div>
      <p className="text-sm font-semibold text-sky-200/80">Chạm con cá đúng nhé!</p>
    </div>
  );
}
