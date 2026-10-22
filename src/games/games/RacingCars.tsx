import { useEffect, useMemo, useRef, useState } from 'react';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { imageChoiceRounds } from '../sources';
import { GameRoundDots, WordChoiceField, gameVerdictSfx } from '../mechanics';
import { specFor } from '../levels';
import { HeartMeter, useGameLives } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 6;

/**
 * CR-83 Game 3 - Dua xe (Racing): every picture->word answer moves the
 * pig car one step; a miss moves the fox rival. Six questions always;
 * whoever is ahead at the end wins. Score = correct answers (max 6).
 */
export default function RacingCars({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const STEPS = spec.rounds;
  const rounds = useMemo(() => imageChoiceRounds(grade.id, seed, spec.rounds), [grade.id, seed, spec.rounds]);
  const [round, setRound] = useState(0);
  const [player, setPlayer] = useState(0);
  const [rival, setRival] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const lives = useGameLives(spec.lives);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[round];
  if (!q) return null;
  const visual = getWordVisual(q.wordId);

  const nextRound = (newCorrect: number) => {
    if (round + 1 >= rounds.length) {
      onEnd({ points: newCorrect, maxPoints: rounds.length, correctCount: newCorrect , attempted: rounds.length});
      return;
    }
    setRound(round + 1);
    setWrongPicks([]);
    setLock(false);
  };

  const pick = (index: number) => {
    if (lock) return;
    const correct = index === q.correctIndex;
    gameVerdictSfx(correct);
    setLock(true);
    if (correct) setPlayer(player + 1);
    else setRival(rival + 1);
    const newCorrect = correctCount + (correct ? 1 : 0);
    setCorrectCount(newCorrect);
    if (!correct) {
      setWrongPicks([index]);
      if (lives.lose() <= 0) {
        timerRef.current = setTimeout(
          () => onEnd({ points: newCorrect, maxPoints: rounds.length, correctCount: newCorrect, attempted: round + 1 }),
          750,
        );
        return;
      }
    }
    timerRef.current = setTimeout(() => nextRound(newCorrect), 750);
  };

  const lane = (who: 'player' | 'rival') => {
    const pos = who === 'player' ? player : rival;
    return (
      <div className="relative h-14 overflow-hidden rounded-2xl border border-white/10 bg-navy-800/60">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 right-6 opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent 0 26px, rgba(255,255,255,0.5) 26px 30px)',
            backgroundPosition: '0 50%',
            backgroundSize: '30px 2px',
            backgroundRepeat: 'repeat-x',
          }}
        />
        <span
          data-testid={`car-${who}`}
          className="absolute top-1/2 -translate-y-1/2 text-3xl transition-all duration-500 motion-reduce:transition-none"
          style={{ left: `${6 + (pos / STEPS) * 78}%` }}
        >
          <EmojiVisual emoji={who === 'player' ? '🐷' : '🦊'} variant="block" />
        </span>
        <span aria-hidden className="absolute right-1 top-1/2 -translate-y-1/2 text-lg"><EmojiVisual emoji="🏁" variant="block" /></span>
      </div>
    );
  };

  return (
    <div data-testid="game-racing-cars" className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
      </div>
      <div className="w-full space-y-2">{lane('player')}{lane('rival')}</div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji={visual?.emoji ?? q.emoji} imageUrl={visual?.imageUrl} animated variant="block" className="text-5xl" />
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
    </div>
  );
}
