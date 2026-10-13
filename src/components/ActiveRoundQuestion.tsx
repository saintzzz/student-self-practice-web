import { getCurrentQuestion, type PracticeSessionState } from '../lib/practiceSession';
import QuestionCard from './QuestionCard';

interface ActiveRoundQuestionProps {
  session: PracticeSessionState;
  onSubmitOption: (index: number) => void;
  onSubmitListening: (typedAnswer: string) => void;
  onSubmitExtraLetter: (letterIndex: number) => void;
  onSubmitPronunciation: (transcript: string) => void;
  onSubmitPairMatching: (isCorrect: boolean) => void;
  onNextQuestion: () => void;
  /**
   * kids-UX (design s3.2): round-scoped key so the instruction speaker
   * autoplays once per ROUND on G1-2, not once per question.
   */
  speakerKey?: string;
}

/** Thin adapter between a Round's question-loop session and the shared QuestionCard shell. */
export default function ActiveRoundQuestion({
  session,
  onSubmitOption,
  onSubmitListening,
  onSubmitExtraLetter,
  onSubmitPronunciation,
  onSubmitPairMatching,
  onNextQuestion,
  speakerKey,
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
      onSubmitPairMatching={onSubmitPairMatching}
      onNext={onNextQuestion}
      speakerKey={speakerKey}
    />
  );
}
