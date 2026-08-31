import { getCurrentQuestion, type PracticeSessionState } from '../lib/practiceSession';
import QuestionCard from './QuestionCard';

interface ActiveRoundQuestionProps {
  session: PracticeSessionState;
  onSubmitOption: (index: number) => void;
  onSubmitListening: (typedAnswer: string) => void;
  onSubmitExtraLetter: (letterIndex: number) => void;
  onSubmitPronunciation: (transcript: string) => void;
  onNextQuestion: () => void;
}

/** Thin adapter between a Round's question-loop session and the shared QuestionCard shell. */
export default function ActiveRoundQuestion({
  session,
  onSubmitOption,
  onSubmitListening,
  onSubmitExtraLetter,
  onSubmitPronunciation,
  onNextQuestion,
}: ActiveRoundQuestionProps) {
  const question = getCurrentQuestion(session);
  if (!question) {
    return null;
  }

  return (
    <QuestionCard
      question={question}
      questionNumber={session.currentIndex + 1}
      totalQuestions={session.questions.length}
      currentAnswer={session.currentAnswer}
      onSubmitOption={onSubmitOption}
      onSubmitListening={onSubmitListening}
      onSubmitExtraLetter={onSubmitExtraLetter}
      onSubmitPronunciation={onSubmitPronunciation}
      onNext={onNextQuestion}
    />
  );
}
