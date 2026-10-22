import { useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '../../lib/sfx';
import { listeningImageRounds } from '../sources';
import { EmojiChoiceField, GameRoundDots, HintButton, gameVerdictSfx, pickFiftyFifty } from '../mechanics';
import { specFor } from '../levels';
import { HeartMeter, useGameLives } from '../lives';
import type { GameProps } from '../types';

const ROUNDS = 5;

/**
 * CR-83 Game 4 - Cau ca (Fishing): the target word is READ on the card
 * (text prompt, plus a replay speaker for pre-readers); four fish carry
 * picture options. Tap the right fish to land it in the bucket.
 */
export default function FishingCatch({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const rounds = useMemo(
    () => listeningImageRounds(grade.id, seed, spec.rounds),
    [grade.id, seed, spec.rounds],
  );
  const [round, setRound] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lock, setLock] = useState(false);
  const [hints, setHints] = useState<number[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const lives = useGameLives(spec.lives);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[round];
  if (!q) return null;

  const advance = (addedPoints: number, wasCorrect: boolean) => {
    const nextPoints = points + addedPoints;
    const nextCorrect = correctCount + (wasCorrect ? 1 : 0);
    setPoints(nextPoints);
    setCorrectCount(nextCorrect);
    setWrongPicks([]);
    setHints([]);
    if (round + 1 >= rounds.length) {
      onEnd({ points: nextPoints, maxPoints: spec.rounds * 2, correctCount: nextCorrect , attempted: spec.rounds});
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
    const left = lives.lose();
    if (left <= 0) {
      setLock(true);
      timerRef.current = setTimeout(
        () => onEnd({ points, maxPoints: spec.rounds * 2, correctCount, attempted: Math.min(round + 1, spec.rounds) }),
        650,
      );
      return;
    }
    if (next.length >= spec.missLimit) {
      setLock(true);
      timerRef.current = setTimeout(() => advance(0, false), 650);
    }
  };

  const useHint = () => {
    if (hintUsed || lock || lives.out) return;
    setHintUsed(true);
    setHints(pickFiftyFifty(q.correctIndex, q.options.length, `${seed}:h${round}`));
  };

  return (
    <div data-testid="game-fishing-catch" className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-6 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <span className="font-display text-3xl font-extrabold tracking-wide text-slate-800">{q.word}</span>
      </div>
      <div className="w-full rounded-3xl border border-sky-300/30 bg-gradient-to-b from-sky-500/25 to-sky-800/40 px-3 py-5">
        <EmojiChoiceField
          options={q.options}
          correctIndex={q.correctIndex}
          variant="fish"
          wrongPicks={[...wrongPicks, ...hints]}
          disabled={lock}
          onPick={pick}
        />
      </div>
      <HintButton used={hintUsed} disabled={lock || lives.out} onUse={useHint} />
      <p className="text-sm font-semibold text-sky-200/80">Chạm con cá đúng nhé!</p>
    </div>
  );
}
