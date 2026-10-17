import { useEffect, useMemo, useRef, useState } from 'react';
import { seededShuffleIndices } from '../../lib/prng';
import { listeningImageRounds } from '../sources';
import { GameRoundDots, ModelSpeaker, gameVerdictSfx } from '../mechanics';
import type { GameProps } from '../types';

const COLS = 6;
const ROWS = 4;
const CELLS = COLS * ROWS;
const HEARTS = 3;
const ROUNDS = 6;
const WALL_COUNT = 4;

type Dir = [number, number];
const DIRS: readonly Dir[] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

const idx = (x: number, y: number) => y * COLS + x;
const xy = (cell: number): [number, number] => [cell % COLS, Math.floor(cell / COLS)];

/** BFS next step from `from` toward `to` over open cells - ghost brain. */
function nextStep(from: number, to: number, blocked: ReadonlySet<number>): number | null {
  if (from === to) return null;
  const prev = new Map<number, number>([[from, -1]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const [cx, cy] = xy(cur);
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const n = idx(nx, ny);
      if (blocked.has(n) || prev.has(n)) continue;
      prev.set(n, cur);
      if (n === to) {
        let step = n;
        while (prev.get(step)! !== from && prev.get(step)! !== -1) step = prev.get(step)!;
        return step;
      }
      queue.push(n);
    }
  }
  return null;
}

/** All `targets` reachable from `start` given `walls`? */
function allReachable(start: number, targets: readonly number[], walls: ReadonlySet<number>): boolean {
  const seen = new Set<number>([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const [dx, dy] of DIRS) {
      const [cx, cy] = xy(cur);
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      const n = idx(nx, ny);
      if (walls.has(n) || seen.has(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return targets.every((t) => seen.has(t));
}

interface Layout {
  walls: Set<number>;
  pads: { cell: number; option: number }[];
  ghost: number;
}

/**
 * CR-85 Game 13 - Di me cung (Maze Chase, Wordwall-style): guide Heo
 * through the maze to the pad holding the correct picture; a ghost
 * chases one step per move. Wrong pad or ghost touch costs a heart.
 */
export default function MazeChase({ grade, seed, onEnd }: GameProps) {
  const rounds = useMemo(() => listeningImageRounds(grade.id, seed, ROUNDS), [grade.id, seed]);
  const [round, setRound] = useState(0);
  const [hero, setHero] = useState(0);
  const [ghost, setGhost] = useState(CELLS - 1);
  const [hearts, setHearts] = useState(HEARTS);
  const [correctCount, setCorrectCount] = useState(0);
  const [removedPads, setRemovedPads] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const endedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroRef = useRef(hero);
  heroRef.current = hero;
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const q = rounds[Math.min(round, rounds.length - 1)];

  // Seeded layout per question: walls + 4 pads + ghost spawn. Walls that
  // would isolate a pad are dropped until everything is reachable.
  const layout = useMemo<Layout>(() => {
    const pads: Layout['pads'] = [];
    const padCells = new Set<number>();
    const base = `${seed}:maze:${round}`;
    const heroCell = heroRef.current;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const order = seededShuffleIndices(CELLS, `${base}:${attempt}`);
      // Walls never cover the hero cell - a hero standing inside a wall
      // would make the BFS connectivity check dishonest and can seal the
      // board shut (review r1 soft-lock).
      const walls = new Set(order.filter((c) => c !== heroCell).slice(0, WALL_COUNT));
      pads.length = 0;
      padCells.clear();
      let slot = 0;
      for (let o = 0; o < 4; o += 1) {
        let cell = order[slot++]!;
        while (walls.has(cell) || cell === heroCell || padCells.has(cell)) cell = order[slot++]!;
        padCells.add(cell);
        pads.push({ cell, option: o });
      }
      let ghostCell = order[slot++]!;
      while (walls.has(ghostCell) || ghostCell === heroCell || padCells.has(ghostCell)) {
        ghostCell = order[slot++]!;
      }
      if (allReachable(heroCell, pads.map((p) => p.cell), walls)) {
        return { walls, pads: [...pads], ghost: ghostCell };
      }
    }
    // Fallback: no walls - pads on 4 corners-ish cells.
    pads.length = 0;
    for (let o = 0; o < 4; o += 1) pads.push({ cell: (o * 5 + 7) % CELLS, option: o });
    return { walls: new Set(), pads: [...pads], ghost: CELLS - 1 };
  }, [seed, round]);

  // Ghost spawns at the layout-validated cell each round (never a wall,
  // pad or the hero) - review r2: the computed spawn was previously
  // unused and the ghost hardcoded the last cell.
  useEffect(() => setGhost(layout.ghost), [layout]);

  const finish = (finalCorrect: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnd({ points: finalCorrect, maxPoints: rounds.length, correctCount: finalCorrect });
  };

  const advanceRound = (newCorrect: number) => {
    setRemovedPads([]);
    if (round + 1 >= rounds.length) {
      finish(newCorrect);
      return;
    }
    setRound(round + 1);
    setLock(false);
  };

  const move = (cell: number) => {
    if (lock || !q || endedRef.current) return;
    const [hx, hy] = xy(heroRef.current);
    const [cx, cy] = xy(cell);
    if (Math.abs(hx - cx) + Math.abs(hy - cy) !== 1) return;
    if (layout.walls.has(cell)) return;

    setHero(cell);
    const pad = layout.pads.find((p) => p.cell === cell && !removedPads.includes(p.cell));
    if (pad) {
      const correct = pad.option === q.correctIndex;
      gameVerdictSfx(correct);
      setLock(true);
      if (correct) {
        const newCorrect = correctCount + 1;
        setCorrectCount(newCorrect);
        timerRef.current = setTimeout(() => advanceRound(newCorrect), 650);
        return;
      }
      setRemovedPads((prev) => [...prev, cell]);
      const newHearts = hearts - 1;
      setHearts(newHearts);
      if (newHearts <= 0) {
        timerRef.current = setTimeout(() => finish(correctCount), 700);
        return;
      }
      setLock(false);
      return;
    }
    // Empty step - the ghost takes its turn.
    const gstep = nextStep(ghost, cell, layout.walls);
    if (gstep === null) return;
    if (gstep === cell) {
      const newHearts = hearts - 1;
      setHearts(newHearts);
      setGhost(CELLS - 1); // ghost respawns at its corner after a scare
      gameVerdictSfx(false);
      if (newHearts <= 0) {
        setLock(true);
        timerRef.current = setTimeout(() => finish(correctCount), 700);
      }
      return;
    }
    setGhost(gstep);
  };

  if (!q) return null;
  const [hx, hy] = xy(hero);

  return (
    <div data-testid="game-maze-chase" className="flex flex-col items-center gap-3">
      <GameRoundDots total={rounds.length} done={round} />
      <div className="flex items-center gap-1 text-xl" data-testid="maze-hearts">
        {Array.from({ length: HEARTS }, (_, i) => (
          <span key={i} className={i < hearts ? '' : 'opacity-25'}>❤️</span>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-2.5 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <span className="text-lg font-extrabold text-slate-800">{q.word}</span>
        <span className="text-base font-semibold text-slate-500">- đến ô có hình đúng!</span>
        <ModelSpeaker word={q.word} />
      </div>
      <div
        data-testid="maze-board"
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))` }}
      >
        {Array.from({ length: CELLS }, (_, cell) => {
          const [cx, cy] = xy(cell);
          const adjacent = Math.abs(hx - cx) + Math.abs(hy - cy) === 1;
          const pad = layout.pads.find((p) => p.cell === cell && !removedPads.includes(p.cell));
          const wall = layout.walls.has(cell);
          const isHero = cell === hero;
          const isGhost = cell === ghost;
          const content = isHero ? '🐷' : isGhost ? '👻' : pad ? q.options[pad.option] : wall ? '🧱' : '';
          return (
            <button
              key={cell}
              type="button"
              data-testid={`maze-cell-${cell}`}
              disabled={lock || !adjacent || wall}
              onClick={() => move(cell)}
              aria-label={`Ô ${cell + 1}${pad ? ` - đáp án` : ''}`}
              className={`flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition motion-reduce:transition-none ${
                wall
                  ? 'bg-slate-700/70'
                  : isHero
                    ? 'bg-amber-300'
                    : isGhost
                      ? 'bg-rose-400/60 game-drift'
                      : pad
                        ? 'border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100'
                        : 'bg-navy-800/70'
              } ${adjacent && !wall ? 'ring-2 ring-sky-300/70 hover:scale-105 active:scale-95' : ''} disabled:cursor-default focus:outline-none focus:ring-4 focus:ring-amber-300`}
            >
              {content}
            </button>
          );
        })}
      </div>
      <p className="text-sm font-semibold text-slate-300">Chạm ô sáng kế bên để đi - coi chừng con ma!</p>
    </div>
  );
}
