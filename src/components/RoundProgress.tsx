interface RoundProgressProps {
  roundNumber: number;
  totalRounds: number;
  titleVi: string;
}

/** Persistent header shown across every phase of a Round except the Batch summary. */
export default function RoundProgress({ roundNumber, totalRounds, titleVi }: RoundProgressProps) {
  return (
    <div data-testid="round-progress" className="mb-6 text-center">
      <p className="text-lg font-bold text-emerald-700">
        Vòng {roundNumber}/{totalRounds}
      </p>
      <p className="text-base font-semibold text-slate-600">{titleVi}</p>
    </div>
  );
}
