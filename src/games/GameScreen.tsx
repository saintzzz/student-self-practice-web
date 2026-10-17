import { useRef, useState } from 'react';
import LandShell from '../components/LandShell';
import StarRain from '../components/celebrations/StarRain';
import { IconArrowLeft, IconRefresh } from '../components/icons';
import { playSfx } from '../lib/sfx';
import { recordCorrectAnswers, recordGameResult } from '../lib/engagement/store';
import { GAME_DEFS } from './defs';
import { GAME_COMPONENTS } from './registry';
import type { GameEnd, GameId } from './types';
import type { Grade } from '../types';

interface GameScreenProps {
  grade: Grade;
  gameId: GameId;
  onExit: () => void;
}

/**
 * CR-83 game screen - one arcade run inside the grade's land vignette.
 * The shell owns: header (exit + identity), the seeded run (remount per
 * replay), and the award end screen (StarRain + score + replay/back).
 * Game components own the play loop and report one GameEnd.
 */
export default function GameScreen({ grade, gameId, onExit }: GameScreenProps) {
  const def = GAME_DEFS.find((d) => d.id === gameId);
  const Game = GAME_COMPONENTS[gameId];
  const [seed, setSeed] = useState(() => `${Date.now().toString(36)}`);
  const [end, setEnd] = useState<GameEnd | null>(null);
  const [stars, setStars] = useState(0);
  const endedRef = useRef(false);

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
    const award = recordGameResult(grade.id, gameId, seed, result.points, result.maxPoints);
    recordCorrectAnswers(result.correctCount);
    setStars(
      result.maxPoints > 0
        ? result.points >= result.maxPoints
          ? 3
          : result.points / result.maxPoints >= 0.75
            ? 2
            : result.points / result.maxPoints >= 0.5
              ? 1
              : 0
        : 0,
    );
    setEnd(result);
    playSfx('star');
    void award;
  };

  const replay = () => {
    endedRef.current = false;
    setEnd(null);
    setStars(0);
    setSeed(`${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`);
  };

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
          <div className="flex items-center gap-2.5">
            <span className="text-3xl" aria-hidden>{def.emoji}</span>
            <div>
              <h1 className="font-display text-xl font-extrabold text-white">{def.title}</h1>
              <p className="text-xs font-semibold text-slate-300">{def.tagline}</p>
            </div>
          </div>
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
                  onClick={onExit}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/20 bg-navy-800/70 px-6 py-3 text-lg font-bold text-slate-200 shadow transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-sky-400"
                >
                  Khu trò chơi
                </button>
              </div>
            </div>
          ) : (
            <Game key={seed} grade={grade} seed={seed} onEnd={handleEnd} />
          )}
        </main>
      </div>
    </LandShell>
  );
}
