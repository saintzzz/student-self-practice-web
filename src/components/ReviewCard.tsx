import { useState } from 'react';
import { getDueReviewItems } from '../lib/engagement/store';
import { CARD } from '../lib/ui/tokens';

interface ReviewCardProps {
  gradeId: string;
  onStartReview: () => void;
}

/**
 * CR-28: "Ôn lại câu sai" card - only renders when spaced-repetition
 * items are due. Wrong answers from Luyen de / Thi thu come back at
 * +1 / +3 / +7 days until mastered.
 */
export default function ReviewCard({ gradeId, onStartReview }: ReviewCardProps) {
  const [dueCount] = useState(() => getDueReviewItems(gradeId).length);
  if (dueCount === 0) return null;

  return (
    <div data-testid="review-card" className={`mt-4 ${CARD} text-left`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-amber-300">📚 Ôn lại câu sai</h2>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            Có <span className="font-extrabold text-amber-300">{dueCount} câu</span> em từng làm sai
            đang chờ ôn lại - làm đúng vài lần là nhớ lâu luôn!
          </p>
        </div>
        <button
          type="button"
          data-testid="start-review"
          onClick={onStartReview}
          className="shrink-0 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3 font-display text-lg font-extrabold text-amber-950 shadow-[inset_0_-3px_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
        >
          Ôn ngay
        </button>
      </div>
    </div>
  );
}
