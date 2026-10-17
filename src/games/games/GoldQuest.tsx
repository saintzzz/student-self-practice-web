import { useEffect, useMemo, useRef, useState } from 'react';
import { hashString } from '../../lib/prng';
import { imageChoiceRounds } from '../sources';
import { GameRoundDots, WordChoiceField, gameVerdictSfx } from '../mechanics';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import type { GameProps } from '../types';

const ROUNDS = 6;
const CHESTS = 3;

interface ChestReward {
  emoji: string;
  label: string;
  apply: (gems: number) => number;
}

/**
 * CR-85 Game 11 - Dao vang (Gold Quest, Blooket-style): every correct
 * answer opens the chest phase - pick 1 of 3 chests for a seeded-random
 * surprise (gems, double, dragon tax). Loot is display-only fun; stars
 * stay doctrine-clean via correctCount (points = correct, max = ROUNDS).
 */
function rewardFor(seed: string, round: number, chest: number): ChestReward {
  const roll = hashString(`${seed}:loot:${round}:${chest}`) % 100;
  if (roll < 50) {
    const gems = 5 + (hashString(`${seed}:loot:${round}:${chest}:n`) % 11); // 5-15
    return { emoji: '💎', label: `+${gems} kim cương`, apply: (g) => g + gems };
  }
  if (roll < 70) return { emoji: '🍀', label: '+3 kim cương', apply: (g) => g + 3 };
  if (roll < 85) return { emoji: '✨', label: 'Nhân đôi!', apply: (g) => Math.max(g + 1, g * 2) };
  return { emoji: '🐉', label: 'Rồng cướp một nửa!', apply: (g) => Math.ceil(g / 2) };
}

export default function GoldQuest({ grade, seed, onEnd }: GameProps) {
  const rounds = useMemo(() => imageChoiceRounds(grade.id, seed, ROUNDS), [grade.id, seed]);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'question' | 'chest'>('question');
  const [gems, setGems] = useState(0);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [opened, setOpened] = useState<number | null>(null);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [missed, setMissed] = useState(false);
  const [lock, setLock] = useState(false);
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[Math.min(round, rounds.length - 1)];

  const finish = (finalCorrect: number, finalPoints: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnd({ points: finalPoints, maxPoints: rounds.length, correctCount: finalCorrect });
  };

  const advance = (newCorrect: number) => {
    setWrongPicks([]);
    setMissed(false);
    setOpened(null);
    if (round + 1 >= rounds.length) {
      finish(newCorrect, points);
      return;
    }
    setRound(round + 1);
    setPhase('question');
    setLock(false);
  };

  const pick = (index: number) => {
    if (lock || !q || endedRef.current || phase !== 'question') return;
    const correct = index === q.correctIndex;
    gameVerdictSfx(correct);
    setLock(true);
    if (correct) {
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      // First-try = full point; a second-try answer still opens the
      // chest but only earns half, so a miss caps the run below 3 stars.
      setPoints((p) => p + (wrongPicks.length === 0 ? 1 : 0.5));
      timerRef.current = setTimeout(() => {
        setPhase('chest');
        setLock(false);
      }, 550);
      return;
    }
    const next = [...wrongPicks, index];
    setWrongPicks(next);
    if (next.length >= 2) {
      setMissed(true);
      timerRef.current = setTimeout(() => advance(correctCount), 750);
      return;
    }
    setLock(false);
  };

  const openChest = (chest: number) => {
    if (phase !== 'chest' || opened !== null || endedRef.current) return;
    setOpened(chest);
    setGems(rewardFor(seed, round, chest).apply(gems));
    timerRef.current = setTimeout(() => advance(correctCount), 1100);
  };

  if (!q) return null;
  const visual = getWordVisual(q.wordId);

  return (
    <div data-testid="game-gold-quest" className="flex flex-col items-center gap-4">
      <GameRoundDots total={rounds.length} done={round} />
      <div
        data-testid="gem-tally"
        className="flex items-center gap-2 rounded-full border-2 border-amber-300/60 bg-navy-800/80 px-4 py-1.5 text-lg font-extrabold text-amber-200"
      >
        💎 {gems}
      </div>
      {phase === 'question' ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
            <span className="text-4xl">{visual?.emoji ?? q.emoji}</span>
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
          <p className="text-sm font-semibold text-slate-300">
            {missed ? 'Lần sau chọn rương nhé!' : 'Đúng rồi mới được chọn rương!'}
          </p>
        </>
      ) : (
        <>
          <p className="text-base font-bold text-amber-200">Chọn 1 rương nào!</p>
          <div className="flex gap-4">
            {Array.from({ length: CHESTS }, (_, i) => {
              const isOpen = opened === i;
              const reward = isOpen ? rewardFor(seed, round, i) : null;
              return (
                <button
                  key={i}
                  type="button"
                  data-testid={`chest-${i}`}
                  disabled={opened !== null}
                  onClick={() => openChest(i)}
                  aria-label={`Rương ${i + 1}`}
                  className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-4 text-5xl transition motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-300 ${
                    isOpen
                      ? 'game-flip-in border-amber-300 bg-gradient-to-b from-amber-500 to-amber-700'
                      : 'border-amber-800/70 bg-gradient-to-b from-amber-700 to-amber-900 hover:-translate-y-1 active:scale-95 disabled:opacity-50'
                  }`}
                >
                  {isOpen && reward ? (
                    <>
                      <span>{reward.emoji}</span>
                      <span className="px-1 text-center text-xs font-bold text-white">{reward.label}</span>
                    </>
                  ) : (
                    '🧰'
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
