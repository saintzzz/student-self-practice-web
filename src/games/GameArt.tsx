import { EmojiVisual } from '../components/EmojiVisual';

/**
 * CR-88: composed card art - the game's mini diorama. `art` lists the
 * scene's emoji left-to-right; the center item is the hero (largest).
 * CR-89: items render through EmojiVisual (twemoji svg) so card art is
 * crisp art instead of the platform emoji font. `animated` lifts the
 * hero item to its Lottie clip - only in in-screen contexts (shelf cards
 * stay static so the 15-card grid never exceeds the Lottie budget,
 * constitution #5 / CR-89).
 */
export default function GameArt({
  art,
  emoji,
  size = 'card',
  animated = false,
}: {
  art?: readonly string[];
  emoji: string;
  size?: 'card' | 'hero';
  animated?: boolean;
}) {
  const scene = art && art.length > 0 ? art : [emoji];
  const heroIdx = Math.floor(scene.length / 2);
  const heroCls = size === 'hero' ? 'text-6xl -translate-y-1' : 'text-4xl -translate-y-0.5';
  const sideCls = size === 'hero' ? 'text-2xl' : 'text-lg';
  return (
    <span className="relative flex items-end justify-center gap-1" aria-hidden>
      {scene.map((e, i) => (
        <EmojiVisual
          key={i}
          emoji={e}
          variant="block"
          animated={animated && i === heroIdx}
          className={i === heroIdx ? `${heroCls} drop-shadow-[0_3px_4px_rgba(0,0,0,0.35)]` : `${sideCls} opacity-80`}
        />
      ))}
    </span>
  );
}
