import { CHIP_SKY, PROGRESS_FILL, PROGRESS_TRACK } from '../lib/ui/tokens';

interface RoundProgressProps {
  roundNumber: number;
  totalRounds: number;
  titleVi: string;
  /**
   * CR-09 header track fill (0-1): fraction of the current Round's
   * questions answered during play, or completedRounds/totalRounds in
   * non-active phases. Defaults to the whole-round position.
   */
  progressFraction?: number;
}

/**
 * Persistent header shown across every phase of a Round except the Batch
 * summary (plan.md v9 "Fix the responsive overflow bug" - the round title
 * stays hidden on very short viewports since the round number alone still
 * conveys progress). CR-09 DS-U2: rendered as one header unit - a "Vong
 * X/4" chip + animated progress track - with the timer/score chips the
 * caller places beside it inside the shared strip.
 */
export default function RoundProgress({
  roundNumber,
  totalRounds,
  titleVi,
  progressFraction,
}: RoundProgressProps) {
  const fraction = Math.min(1, Math.max(0, progressFraction ?? roundNumber / totalRounds));

  return (
    <div data-testid="round-progress" className="w-full min-w-0 sm:flex-1">
      <div className="flex items-center gap-2">
        <p className={CHIP_SKY}>
          Vòng {roundNumber}/{totalRounds}
        </p>
        <div className={PROGRESS_TRACK} aria-hidden="true">
          <div className={PROGRESS_FILL} style={{ width: `${Math.round(fraction * 100)}%` }} />
        </div>
      </div>
      <p className="mt-0.5 text-sm font-semibold text-slate-600 [@media(max-height:420px)]:hidden">
        {titleVi}
      </p>
    </div>
  );
}
