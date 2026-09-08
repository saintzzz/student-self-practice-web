interface RoundProgressProps {
  roundNumber: number;
  totalRounds: number;
  titleVi: string;
}

/**
 * Persistent header shown across every phase of a Round except the Batch
 * summary. Kept deliberately compact (plan.md v9 "Fix the responsive
 * overflow bug") - the round title is hidden on very short viewports
 * (landscape phones) since the round number alone still conveys progress
 * and every line saved here helps keep the answer/Next button reachable
 * without scrolling.
 */
export default function RoundProgress({ roundNumber, totalRounds, titleVi }: RoundProgressProps) {
  return (
    <div data-testid="round-progress" className="mb-1 text-center">
      <p className="text-base font-bold text-emerald-700">
        Vòng {roundNumber}/{totalRounds}
      </p>
      <p className="text-sm font-semibold text-slate-600 [@media(max-height:420px)]:hidden">{titleVi}</p>
    </div>
  );
}
