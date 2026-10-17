import { useEffect, useMemo, useRef, useState } from 'react';
import { imageChoiceRounds } from '../sources';
import { WordChoiceField, gameVerdictSfx } from '../mechanics';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { specFor } from '../levels';
import type { GameProps } from '../types';
import { EmojiVisual } from '../../components/EmojiVisual';

const ROUNDS = 8;
const SECONDS = 20;
const PRIZES = ['⭐', '⭐⭐', '🥉', '🥉', '🥈', '🥈', '🥇', '🏆'];

/**
 * CR-85 Game 12 - Dau truong trieu phu (Quiz Show): climb an 8-step
 * prize ladder, 20 seconds per question, one 50:50 lifeline, a wrong or
 * timed-out answer ends the run (sudden death). Grades 3-5 only.
 */
export default function QuizShow({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level);
  const secondsCap = Math.round(SECONDS / spec.speedScale);
  const rounds = useMemo(() => imageChoiceRounds(grade.id, seed, ROUNDS), [grade.id, seed]);
  const [round, setRound] = useState(0);
  const [seconds, setSeconds] = useState(secondsCap);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [lifelineUsed, setLifelineUsed] = useState(false);
  const [lock, setLock] = useState(false);
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finish = (finalCorrect: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    onEnd({ points: finalCorrect, maxPoints: rounds.length, correctCount: finalCorrect });
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Per-question countdown - resets each round.
  useEffect(() => {
    setSeconds(secondsCap);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [round, secondsCap]);

  // Time-out ends the run - but not while an accepted answer is in its
  // feedback beat (the interval is cleared on pick; this guards a tick
  // that already reached 0 in the same instant).
  useEffect(() => {
    if (seconds === 0 && !endedRef.current && !lock) finish(correctCount);
  }, [seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = rounds[Math.min(round, rounds.length - 1)];

  const pick = (index: number) => {
    if (lock || !q || endedRef.current) return;
    const correct = index === q.correctIndex;
    gameVerdictSfx(correct);
    setLock(true);
    // Stop the countdown the moment an answer is accepted - a correct
    // pick at the last second must not race the timeout end.
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!correct) {
      // Sudden death - one wrong answer ends the climb.
      setWrongPicks([index]);
      timerRef.current = setTimeout(() => finish(correctCount), 900);
      return;
    }
    const newCorrect = correctCount + 1;
    setCorrectCount(newCorrect);
    timerRef.current = setTimeout(() => {
      setWrongPicks([]);
      if (round + 1 >= rounds.length) {
        finish(newCorrect);
        return;
      }
      setRound(round + 1);
      setLock(false);
    }, 600);
  };

  const useFiftyFifty = () => {
    if (lifelineUsed || !q || endedRef.current) return;
    setLifelineUsed(true);
    const wrongs = [0, 1, 2, 3].filter((i) => i !== q.correctIndex);
    setWrongPicks(wrongs.slice(0, 2));
  };

  if (!q) return null;
  const visual = getWordVisual(q.wordId);

  return (
    <div data-testid="game-quiz-show" className="flex flex-col items-center gap-4">
      {/* Prize ladder - climbed left to right, current step glows. */}
      <div data-testid="prize-ladder" className="flex items-center gap-1.5">
        {PRIZES.map((mark, i) => (
          <span
            key={i}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition motion-reduce:transition-none ${
              i < round
                ? 'bg-amber-400/90'
                : i === round
                  ? 'animate-pulse bg-rose-400 ring-2 ring-rose-200 motion-reduce:animate-none'
                  : 'bg-white/15'
            }`}
          >
            <EmojiVisual emoji={mark === '⭐⭐' ? '⭐' : mark} count={mark === '⭐⭐' ? 2 : 1} variant="block" />
          </span>
        ))}
      </div>
      <div
        data-testid="quiz-timer"
        className={`flex h-12 w-12 items-center justify-center rounded-full border-4 font-display text-xl font-extrabold ${
          seconds <= 5 ? 'border-rose-400 text-rose-300' : 'border-sky-300/60 text-sky-200'
        }`}
        aria-label={`Còn ${seconds} giây`}
      >
        {seconds}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji={visual?.emoji ?? q.emoji} imageUrl={visual?.imageUrl} animated variant="block" className="text-4xl" />
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
      <button
        type="button"
        data-testid="lifeline-5050"
        disabled={lifelineUsed || lock}
        onClick={useFiftyFifty}
        className="rounded-full border-2 border-sky-300/60 bg-navy-800/80 px-5 py-2 text-sm font-bold text-sky-200 transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-sky-300 disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {lifelineUsed ? 'Đã dùng 50:50' : <><EmojiVisual emoji="💡" /> Trợ giúp 50:50</>}
      </button>
    </div>
  );
}
