import { useEffect, useMemo, useRef, useState } from 'react';
import { seededPickN, seededShuffleIndices } from '../../lib/prng';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { imageChoiceRounds } from '../sources';
import { GameRoundDots, WordChoiceField, gameVerdictSfx } from '../mechanics';
import type { GameProps } from '../types';

const TILES = 9;
const SCENE_EMOJI = ['🌈', '🏰', '🚀', '🎠', '🐳', '🦋', '🌻', '🍦', '🎪', '🏝️'];

/**
 * CR-84 Game 9 - Lat tranh (Picture Reveal): a hidden scene sits under 9
 * cover tiles. Every correct picture->word answer lifts one cover; a
 * miss earns nothing. Reveal all 9 to win - flawless run = 3 stars.
 */
export default function PictureReveal({ grade, seed, onEnd }: GameProps) {
  const rounds = useMemo(() => imageChoiceRounds(grade.id, seed, TILES), [grade.id, seed]);
  const scene = useMemo(
    () => seededPickN(SCENE_EMOJI, 1, `${seed}:scene`)[0] ?? '🌈',
    [seed],
  );
  const revealOrder = useMemo(
    () => seededShuffleIndices(TILES, `${seed}:reveal`),
    [seed],
  );
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[Math.min(round, rounds.length - 1)];

  const advance = (addedReveal: number, newCorrect: number) => {
    const nextRevealed = revealed + addedReveal;
    setRevealed(nextRevealed);
    setWrongPicks([]);
    if (round + 1 >= rounds.length || nextRevealed >= TILES) {
      if (endedRef.current) return;
      endedRef.current = true;
      onEnd({ points: nextRevealed, maxPoints: TILES, correctCount: newCorrect });
      return;
    }
    setRound(round + 1);
    setLock(false);
  };

  const pick = (index: number) => {
    if (lock || !q || endedRef.current) return;
    const correct = index === q.correctIndex;
    gameVerdictSfx(correct);
    setLock(true);
    const newCorrect = correctCount + (correct ? 1 : 0);
    setCorrectCount(newCorrect);
    if (!correct) setWrongPicks([index]);
    timerRef.current = setTimeout(() => advance(correct ? 1 : 0, newCorrect), 700);
  };

  if (!q) return null;
  const visual = getWordVisual(q.wordId);

  return (
    <div data-testid="game-picture-reveal" className="flex flex-col items-center gap-4">
      <GameRoundDots total={rounds.length} done={round} />
      <div
        data-testid="reveal-board"
        className="relative grid w-56 grid-cols-3 gap-1.5 overflow-hidden rounded-2xl border-2 border-amber-200/50 bg-gradient-to-b from-amber-50 to-orange-100 p-1.5 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.6)]"
      >
        {revealOrder.map((coverIdx, pos) => {
          const isOpen = pos < revealed;
          return (
            <div
              key={coverIdx}
              data-testid={`reveal-tile-${coverIdx}`}
              className={`flex aspect-square items-center justify-center rounded-xl text-4xl transition-all duration-500 motion-reduce:transition-none ${
                isOpen ? 'scale-100 bg-white/40' : 'scale-95'
              }`}
            >
              {isOpen ? <span className="game-flip-in">{scene}</span> : (
                <span className="flex h-full w-full items-center justify-center rounded-xl border border-sky-300/40 bg-gradient-to-b from-navy-600 to-navy-800 text-xl text-sky-300/80 shadow-inner">
                  ✦
                </span>
              )}
            </div>
          );
        })}
      </div>
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
    </div>
  );
}
