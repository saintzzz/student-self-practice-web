import { useState } from 'react';
import { getDueReviewItems } from '../lib/engagement/store';
import { CARD, BTN_SECONDARY_NAVY } from '../lib/ui/tokens';
import { useViewer } from '../lib/viewer/ViewerContext';
import { IconBook } from './icons';

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
  const { density } = useViewer();
  if (dueCount === 0) return null;

  return (
    <div data-testid="review-card" className={`mt-4 ${CARD} text-left`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-amber-300"><IconBook size={20} aria-hidden="true" /> Ôn lại câu sai</h2>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            Có <span className="font-extrabold text-amber-300">{dueCount} câu</span> em từng làm sai
            đang chờ ôn lại - làm đúng vài lần là nhớ lâu luôn!
          </p>
        </div>
        <button
          type="button"
          data-testid="start-review"
          onClick={onStartReview}
          className={`shrink-0 ${BTN_SECONDARY_NAVY} px-5 py-3 text-lg`}
          style={{ minHeight: density.primaryMinH }}
        >
          Ôn ngay
        </button>
      </div>
    </div>
  );
}
