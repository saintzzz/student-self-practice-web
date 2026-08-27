import type { QuestionKind } from '../types';

interface FeedbackPanelProps {
  kind: QuestionKind;
  isCorrect: boolean;
  correctWord: string;
  explanation: string;
}

const KINDS_WITH_ANSWER_FEEDBACK_TESTID: readonly QuestionKind[] = ['listening-fill-blank', 'extra-letter'];

export default function FeedbackPanel({ kind, isCorrect, correctWord, explanation }: FeedbackPanelProps) {
  return (
    <div
      data-testid={KINDS_WITH_ANSWER_FEEDBACK_TESTID.includes(kind) ? 'answer-feedback' : undefined}
      className={`mt-6 rounded-2xl border-4 p-5 text-left ${
        isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'
      }`}
    >
      <p className={`text-2xl font-extrabold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
        {isCorrect ? 'Chính xác! Giỏi quá!' : 'Chưa đúng rồi, cố lên nhé!'}
      </p>
      <p className="mt-2 text-xl font-semibold text-sky-900">
        Từ đúng là: <span className="font-extrabold">{correctWord}</span>
      </p>
      <p className="mt-1 text-lg text-slate-700">{explanation}</p>
    </div>
  );
}
