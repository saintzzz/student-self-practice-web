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
    <div className={`mx-auto max-w-2xl px-4 py-6 sm:py-10 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
        <div className="mb-6 text-left">
          <button type="button" data-testid="back-to-grades" onClick={onBack} className={NAV_PILL}>
            ← Quay lại chọn lớp
          </button>
        </div>
        <Mascot mood="greeting" />
        <h1 className={`mt-1 ${H1}`}>{grade.name}: Sẵn sàng luyện tập chưa?</h1>
        <p className={`mt-3 ${PROMPT}`}>
          Một bài luyện tập gồm 4 vòng nhỏ, mỗi vòng khoảng 10 câu hỏi. Bấm nút bên dưới để bắt đầu nhé!
        </p>
        <button
          type="button"
          data-testid="start-batch-button"
          onClick={onStartBatch}
          className="mt-8 min-h-[76px] w-full rounded-3xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-12 py-6 font-display text-3xl font-extrabold text-white shadow-[inset_0_-5px_0_rgba(0,0,0,0.18),0_8px_20px_-6px_rgba(16,185,129,0.5)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_-5px_0_rgba(0,0,0,0.18),0_14px_28px_-8px_rgba(16,185,129,0.55)] active:translate-y-0 active:scale-95 active:shadow-[inset_0_-2px_0_rgba(0,0,0,0.18),0_4px_10px_-4px_rgba(16,185,129,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-emerald-500 sm:w-auto"
        >
          Bắt đầu luyện tập →
        </button>
      </div>
    </div>
  );
}
