import { IconStar } from '../icons';

/**
 * CR-10 DS-R3: 0-3 gold stars drop with a squash-bounce onto the round
 * summary. Reduced-motion shows the stars already landed (final state)
 * because the count itself is the reward information.
 *
 * CR-82: the stars are gold SVG medallions (material.goldCta disc +
 * IconStar) - reward chrome is chrome, not content imagery, so the
 * emoji tile is replaced.
 */
export default function StarRain({ stars }: { stars: number }) {
  if (stars <= 0) return null;
  return (
    <div data-testid="star-rain" className="mb-2 flex items-end justify-center gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          data-testid={`star-medallion-${i}`}
          data-earned={i < stars ? 'true' : 'false'}
          className={`star-drop flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-3px_0_rgba(180,83,9,0.35),0_6px_0_#b45309] ${
            i < stars ? '' : 'opacity-25 grayscale'
          }`}
          style={{ animationDelay: `${i * 180}ms` }}
        >
          <IconStar size={28} className="fill-amber-950 text-amber-950" />
        </span>
      ))}
    </div>
  );
}
