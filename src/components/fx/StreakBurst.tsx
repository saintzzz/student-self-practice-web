/**
 * CR-82 (spec s16.2, keyframe s5.4): the streak-burst ring behind the
 * sheet perch. 1 ring at streak 3, 2 at 5, 3 at 10 - staggered 120ms so
 * each ring reads as its own pulse. Decorative only: aria-hidden,
 * pointer-events-none. Rendered by QuestionCard INSIDE the same
 * non-scrolling perch layer as the mascot (`absolute -top-11 right-4`,
 * behind the MascotPlayer) and omitted at max-height:420px - the sheet
 * perch is hidden there entirely. Reduced motion drops the animation
 * via motion-reduce; the rings are decorative so no static twin needed.
 */

interface StreakBurstProps {
  /** Current consecutive-correct count (>=3 renders rings). */
  streak: number;
}

function ringCount(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}

export default function StreakBurst({ streak }: StreakBurstProps) {
  const rings = ringCount(streak);
  if (rings === 0) return null;
  return (
    <span
      aria-hidden="true"
      data-testid="streak-burst"
      data-rings={rings}
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
    >
      {Array.from({ length: rings }).map((_, i) => (
        <span
          key={`${streak}-${i}`}
          className="animate-streak-burst absolute h-12 w-12 rounded-full border-2 border-amber-300/80 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}
