import { useEffect, useMemo, useRef, useState } from 'react';
import { countingShopRounds } from '../sources';
import { GameRoundDots, HintButton, WordChoiceField, gameVerdictSfx, pickFiftyFifty } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 5;

/**
 * CR-147 Game 21 - Cua hang cua Heo (Counting Shop): the shop counter
 * shows tray(s) of goods drawn with the bespoke counting art (F-04 -
 * the 100-file manifest finally earns its keep). The child counts the
 * objects and picks the number WORD; level 2+ stacks a second tray and
 * asks for the total. Scoring: first-try 2 / second-try 1 / 0.
 */
export default function CountingShop({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const traysPerRound = (level ?? 1) >= 2 ? 2 : 1;
  const rounds = useMemo(
    () => countingShopRounds(grade.id, seed, spec.rounds, traysPerRound),
    [grade.id, seed, spec.rounds, traysPerRound],
  );
  const [round, setRound] = useState(0);
  const [sold, setSold] = useState(0);
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
      setSold(sold + 1);
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
    <div data-testid="game-counting-shop" className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <div className="flex items-end gap-3 rounded-3xl border-4 border-amber-700/70 bg-gradient-to-b from-amber-100 to-orange-200 px-6 pb-4 pt-6 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji="🐷" variant="block" className="text-5xl" />
        {q.trays.map((t, i) => (
          <div key={i} data-testid={`tray-${i}`} className="rounded-2xl border-2 border-amber-300/80 bg-white/90 p-2 shadow-inner">
            {/* r241: the count is the question, so the accessible name
                carries the full equivalent - a screen-reader child must
                be able to play the same round. */}
            <img src={t.imageUrl} alt={`Khay ${i + 1} có ${t.count} ${t.slug}`} className="h-24 w-24 rounded-xl object-contain" draggable={false} />
          </div>
        ))}
      </div>
      <p className="text-base font-semibold text-slate-300">
        {traysPerRound > 1 ? 'Đếm tổng 2 khay - có bao nhiêu món?' : 'Đếm xem có bao nhiêu món?'}
      </p>
      <WordChoiceField
        key={`${seed}:${round}`}
        options={q.options}
        correctIndex={q.correctIndex}
        wrongPicks={[...wrongPicks, ...hints]}
        disabled={lock}
        onPick={pick}
      />
      <HintButton used={hintUsed} disabled={lock || lives.out} onUse={useHint} />
      <p className="text-sm font-semibold text-slate-300">Đã bán được {sold} đơn hàng!</p>
    </div>
  );
}
