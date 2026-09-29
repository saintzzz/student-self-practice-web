/**
 * CR-10 DS-R1: correct-answer confetti burst. ~14 particles radiating
 * from the feedback area, transform/opacity only, 700ms, absolutely
 * positioned so it never shifts layout. Reduced-motion renders nothing
 * (the banner tint already carries the state).
 */
const COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#38bdf8', '#a78bfa'];

interface Particle {
  dx: number;
  dy: number;
  rot: number;
  size: number;
  round: boolean;
  color: string;
  delay: number;
}

const PARTICLES: Particle[] = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const dist = 46 + (i % 4) * 16;
  return {
    dx: Math.cos(angle) * dist,
    dy: Math.sin(angle) * dist - 18,
    rot: (i % 5) * 72 - 144,
    size: 7 + (i % 3) * 3,
    round: i % 2 === 0,
    color: COLORS[i % COLORS.length],
    delay: (i % 4) * 35,
  };
});

export default function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="confetti-particle absolute left-1/2 top-2"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.round ? '50%' : '2px',
            // CSS vars consumed by the confetti keyframes in index.css.
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rot' as string]: `${p.rot}deg`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
