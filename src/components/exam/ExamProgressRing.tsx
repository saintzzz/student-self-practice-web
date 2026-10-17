import { EXAM_RING_LABEL } from '../../lib/ui/tokens';

/**
 * CR-82 M5 (spec s10.3): 40px progress ring for the exam header -
 * "real test" chrome that replaces the plain Câu x/y pill in exam mode.
 * Answered fraction fills the ring; the current question number sits in
 * the centre so a kid at question 137/200 still reads exact progress.
 */
export function ExamProgressRing({
  current,
  total,
  answered,
}: {
  /** 0-based current index. */
  current: number;
  total: number;
  answered: number;
}) {
  const R = 15.5;
  const C = 2 * Math.PI * R;
  const fraction = total > 0 ? Math.min(1, answered / total) : 0;
  return (
    <span
      data-testid="exam-progress-ring"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={answered}
      aria-label={`Đã làm ${answered} trên ${total} câu - đang ở câu ${current + 1}`}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90" aria-hidden="true">
        <circle cx="20" cy="20" r={R} fill="none" strokeWidth="4" className="stroke-desk-line" />
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fraction)}
          className="stroke-amber-300 transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
        />
      </svg>
      <span aria-hidden="true" className={`absolute ${EXAM_RING_LABEL}`}>
        {current + 1}
      </span>
    </span>
  );
}
