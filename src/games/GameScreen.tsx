import { useEffect, useRef, useState } from 'react';
import LandShell from '../components/LandShell';
import StarRain from '../components/celebrations/StarRain';
import { IconArrowLeft, IconRefresh } from '../components/icons';
import { playSfx } from '../lib/sfx';
import { gameLevelStars, recordCorrectAnswers, recordGameResult, starsForScore } from '../lib/engagement/store';
import { GAME_DEFS } from './defs';
import { GAME_COMPONENTS } from './registry';
import GameArt from './GameArt';
import { GAME_LEVELS, LEVEL_META, specFor, timeBonusFor, type GameLevel } from './levels';
import type { GameEnd, GameId } from './types';
import type { Grade } from '../types';

interface GameScreenProps {
  grade: Grade;
  gameId: GameId;
  onExit: () => void;
}

function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** CR-88: level pick - 3 difficulty rungs, per-level best stars. */
function LevelPicker({ gameId, onPick }: { gameId: GameId; onPick: (level: GameLevel) => void }) {
  return (
    <div data-testid="game-level-picker" className="flex flex-1 flex-col items-center justify-center gap-3">
      <p className="text-sm font-bold text-slate-300">Chọn màn chơi</p>
      {GAME_LEVELS.map((level) => {
        const meta = LEVEL_META[level];
        const best = gameLevelStars(gameId, level);
        return (
          <button
            key={level}
            type="button"
            data-testid={`game-level-${level}`}
            onClick={() => onPick(level)}
            className="flex w-full items-center gap-3 rounded-2xl border-b-4 border-sky-700 bg-gradient-to-br from-sky-300 to-sky-500 px-4 py-3 text-left shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_8px_18px_-8px_rgba(0,0,0,0.5)] transition hover:brightness-105 active:scale-[0.99] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/40 font-display text-lg font-extrabold text-slate-900 ring-1 ring-white/60">
              {level}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-slate-900">{meta.label}</span>
              <span className="block text-xs font-semibold text-slate-900/90">{meta.hint}</span>
            </span>
            <span aria-label={`Màn ${level}: ${best} sao`} className="text-sm tracking-wider">
              {[0, 1, 2].map((i) => (
                <span key={i} className={i < best ? 'text-amber-600' : 'text-slate-900/25'}>★</span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * CR-83 game screen - one arcade run inside the grade's land vignette.
 * The shell owns: header (exit + identity + run clock), level pick, the
 * seeded run (remount per replay), and the award end screen (StarRain +
 * score + speed bonus + replay/back). Game components own the play loop
 * and report one GameEnd.
 *
 * CR-88: the run clock measures mount->onEnd; beating the level's par
 * adds a "+điểm nhanh" bonus shown on the end screen (stars stay
 * accuracy-only per the clean-play doctrine).
 */
export default function GameScreen({ grade, gameId, onExit }: GameScreenProps) {
  const def = GAME_DEFS.find((d) => d.id === gameId);
  const Game = GAME_COMPONENTS[gameId];
  const [seed, setSeed] = useState(() => `${Date.now().toString(36)}`);
  const [level, setLevel] = useState<GameLevel | null>(null);
  const [end, setEnd] = useState<GameEnd | null>(null);
  const [stars, setStars] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tick, setTick] = useState(0);
  const [bonus, setBonus] = useState(0);
  const endedRef = useRef(false);
  const startRef = useRef(0);

  /* Live run clock - ticks while playing, cleaned on unmount. */
  useEffect(() => {
    if (level === null || end) return;
    startRef.current = Date.now();
    setElapsedMs(0);
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [level, end, seed]);

  if (!def || !Game) {
    return (
      <LandShell gradeId={grade.id} variant="hero">
        <div className="mx-auto max-w-md px-4 py-10 text-center text-slate-200">
          Chưa có trò chơi này - quay lại khu trò chơi nhé.
          <div className="mt-4">
            <button type="button" data-testid="game-exit" onClick={onExit} className="rounded-2xl bg-amber-400 px-6 py-3 font-bold text-amber-950">
              Quay lại
            </button>
          </div>
        </div>
      </LandShell>
    );
  }

  const handleEnd = (result: GameEnd) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const elapsed = Date.now() - startRef.current;
    setElapsedMs(elapsed);
    const spec = specFor(level ?? 1);
    const starCount = starsForScore(result.points, result.maxPoints);
    /* Speed bonus only on a run worth >=1 star - a fast wipeout is not
       a "fast win" (review r39). */
    setBonus(starCount > 0 ? timeBonusFor(elapsed, spec, Math.round(result.maxPoints * 0.2)) : 0);
    const award = recordGameResult(grade.id, gameId, seed, result.points, result.maxPoints, level ?? 1);
    recordCorrectAnswers(result.correctCount);
    setStars(starCount);
    setEnd(result);
    playSfx('star');
    void award;
  };

  const freshSeed = () =>
    setSeed(`${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`);

  const replay = () => {
    endedRef.current = false;
    setEnd(null);
    setStars(0);
    setBonus(0);
    setTick(0);
    freshSeed();
  };

  /* Back to the level picker = a NEW run on the next pick, so the seed
     must rotate too - otherwise the identical objective id is already
     granted and the replay silently earns nothing (review r39). */
  const backToPicker = () => {
    endedRef.current = false;
    setLevel(null);
    setEnd(null);
    setBonus(0);
    setTick(0);
    freshSeed();
  };

  const playing = level !== null && !end;
  const liveElapsed = playing ? Date.now() - startRef.current : elapsedMs;
  void tick;

  return (
    <LandShell gradeId={grade.id} variant="hero">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5">
        <header className="mb-4 flex items-center gap-3">
          <button
            type="button"
            data-testid="game-exit"
            onClick={onExit}
            aria-label="Quay lại khu trò chơi"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-navy-800/70 text-slate-200 shadow transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-sky-400"
          >
            <IconArrowLeft size={20} />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <GameArt art={def.art} emoji={def.emoji} />
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-extrabold text-white">{def.title}</h1>
              <p className="truncate text-xs font-semibold text-slate-300">
                {level !== null ? `${LEVEL_META[level].label} - ${def.tagline}` : def.tagline}
              </p>
            </div>
          </div>
          {playing && (
            <span
              data-testid="game-timer"
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 font-mono text-sm font-bold text-amber-200 ring-1 ring-white/15"
            >
              ⏱ {formatClock(liveElapsed)}
            </span>
          )}
        </header>

        <main className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-navy-900/70 p-5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)] backdrop-blur">
          {end ? (
            <div data-testid="game-end-screen" className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <StarRain stars={stars} />
              <p className="font-display text-2xl font-extrabold text-white">
                {stars >= 3 ? 'Xuất sắc!' : stars >= 1 ? 'Giỏi lắm!' : 'Cố lên em!'}
              </p>
              <p className="text-lg font-semibold text-amber-200">
                {end.points}/{end.maxPoints} điểm - {end.correctCount} câu đúng
              </p>
              <p data-testid="game-time-report" className="text-sm font-semibold text-slate-300">
                ⏱ {formatClock(elapsedMs)}
                {bonus > 0 && (
                  <span data-testid="game-time-bonus" className="ml-2 text-emerald-300">+{bonus} điểm nhanh</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  data-testid="game-replay"
                  onClick={replay}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-lg font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-3px_0_rgba(0,0,0,0.15),0_4px_10px_-3px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-amber-300"
                >
                  <IconRefresh size={18} /> Chơi lại
                </button>
                <button
                  type="button"
                  data-testid="game-back-to-zone"
                  onClick={backToPicker}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/20 bg-navy-800/70 px-6 py-3 text-lg font-bold text-slate-200 shadow transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-sky-400"
                >
                  Chọn màn
                </button>
                <button
                  type="button"
                  data-testid="game-exit-zone"
                  onClick={onExit}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/20 bg-navy-800/70 px-6 py-3 text-lg font-bold text-slate-200 shadow transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-sky-400"
                >
                  Khu trò chơi
                </button>
              </div>
            </div>
          ) : level === null ? (
            <LevelPicker gameId={gameId} onPick={setLevel} />
          ) : (
            <Game key={`${seed}-L${level}`} grade={grade} seed={`${seed}-L${level}`} level={level} onEnd={handleEnd} />
          )}
        </main>
      </div>
    </LandShell>
  );
}
