import { PROGRESS_FILL, PROGRESS_TRACK } from '../lib/ui/tokens';

interface JourneyTrailProps {
  /** 1-based index of the question the child is on. */
  current: number;
  total: number;
}

/**
 * CR-82 M3 (DESIGN-SPEC-v5 s7.3): the journey trail - one stepping-stone
 * dot per question on the play board. Done stones and the current stone are
 * amber (the current one gets an amber ring), upcoming stones are dim white.
 * Above 12 questions the dots collapse into the existing PROGRESS_TRACK bar
 * so long batches never wrap the chrome strip. The trail is aria-hidden -
 * the `question-progress` text carries the same meaning for assistive tech.
 */
export default function JourneyTrail({ current, total }: JourneyTrailProps) {
  if (total > 12) {
    const pct = Math.min(100, Math.max(0, (current / total) * 100));
    return (
      <span aria-hidden="true" data-testid="journey-trail" className="inline-flex w-24 items-center">
        <span className={PROGRESS_TRACK}>
          <span className={PROGRESS_FILL} style={{ width: `${pct}%` }} />
        </span>
      </span>
    );
  }
  return (
    <span aria-hidden="true" data-testid="journey-trail" className="inline-flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        return (
          <span
            key={step}
            data-step={step}
            className={`h-2.5 w-2.5 rounded-full ${
              step <= current ? 'bg-amber-300' : 'bg-white/20'
            } ${step === current ? 'ring-4 ring-amber-300/30' : ''}`}
          />
        );
      })}
    </span>
  );
}
