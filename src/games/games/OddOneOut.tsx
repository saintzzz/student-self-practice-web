import { useEffect, useMemo, useRef, useState } from 'react';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { oddOneOutRounds } from '../sources';
import { GameRoundDots, gameVerdictSfx } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 5;

/**
 * CR-119 Game - Tìm kẻ lạ (odd one out): 4 cards (art + word); three
 * share a topic, one does not. Semantic categorization with real word
 * comprehension - the skill IOE/VioEdu score directly that none of the
 * recognition games exercise.
 */
export default function OddOneOut({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const rounds = useMemo(
    () => oddOneOutRounds(grade.id, seed, spec.rounds),
    [grade.id, seed, spec.rounds],
  );
  const [round, setRound] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const lives = useGameLives(spec.lives);
  const combo = useCombo();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[Math.min(round, rounds.length - 1)];
  if (!q) return null;

  const nextRound = (newCorrect: number) => {
    if (round + 1 >= rounds.length) {
      onEnd({ points: newCorrect, maxPoints: rounds.length, correctCount: newCorrect, attempted: rounds.length });
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
    if (correct) combo.hit(); else combo.miss();
    setLock(true);
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

  return (
    <div data-testid="game-odd-one-out" className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <p className="rounded-full bg-navy-800/60 px-4 py-1.5 text-sm font-bold text-sky-200">
        Ba từ cùng một nhóm - từ nào khác nhóm?
      </p>
      <div className="grid grid-cols-2 gap-3" data-testid="odd-choice-field">
        {q.words.map((word, i) => {
          const visual = getWordVisual(word.id);
          const wrong = wrongPicks.includes(i);
          return (
            <button
              key={word.id}
              type="button"
              data-testid={`option-${i}`}
              data-correct={i === q.correctIndex}
              disabled={lock || wrong || lives.out}
              onClick={() => pick(i)}
              className={`flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-3 py-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-4px_0_rgba(180,83,9,0.2),0_8px_20px_-8px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-300 disabled:opacity-40 disabled:hover:translate-y-0 ${wrong ? 'game-shake' : ''}`}
            >
              <EmojiVisual key={`${visual?.imageUrl ?? word.emoji}-${i}`} emoji={visual?.emoji ?? word.emoji} imageUrl={visual?.imageUrl} variant="block" className="text-4xl" />
              <span className="text-lg font-extrabold text-slate-800">{word.word}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
