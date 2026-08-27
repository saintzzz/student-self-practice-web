import type { Question } from '../types';
import type { CurrentAnswer } from '../lib/practiceSession';
import { getCorrectWord } from '../lib/practiceSession';
import ImageChoiceQuestion from './ImageChoiceQuestion';
import ListeningFillBlankQuestion from './ListeningFillBlankQuestion';
import FeedbackPanel from './FeedbackPanel';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  currentAnswer: CurrentAnswer | null;
  onSubmitImageChoice: (index: number) => void;
  onSubmitListening: (typedAnswer: string) => void;
  onNext: () => void;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  currentAnswer,
  onSubmitImageChoice,
  onSubmitListening,
  onNext,
}: QuestionCardProps) {
  const hasAnswered = currentAnswer !== null;

  return (
    <div
      data-testid="question-card"
      data-question-kind={question.kind}
      className="mx-auto max-w-2xl px-4 py-10 text-center"
    >
      <p data-testid="question-progress" className="mb-6 text-lg font-bold text-sky-600">
        Câu {questionNumber}/{totalQuestions}
      </p>

      {question.kind === 'image-choice' ? (
        <ImageChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitImageChoice}
        />
      ) : (
        <ListeningFillBlankQuestion
          key={question.id}
          question={question}
          hasAnswered={hasAnswered}
          onSubmit={onSubmitListening}
        />
      )}

      {currentAnswer && (
        <FeedbackPanel
          kind={question.kind}
          isCorrect={currentAnswer.isCorrect}
          correctWord={getCorrectWord(question)}
          explanation={question.explanation}
        />
      )}

      <button
        type="button"
        data-testid="next-button"
        disabled={!hasAnswered}
        onClick={onNext}
        className="mt-8 rounded-2xl bg-amber-500 px-10 py-4 text-2xl font-bold text-white shadow-md transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Câu tiếp theo →
      </button>
    </div>
  );
}
