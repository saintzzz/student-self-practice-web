import { useEffect, useMemo, useRef, useState } from 'react';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { missingLetterRounds } from '../sources';
import { GameRoundDots, ModelSpeaker, WordChoiceField, gameVerdictSfx } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 5;

/**
 * CR-119 Game - Điền chữ khuyết: picture + speaker show the word with a
 * contiguous internal run blanked ("w _ _ d o w" style - the IOE
 * staple). Child picks the missing run from 4 letter-run tiles. Covers
 * spelling recall - a skill the recognition-heavy catalog never tested.
 */
export default function MissingLetter({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const rounds = useMemo(
    () => missingLetterRounds(grade.id, seed, spec.rounds),
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
  const visual = getWordVisual(q.word.id);

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
    <div data-testid="game-missing-letter" className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji={visual?.emoji ?? '❓'} imageUrl={visual?.imageUrl} animated variant="block" className="text-5xl" />
        <span className="font-display text-3xl font-extrabold tracking-[0.25em] text-slate-800">
          {q.maskedWord}
        </span>
      </div>
      <ModelSpeaker word={q.word.word} />
      <WordChoiceField
        key={`${q.word.id}-${round}`}
        options={q.options}
        correctIndex={q.correctIndex}
        wrongPicks={wrongPicks}
        disabled={lock || lives.out}
        onPick={pick}
      />
      <p className="text-sm font-semibold text-slate-300">Chữ nào còn thiếu trong từ nhỉ?</p>
    </div>
  );
}
