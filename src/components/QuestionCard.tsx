import type { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedIndex: number | null;
  onSelectOption: (index: number) => void;
  onNext: () => void;
}

function getOptionClassName(
  index: number,
  selectedIndex: number | null,
  correctIndex: number,
): string {
  const base = 'w-full rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500';

  if (selectedIndex === null) {
    return `${base} border-slate-200 bg-white hover:border-indigo-400`;
  }

  if (index === correctIndex) {
    return `${base} border-green-500 bg-green-50 text-green-900`;
  }

  if (index === selectedIndex) {
    return `${base} border-red-500 bg-red-50 text-red-900`;
  }

  return `${base} border-slate-200 bg-white opacity-60`;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedIndex,
  onSelectOption,
  onNext,
}: QuestionCardProps) {
  const hasAnswered = selectedIndex !== null;
  const isCorrect = hasAnswered && selectedIndex === question.correctIndex;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p data-testid="question-progress" className="mb-4 text-sm font-medium text-slate-500">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">{question.text}</h2>
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            data-testid={`option-${index}`}
            disabled={hasAnswered}
            onClick={() => onSelectOption(index)}
            className={getOptionClassName(index, selectedIndex, question.correctIndex)}
          >
            {option}
          </button>
        ))}
      </div>
      {hasAnswered && (
        <div className="mt-6 rounded-lg bg-slate-100 p-4">
          <p className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? 'Correct.' : 'Incorrect.'}
          </p>
          <p className="mt-1 text-sm text-slate-700">{question.explanation}</p>
        </div>
      )}
      <button
        type="button"
        data-testid="next-button"
        disabled={!hasAnswered}
        onClick={onNext}
        className="mt-6 rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Next
      </button>
    </div>
  );
}
