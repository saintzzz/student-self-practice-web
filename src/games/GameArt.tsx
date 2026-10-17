/**
 * CR-88: composed card art - the game's mini diorama. `art` lists the
 * scene's emoji left-to-right; the center item is the hero (largest).
 * Replaces the single bare emoji so every card reads as a tiny scene
 * (Monkey Junior direction) without new binary assets.
 */
export default function GameArt({
  art,
  emoji,
  size = 'card',
}: {
  art?: readonly string[];
  emoji: string;
  size?: 'card' | 'hero';
}) {
  const scene = art && art.length > 0 ? art : [emoji];
  const heroIdx = Math.floor(scene.length / 2);
  const heroCls = size === 'hero' ? 'text-6xl -translate-y-1' : 'text-4xl -translate-y-0.5';
  const sideCls = size === 'hero' ? 'text-2xl' : 'text-lg';
  return (
    <span className="relative flex items-end justify-center gap-1" aria-hidden>
      {scene.map((e, i) => (
        <span
          key={i}
          className={
            i === heroIdx
              ? `${heroCls} drop-shadow-[0_3px_4px_rgba(0,0,0,0.35)]`
              : `${sideCls} opacity-80`
          }
        >
          {e}
        </span>
      ))}
    </span>
  );
}
