interface RoundStubProps {
  titleVi: string;
  onNextRound: () => void;
}

/**
 * Placeholder shown for a Round with no real content yet (Round 3/4 in this
 * build - plan.md v5). No question loop, no crash - just a clear Vietnamese
 * "coming soon" message and the same next-round-button affordance used to
 * finish a real Round, so the Batch flow never gets stuck.
 */
export default function RoundStub({ titleVi, onNextRound }: RoundStubProps) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <div className="mb-6 text-6xl" aria-hidden="true">
        🚧
      </div>
      <h2 className="mb-3 text-2xl font-extrabold text-sky-900">{titleVi}</h2>
      <p className="mb-8 text-xl font-semibold text-sky-700">
        Vòng này đang được phát triển. Hẹn gặp lại em trong bản cập nhật tiếp theo nhé!
      </p>
      <button
        type="button"
        data-testid="next-round-button"
        onClick={onNextRound}
        className="rounded-2xl bg-amber-500 px-10 py-4 text-2xl font-bold text-white shadow-md transition hover:bg-amber-600"
      >
        Tiếp tục →
      </button>
    </div>
  );
}
