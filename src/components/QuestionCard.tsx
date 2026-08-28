import type { Question } from '../types';
import type { CurrentAnswer } from '../lib/practiceSession';
import { getCorrectWord } from '../lib/practiceSession';
import ImageChoiceQuestion from './ImageChoiceQuestion';
import ListeningFillBlankQuestion from './ListeningFillBlankQuestion';
import ListeningSentenceFillBlankQuestion from './ListeningSentenceFillBlankQuestion';
import CountingImageQuestion from './CountingImageQuestion';
import ExtraLetterQuestion from './ExtraLetterQuestion';
import FeedbackPanel from './FeedbackPanel';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  currentAnswer: CurrentAnswer | null;
  onSubmitOption: (index: number) => void;
  onSubmitListening: (typedAnswer: string) => void;
  onSubmitExtraLetter: (letterIndex: number) => void;
  onNext: () => void;
}

function renderQuestionBody(
  question: Question,
  currentAnswer: CurrentAnswer | null,
  onSubmitOption: (index: number) => void,
  onSubmitListening: (typedAnswer: string) => void,
  onSubmitExtraLetter: (letterIndex: number) => void,
) {
  switch (question.kind) {
    case 'image-choice':
      return (
        <ImageChoiceQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
        />
      );
    case 'counting-image':
      return (
        <CountingImageQuestion
          key={question.id}
          question={question}
          selectedIndex={currentAnswer?.selectedIndex ?? null}
          onSelectOption={onSubmitOption}
        />
      );
    case 'listening-fill-blank':
      return (
        <ListeningFillBlankQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitListening}
        />
      );
    case 'listening-sentence-fill-blank':
      return (
        <ListeningSentenceFillBlankQuestion
          key={question.id}
          question={question}
          hasAnswered={currentAnswer !== null}
          onSubmit={onSubmitListening}
        />
      );
    case 'extra-letter':
      return (
        <ExtraLetterQuestion
          key={question.id}
          question={question}
          selectedLetterIndex={currentAnswer?.selectedLetterIndex ?? null}
          onSelectLetter={onSubmitExtraLetter}
        />
      );
  }
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  currentAnswer,
  onSubmitOption,
  onSubmitListening,
  onSubmitExtraLetter,
  onNext,
}: QuestionCardProps) {
  const hasAnswered = currentAnswer !== null;

  return (
    <div
      data-testid="question-card"
      data-question-kind={question.kind}
      data-count-direction={question.kind === 'counting-image' ? question.direction : undefined}
      className="mx-auto max-w-2xl px-4 py-10 text-center"
    >
      <p data-testid="question-progress" className="mb-6 text-lg font-bold text-sky-600">
        Câu {questionNumber}/{totalQuestions}
      </p>

      {renderQuestionBody(question, currentAnswer, onSubmitOption, onSubmitListening, onSubmitExtraLetter)}

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
