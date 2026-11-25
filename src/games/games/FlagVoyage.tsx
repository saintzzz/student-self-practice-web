import { useEffect, useMemo, useRef, useState } from 'react';
import { flagRounds } from '../sources';
import { GameRoundDots, HintButton, ModelSpeaker, gameVerdictSfx, pickFiftyFifty } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 5;

/**
 * CR-147 Game 23 - Chuyen tau co (Flag Voyage, G4-5): the train stops
 * at each station - "I am from ___" plays, and four flags wait on the
 * platform. Pick the matching flag to stamp the passport. The ONLY
 * surface allowed to render flags (G-5) - the pool excludes the EU and
 * non-sovereign territories per the teacher F6/F8 audit.
 * Scoring: first-try 2 / second-try 1 / 0.
 */
export default function FlagVoyage({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const rounds = useMemo(() => flagRounds(grade.id, seed, spec.rounds), [grade.id, seed, spec.rounds]);
  const [round, setRound] = useState(0);
  const [stamps, setStamps] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lock, setLock] = useState(false);
  const [hints, setHints] = useState<number[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const lives = useGameLives(spec.lives);
  const combo = useCombo();
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[Math.min(round, rounds.length - 1)];

  const advance = (earned: number, newCorrect: number) => {
    const nextPoints = points + earned;
    setPoints(nextPoints);
    setWrongPicks([]);
    setHints([]);
    if (round + 1 >= rounds.length) {
      if (endedRef.current) return;
      endedRef.current = true;
      onEnd({ points: nextPoints, maxPoints: spec.rounds * 2, correctCount: newCorrect, attempted: spec.rounds });
      return;
    }
    setRound(round + 1);
    setLock(false);
  };

  const pick = (index: number) => {
    if (lock || !q || endedRef.current) return;
    const correct = index === q.correctIndex;
    gameVerdictSfx(correct);
    if (correct) combo.hit(); else combo.miss();
    setLock(true);
    const newCorrect = correctCount + (correct ? 1 : 0);
    setCorrectCount(newCorrect);
    if (correct) {
      setStamps(stamps + 1);
      const earned = wrongPicks.length === 0 ? 2 : 1;
      timerRef.current = setTimeout(() => advance(earned, newCorrect), 650);
      return;
    }
    const next = [...wrongPicks, index];
    setWrongPicks(next);
    const left = lives.lose();
    if (left <= 0) {
      timerRef.current = setTimeout(() => {
        if (endedRef.current) return;
        endedRef.current = true;
        onEnd({ points, maxPoints: spec.rounds * 2, correctCount: newCorrect, attempted: Math.min(round + 1, spec.rounds) });
      }, 650);
      return;
    }
    if (next.length >= spec.missLimit) {
      timerRef.current = setTimeout(() => advance(0, newCorrect), 650);
      return;
    }
    setLock(false);
  };

  const useHint = () => {
    if (hintUsed || lock || lives.out || !q) return;
    setHintUsed(true);
    setHints(pickFiftyFifty(q.correctIndex, q.options.length, `${seed}:h${round}`));
  };

  if (!q) return null;

  return (
    <div data-testid="game-flag-voyage" className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-sky-200/60 bg-gradient-to-b from-sky-50 to-blue-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji="🚂" variant="block" className="text-4xl" />
        <ModelSpeaker word={`I am from ${q.word.word}`} />
      </div>
      <p className="text-base font-semibold text-slate-300">Tàu dừng bến - chọn đúng lá cờ nhé!</p>
      <div className="grid grid-cols-2 gap-3" data-testid="flag-choice-field">
        {q.options.map((w, i) => {
          const wrong = wrongPicks.includes(i) || hints.includes(i);
          return (
            <button
              key={i}
              type="button"
              data-testid={`option-${i}`}
              data-correct={i === q.correctIndex}
              disabled={lock || wrong}
              onClick={() => pick(i)}
              className={`game-bob flex h-24 items-center justify-center rounded-2xl border-2 border-sky-200/70 bg-gradient-to-b from-sky-50 to-blue-100 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-sky-200 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transition-none ${wrong ? 'game-shake' : ''}`}
              style={{ animationDelay: `${i * 200}ms` }}
              aria-label={w.word}
            >
              <EmojiVisual emoji={w.emoji} variant="block" className="text-6xl" />
            </button>
          );
        })}
      </div>
      <HintButton used={hintUsed} disabled={lock || lives.out} onUse={useHint} />
      <p className="text-sm font-semibold text-slate-300">Hộ chiếu có {stamps} con dấu!</p>
    </div>
  );
}
