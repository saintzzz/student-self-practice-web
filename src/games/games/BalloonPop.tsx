import { useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '../../lib/sfx';
import { listeningImageRounds } from '../sources';
import { EmojiChoiceField, GameRoundDots, ModelSpeaker, gameVerdictSfx } from '../mechanics';
import { specFor } from '../levels';
import type { GameProps } from '../types';

const ROUNDS = 5;

/**
 * CR-83 Game 2 - Bong bay (Balloon Pop): TTS speaks a word, four balloon
 * pictures drift; pop the right one. First-try pop = 2 pts, second = 1,
 * else 0 and the round moves on after 2 misses.
 */
export default function BalloonPop({ grade, seed, level, onEnd }: GameProps) {
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
    if (next.length >= spec.missLimit) {
      setLock(true);
      timerRef.current = setTimeout(() => advance(0, false), 650);
    }
  };

  return (
    <div data-testid="game-balloon-pop" className="flex flex-col items-center gap-5">
      <GameRoundDots total={rounds.length} done={round} />
      <ModelSpeaker word={q.word} key={q.id} />
      <EmojiChoiceField
        options={q.options}
        correctIndex={q.correctIndex}
        variant="balloon"
        wrongPicks={wrongPicks}
        disabled={lock}
        onPick={pick}
      />
    </div>
  );
}
