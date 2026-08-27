import type { SessionResult } from '../types';
import { getIncorrectAnswers } from '../lib/practiceSession';

interface ResultSummaryProps {
  result: SessionResult;
  onPracticeAgain: () => void;
  onChooseTopic: () => void;
}

export default function ResultSummary({ result, onPracticeAgain, onChooseTopic }: ResultSummaryProps) {
  const incorrectAnswers = getIncorrectAnswers(result);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Session complete</h1>
      <p data-testid="score-summary" className="mb-8 text-lg text-slate-700">
        You scored {result.correctCount}/{result.totalCount} correct.
      </p>

      {incorrectAnswers.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Review your incorrect answers</h2>
          <ul className="space-y-4">
            {incorrectAnswers.map((answer, index) => (
              <li
                key={answer.question.id}
                data-testid={`incorrect-item-${index}`}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <p className="font-medium text-slate-900">{answer.question.text}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Correct answer: {answer.question.options[answer.question.correctIndex]}
                </p>
                <p className="mt-1 text-sm text-slate-600">{answer.question.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          data-testid="practice-again-button"
          onClick={onPracticeAgain}
          className="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white transition hover:bg-indigo-700"
        >
          Practice again
        </button>
        <button
          type="button"
          data-testid="choose-topic-button"
          onClick={onChooseTopic}
          className="rounded-lg border border-slate-300 bg-white px-6 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Choose another topic
        </button>
      </div>
    </div>
  );
}
