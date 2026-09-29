import { EmojiVisual } from '../EmojiVisual';

/**
 * CR-10 DS-R3: 0-3 gold stars drop with a squash-bounce onto the round
 * summary. Reduced-motion shows the stars already landed (final state)
 * because the count itself is the reward information.
 */
export default function StarRain({ stars }: { stars: number }) {
  if (stars <= 0) return null;
  return (
    <div data-testid="star-rain" className="mb-2 flex items-end justify-center gap-2 text-4xl">
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className={i < stars ? 'star-drop' : 'opacity-25 grayscale'}
          style={{ animationDelay: `${i * 180}ms` }}
        >
          <EmojiVisual emoji="⭐" />
        </span>
      ))}
    </div>
  );
}
