import type { Grade } from '../types';

interface StartBatchScreenProps {
  grade: Grade;
  onStartBatch: () => void;
  onBack: () => void;
}

/**
 * Replaces the old topic-selection screen (plan.md v5: "Grade -> Start a
 * Batch, a single button, no topic selection needed since a Batch pulls
 * from the whole vocabulary pool, not one topic").
 */
export default function StartBatchScreen({ grade, onStartBatch, onBack }: StartBatchScreenProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <button
        type="button"
        data-testid="back-to-grades"
        onClick={onBack}
        className="mb-6 rounded-full bg-sky-100 px-6 py-3 text-lg font-bold text-sky-700 transition hover:bg-sky-200 focus:outline-none focus:ring-4 focus:ring-sky-500"
      >
        ← Quay lại chọn lớp
      </button>
      <h1 className="mb-3 text-4xl font-extrabold text-sky-900">{grade.name}: Sẵn sàng luyện tập chưa?</h1>
      <p className="mb-10 text-xl text-sky-700">
        Một bài luyện tập gồm 4 vòng nhỏ, mỗi vòng khoảng 10 câu hỏi. Bấm nút bên dưới để bắt đầu nhé!
      </p>
      <button
        type="button"
        data-testid="start-batch-button"
        onClick={onStartBatch}
        className="rounded-3xl bg-emerald-500 px-12 py-8 text-3xl font-extrabold text-white shadow-md transition hover:scale-105 hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500"
      >
        Bắt đầu luyện tập
      </button>
    </div>
  );
}
