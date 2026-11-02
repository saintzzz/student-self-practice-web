import { useEffect, useMemo, useRef, useState } from 'react';
import { wordOrderRounds } from '../sources';
import { isWordOrderCorrect } from '../../lib/exam/wordOrder';
import { GameRoundDots, WordOrderField, gameVerdictSfx } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import type { GameProps } from '../types';

const ROUNDS = 4;

/**
 * CR-119 Game - Xếp câu: scrambled word tiles rebuild a sentence from
 * the CR-26 bank. Judging goes through the shared `isWordOrderCorrect`
 * scorer so grammatically valid alternates (adjunct fronting, conjunct
 * swaps, inversions) score correctly - never a second, dumber judge.
 * Covers word order / grammar, absent from every existing game.
 */
export default function SentenceScramble({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, ROUNDS);
  const rounds = useMemo(
    () => wordOrderRounds(grade.id, seed, spec.rounds),
    [grade.id, seed, spec.rounds],
  );
  const [round, setRound] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [lock, setLock] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const lives = useGameLives(spec.lives);
  const combo = useCombo();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[Math.min(round, rounds.length - 1)];
  if (!q) return null;

  const advance = (newCorrect: number) => {
    if (round + 1 >= rounds.length) {
      onEnd({ points: newCorrect, maxPoints: rounds.length, correctCount: newCorrect, attempted: rounds.length });
      return;
    }
    setRound(round + 1);
    setPlaced([]);
    setLock(false);
  };

  const judge = (nextPlaced: number[]) => {
    const picked = nextPlaced.map((i) => q.tiles[i]!);
    const correct = isWordOrderCorrect(q.sentence, picked);
    gameVerdictSfx(correct);
    setLock(true);
    if (correct) {
      combo.hit();
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      timerRef.current = setTimeout(() => advance(newCorrect), 900);
      return;
    }
    combo.miss();
    setWrongFlash(true);
    if (lives.lose() <= 0) {
      timerRef.current = setTimeout(
        () => onEnd({ points: correctCount, maxPoints: rounds.length, correctCount, attempted: round + 1 }),
        700,
      );
      return;
    }
    // Wrong attempt: flash the well, then return the tiles to the rack
    // so the child can rebuild without losing the round outright.
    timerRef.current = setTimeout(() => {
      setPlaced([]);
      setWrongFlash(false);
      setLock(false);
    }, 700);
  };

  const tapTile = (tileIndex: number) => {
    if (lock || placed.includes(tileIndex)) return;
    const next = [...placed, tileIndex];
    setPlaced(next);
    if (next.length === q.tiles.length) judge(next);
  };

  const tapPlaced = (position: number) => {
    if (lock) return;
    setPlaced(placed.filter((_, i) => i !== position));
  };

  return (
    <div data-testid="game-sentence-scramble" className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-4">
        <GameRoundDots total={rounds.length} done={round} />
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <p className="rounded-full bg-navy-800/60 px-4 py-1.5 text-sm font-bold text-sky-200">
        Xếp các từ thành câu đúng nhé!
      </p>
      <WordOrderField
        key={q.id}
        tiles={q.tiles}
        placedIndexes={placed}
        wrongFlash={wrongFlash}
        disabled={lock || lives.out}
        onTapTile={tapTile}
        onTapPlaced={tapPlaced}
      />
    </div>
  );
}
