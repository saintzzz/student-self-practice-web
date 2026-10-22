import { useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '../../lib/sfx';
import { listeningImageRounds } from '../sources';
import { EmojiChoiceField, GameRoundDots, ModelSpeaker, gameVerdictSfx } from '../mechanics';
import { specFor } from '../levels';
import { HeartMeter, useGameLives } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 6;

/**
 * CR-84 Game 8 - Cho Heo an (Feed the Pig): Heo is hungry - the order
 * card shows the word (tap-to-hear for pre-readers); four plates carry
 * pictures. Feed Heo the right plate. First-try feed = 2 pts, retry = 1,
 * else 0 after 2 misses.
 */
export default function FeedThePig({ grade, seed, level, onEnd }: GameProps) {
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
  const [fed, setFed] = useState(false);
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
    setFed(false);
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
      setFed(true);
      const earned = wrongPicks.length === 0 ? 2 : 1;
      timerRef.current = setTimeout(() => advance(earned, true), 700);
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

  return (
    <div data-testid="game-feed-the-pig" className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span
          data-testid="pig-face"
          className={`text-6xl transition-transform motion-reduce:transition-none ${fed ? 'scale-125' : 'game-bob'}`}
        >
          <EmojiVisual emoji={fed ? '😋' : '🐷'} animated variant="block" />
        </span>
        <span className="text-sm font-semibold text-slate-300">
          {fed ? 'Ngon quá!' : 'Heo đói bụng rồi!'}
        </span>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <span className="font-display text-2xl font-extrabold tracking-wide text-slate-800">{q.word}</span>
        <ModelSpeaker word={q.word} key={q.id} />
      </div>
      <EmojiChoiceField
        options={q.options}
        correctIndex={q.correctIndex}
        variant="food"
        wrongPicks={wrongPicks}
        disabled={lock}
        onPick={pick}
      />
    </div>
  );
}
