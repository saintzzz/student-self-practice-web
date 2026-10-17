import { useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '../../lib/sfx';
import { listeningImageRounds } from '../sources';
import { EmojiChoiceField, GameRoundDots, ModelSpeaker, gameVerdictSfx } from '../mechanics';
import type { GameProps } from '../types';

const ROUNDS = 5;

/**
 * CR-84 Game 7 - Dap chuot (Whack-a-mole): TTS speaks a word, four moles
 * peek from dirt holes carrying pictures; whack the right one.
 * First-try whack = 2 pts, second = 1, else 0 after 2 misses.
 */
export default function WhackMole({ grade, seed, onEnd }: GameProps) {
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
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

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
    <div data-testid="game-whack-a-mole" className="flex flex-col items-center gap-5">
      <GameRoundDots total={rounds.length} done={round} />
      <ModelSpeaker word={q.word} key={q.id} />
      <EmojiChoiceField
        options={q.options}
        correctIndex={q.correctIndex}
        variant="mole"
        wrongPicks={wrongPicks}
        disabled={lock}
        onPick={pick}
      />
      <p className="text-sm font-semibold text-slate-300">Nghe từ rồi đập con chuột đúng nhé!</p>
    </div>
  );
}
