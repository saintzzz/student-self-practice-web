import { useEffect, useMemo, useRef, useState } from 'react';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { imageChoiceRounds } from '../sources';
import { GameRoundDots, HintButton, WordChoiceField, gameVerdictSfx, pickFiftyFifty } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 5;

/**
 * CR-84 Game 10 - Hom kho bau (Treasure Chest): a locked chest holds 5
 * padlocks - one per question. Every correct answer cracks a lock; a
 * miss earns nothing. Answer every round correctly to loot the chest.
 * Scoring: first-try 2 / second-try 1 / 0 per round, max 10.
 */
export default function TreasureChest({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const LOCKS = spec.rounds;
  const rounds = useMemo(() => imageChoiceRounds(grade.id, seed, spec.rounds), [grade.id, seed, spec.rounds]);
  const [round, setRound] = useState(0);
  const [locksOpen, setLocksOpen] = useState(0);
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

  const advance = (earned: number, opened: boolean, newCorrect: number) => {
    const nextPoints = points + earned;
    const nextLocks = locksOpen + (opened ? 1 : 0);
    setPoints(nextPoints);
    setLocksOpen(nextLocks);
    setWrongPicks([]);
    setHints([]);
    const done = round + 1 >= rounds.length;
    if (done) {
      if (endedRef.current) return;
      endedRef.current = true;
      const report = () =>
        onEnd({ points: nextPoints, maxPoints: spec.rounds * 2, correctCount: newCorrect , attempted: spec.rounds});
      // Let the opened chest breathe for a beat before the end screen swaps in.
      if (nextLocks >= LOCKS) {
        timerRef.current = setTimeout(report, 900);
        return;
      }
      report();
      return;
    }
    setRound(round + 1);
    setLock(false);
  };

  const pick = (index: number) => {
    if (lock || !q || endedRef.current || locksOpen >= LOCKS) return;
    const correct = index === q.correctIndex;
    gameVerdictSfx(correct);
    if (correct) combo.hit(); else combo.miss();
    setLock(true);
    const newCorrect = correctCount + (correct ? 1 : 0);
    setCorrectCount(newCorrect);
    if (correct) {
      const earned = wrongPicks.length === 0 ? 2 : 1;
      timerRef.current = setTimeout(() => advance(earned, true, newCorrect), 650);
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
      timerRef.current = setTimeout(() => advance(0, false, newCorrect), 650);
      return;
    }
    setLock(false);
  };

  const useHint = () => {
    if (hintUsed || lock || lives.out) return;
    setHintUsed(true);
    setHints(pickFiftyFifty(q.correctIndex, q.options.length, `${seed}:h${round}`));
  };

  if (!q) return null;
  const visual = getWordVisual(q.wordId);

  return (
    <div data-testid="game-treasure-chest" className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <div
        data-testid="chest-visual"
        className={`relative flex h-28 w-40 items-center justify-center rounded-3xl border-4 border-amber-700/80 bg-gradient-to-b from-amber-600 to-amber-800 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.6)] ${locksOpen >= LOCKS ? 'game-flip-in' : ''}`}
      >
        <EmojiVisual emoji={locksOpen >= LOCKS ? '🎁' : '🧰'} variant="block" className="text-6xl" />
        <div className="absolute -bottom-3 flex gap-2">
          {Array.from({ length: LOCKS }).map((_, i) => (
            <span
              key={i}
              data-testid={`lock-${i}`}
              className={`text-2xl transition-all motion-reduce:transition-none ${i < locksOpen ? '-translate-y-2 opacity-30' : ''}`}
            >
              <EmojiVisual emoji={i < locksOpen ? '🔓' : '🔒'} variant="block" />
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji={visual?.emoji ?? q.emoji} imageUrl={visual?.imageUrl} animated variant="block" className="text-4xl" />
        <span className="text-base font-semibold text-slate-500">là từ nào?</span>
      </div>
      <WordChoiceField
        key={q.id}
        options={q.options}
        correctIndex={q.correctIndex}
        wrongPicks={[...wrongPicks, ...hints]}
        disabled={lock}
        onPick={pick}
      />
      <HintButton used={hintUsed} disabled={lock || lives.out} onUse={useHint} />
      <p className="text-sm font-semibold text-slate-300">Trả lời đúng để mở ổ khóa nhé!</p>
    </div>
  );
}
