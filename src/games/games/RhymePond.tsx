import { useEffect, useMemo, useRef, useState } from 'react';
import { rhymeRounds } from '../sources';
import { GameRoundDots, HintButton, ModelSpeaker, gameVerdictSfx, pickFiftyFifty } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';
import { getWordVisual } from '../../lib/emoji/wordVisual';

const ROUNDS = 5;

/**
 * CR-147 Game 22 - Ao van (Rhyme Pond): Heo the frog listens to the
 * target word, then four lily pads carry word+art - pick the one that
 * rhymes (L1/L3) or starts with the same sound (L2). Correctness comes
 * only from rhymes.ts + initialSounds.ts - blends/finals are never
 * touched (PO G-6: a wrong phonics game is worse than none).
 * Scoring: first-try 2 / second-try 1 / 0.
 */
export default function RhymePond({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const rounds = useMemo(
    () => rhymeRounds(grade.id, seed, spec.rounds, level ?? 1),
    [grade.id, seed, spec.rounds, level],
  );
  const [round, setRound] = useState(0);
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
    <div data-testid="game-rhyme-pond" className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-200/60 bg-gradient-to-b from-emerald-50 to-teal-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji="🐸" variant="block" className="text-4xl" />
        <ModelSpeaker word={q.target.word} />
      </div>
      <p className="text-base font-semibold text-slate-300">
        {q.mode === 'initial' ? 'Nghe kỹ - từ nào bắt đầu cùng âm?' : 'Nghe kỹ - từ nào cùng vần?'}
      </p>
      <div className="grid grid-cols-2 gap-3" data-testid="rhyme-choice-field">
        {q.options.map((w, i) => {
          const visual = getWordVisual(w.id);
          const wrong = wrongPicks.includes(i) || hints.includes(i);
          return (
            <button
              key={i}
              type="button"
              data-testid={`option-${i}`}
              data-correct={i === q.correctIndex}
              disabled={lock || wrong}
              onClick={() => pick(i)}
              className={`game-bob flex h-24 flex-col items-center justify-center gap-1 rounded-[2rem] border-2 border-emerald-300/60 bg-gradient-to-b from-emerald-300 to-emerald-500 px-2 shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_8px_18px_-6px_rgba(0,0,0,0.5)] transition hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-emerald-200 active:scale-95 disabled:opacity-35 disabled:hover:translate-y-0 motion-reduce:transition-none ${wrong ? 'game-shake' : ''}`}
              style={{ animationDelay: `${i * 240}ms` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95">
                <EmojiVisual key={`${visual?.imageUrl ?? w.emoji}@${i}`} emoji={w.emoji} imageUrl={visual?.imageUrl} variant="block" className="text-2xl" />
              </span>
              <span className="text-sm font-bold text-emerald-950">{w.word}</span>
            </button>
          );
        })}
      </div>
      <HintButton used={hintUsed} disabled={lock || lives.out} onUse={useHint} />
    </div>
  );
}
