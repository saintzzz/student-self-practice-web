import type { SessionResult } from '../types';
import { getCorrectWord, getIncorrectAnswers } from '../lib/practiceSession';

interface ResultSummaryProps {
  result: SessionResult;
  onPracticeAgain: () => void;
  onChooseTopic: () => void;
}

export default function ResultSummary({ result, onPracticeAgain, onChooseTopic }: ResultSummaryProps) {
  const incorrectAnswers = getIncorrectAnswers(result);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="mb-3 text-4xl font-extrabold text-sky-900">Hoàn thành!</h1>
      <p data-testid="score-summary" className="mb-10 text-2xl font-semibold text-sky-700">
        Em trả lời đúng {result.correctCount}/{result.totalCount} câu.
      </p>

      {incorrectAnswers.length > 0 && (
        <div className="mb-10 text-left">
          <h2 className="mb-4 text-xl font-bold text-sky-900">Xem lại các câu chưa đúng</h2>
          <ul className="space-y-4">
            {incorrectAnswers.map((answer, index) => (
              <li
                key={answer.question.id}
                data-testid={`incorrect-item-${index}`}
                className="rounded-2xl border-4 border-rose-200 bg-rose-50 p-5"
              >
                <p className="text-lg font-bold text-sky-900">
                  Từ đúng: <span className="font-extrabold">{getCorrectWord(answer.question)}</span>
                </p>
                <p className="mt-1 text-base text-slate-700">{answer.question.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <button
          type="button"
          data-testid="practice-again-button"
          onClick={onPracticeAgain}
          className="rounded-2xl bg-amber-500 px-8 py-4 text-2xl font-bold text-white shadow-md transition hover:bg-amber-600"
        >
          Luyện tập lại
        </button>
        <button
          type="button"
          data-testid="choose-topic-button"
          onClick={onChooseTopic}
          className="rounded-2xl border-4 border-sky-300 bg-white px-8 py-4 text-2xl font-bold text-sky-700 transition hover:bg-sky-50"
        >
          Chọn chủ đề khác
        </button>
      </div>
    </div>
  );
}
