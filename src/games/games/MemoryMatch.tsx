import { useEffect, useMemo, useRef, useState } from 'react';
import { seededShuffleIndices } from '../../lib/prng';
import { playSfx } from '../../lib/sfx';
import { pickGameWords } from '../sources';
import { GameRoundDots, PairBoardField, gameVerdictSfx, type PairBoardTile } from '../mechanics';
import { specFor } from '../levels';
import { ComboMeter, HeartMeter, useCombo, useGameLives } from '../lives';
import type { GameProps } from '../types';

const PAIRS = 4;

/**
 * CR-83 Game 1 - Lat the nho (Memory Match): 4 word<->emoji pairs on an
 * 8-card face-down board. Two flips per move; efficiency bonus for
 * clearing in few moves. Draws from the grade's literal-emoji vocab.
 */
export default function MemoryMatch({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, PAIRS);
  const tiles = useMemo<PairBoardTile[]>(() => {
    const words = pickGameWords(grade.id, seed, spec.rounds);
    const raw = words.flatMap((w): PairBoardTile[] => [
      { id: `${w.id}-img`, pairId: w.id, face: 'emoji', label: w.emoji },
      { id: `${w.id}-word`, pairId: w.id, face: 'word', label: w.word },
    ]);
    return seededShuffleIndices(raw.length, `${seed}:order`).map((i) => raw[i]!);
  }, [grade.id, seed, spec.rounds]);

  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  // Mismatches are how a memory run teaches positions, so the pool is
  // gentler than answer-games: spec.lives + 3 chances per run.
  const lives = useGameLives(spec.lives + 3);
  const combo = useCombo();
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const finishIfDone = (matchedCount: number, moveCount: number) => {
    if (matchedCount < tiles.length || endedRef.current) return;
    endedRef.current = true;
    // 4 pairs found = 8 base; flawless 4-move run +2, <=6 moves +1 -
    // any mismatch drops below max, so 3 stars means clean play (BA rule).
    const bonus = moveCount <= spec.rounds ? 2 : moveCount <= spec.rounds + 2 ? 1 : 0;
    onEnd({ points: spec.rounds * 2 + bonus, maxPoints: spec.rounds * 2 + 2, correctCount: spec.rounds , attempted: spec.rounds});
  };

  const tap = (idx: number) => {
    if (lock || endedRef.current || matched.has(idx) || open.includes(idx)) return;
    playSfx('flip');
    if (open.length === 0) {
      setOpen([idx]);
      return;
    }
    const first = open[0]!;
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    if (tiles[first]!.pairId === tiles[idx]!.pairId) {
      gameVerdictSfx(true);
      combo.hit();
      const next = new Set(matched).add(first).add(idx);
      setMatched(next);
      setOpen([]);
      finishIfDone(next.size, nextMoves);
      return;
    }
    gameVerdictSfx(false);
    combo.miss();
    setLock(true);
    setOpen([first, idx]);
    // CR-100 (B5): a mismatch drops a heart; out of hearts ends the run
    // after the flip-back beat, scoring the pairs already cleared.
    const left = lives.lose();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (left <= 0 && !endedRef.current) {
        endedRef.current = true;
        const pairs = matched.size / 2;
        onEnd({ points: pairs * 2, maxPoints: spec.rounds * 2 + 2, correctCount: pairs, attempted: Math.max(pairs, 1) });
        return;
      }
      setOpen([]);
      setLock(false);
    }, 750);
  };

  return (
    <div data-testid="game-memory-match" className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <GameRoundDots total={spec.rounds} done={matched.size / 2} />
        <span className="text-sm font-semibold text-slate-300">Lượt lật: {moves}</span>
        <HeartMeter lives={lives.lives} max={lives.max} />
        <ComboMeter streak={combo.streak} />
      </div>
      <PairBoardField
        tiles={tiles}
        openIndexes={open}
        matchedIndexes={matched}
        onFlip={tap}
      />
    </div>
  );
}
