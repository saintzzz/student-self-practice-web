import type { Grade } from '../types';
import Mascot from './Mascot';
import { CARD, H1, PROMPT, NAV_PILL, SCREEN_ENTER } from '../lib/ui/tokens';

interface StartBatchScreenProps {
  grade: Grade;
  onStartBatch: () => void;
  onBack: () => void;
}

/**
 * Replaces the old topic-selection screen (plan.md v5: "Grade -> Start a
 * Batch, a single button, no topic selection needed since a Batch pulls
 * from the whole vocabulary pool, not one topic"). Greets with the app-wide
 * pig mascot (plan.md v10, AC38).
 */
export default function StartBatchScreen({ grade, onStartBatch, onBack }: StartBatchScreenProps) {
  return (
    <div className={`mx-auto max-w-2xl px-4 py-12 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
        <div className="mb-4 text-left">
          <button type="button" data-testid="back-to-grades" onClick={onBack} className={NAV_PILL}>
            ← Quay lại chọn lớp
          </button>
        </div>
        <Mascot mood="greeting" />
        <h1 className={`mb-3 ${H1}`}>{grade.name}: Sẵn sàng luyện tập chưa?</h1>
        <p className={`mb-10 ${PROMPT}`}>
          Một bài luyện tập gồm 4 vòng nhỏ, mỗi vòng khoảng 10 câu hỏi. Bấm nút bên dưới để bắt đầu nhé!
        </p>
        <button
          type="button"
          data-testid="start-batch-button"
          onClick={onStartBatch}
          className="min-h-[76px] rounded-3xl bg-emerald-500 px-12 py-6 font-display text-3xl font-extrabold text-white shadow-lg transition hover:-translate-y-1 hover:bg-emerald-600 hover:shadow-xl active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-emerald-500"
        >
          Bắt đầu luyện tập →
        </button>
      </div>
    </div>
  );
}
