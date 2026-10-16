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
   * autoplays once per ROUND (all grades), not once per question.
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

  /* CR-79 A5: consecutive-correct run ending at the current answer.
     recordAnswer pushes each attempt into session.answers as it lands,
     so the tail run-length already includes the current answer. */
  let correctStreak = 0;
  for (let i = session.answers.length - 1; i >= 0 && session.answers[i].isCorrect; i -= 1) {
    correctStreak += 1;
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
      correctStreak={correctStreak}
    />
  );
}
