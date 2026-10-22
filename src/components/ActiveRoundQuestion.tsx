import { getCurrentQuestion, type PracticeSessionState } from '../lib/practiceSession';
import type { TracingMeta } from '../types';
import QuestionCard from './QuestionCard';

interface ActiveRoundQuestionProps {
  session: PracticeSessionState;
  onSubmitOption: (index: number) => void;
  onSubmitListening: (typedAnswer: string) => void;
  onSubmitExtraLetter: (letterIndex: number) => void;
  onSubmitPronunciation: (transcript: string, options?: import('../lib/rounds/pronunciationScoring').PronunciationScoringOptions) => void;
  onSubmitPairMatching: (isCorrect: boolean) => void;
  /** CR-82 (D-10): letter-tracing submit carries TracingMeta. */
  onSubmitTracing?: (isCorrect: boolean, meta: TracingMeta) => void;
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
  onSubmitTracing,
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

  /* CR-99 M4: consecutive-wrong run - drives the attempt-ladder feedback
     (calmer copy + thinking mascot as misses stack up). */
  let wrongStreak = 0;
  for (let i = session.answers.length - 1; i >= 0 && !session.answers[i].isCorrect; i -= 1) {
    wrongStreak += 1;
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
      onSubmitTracing={onSubmitTracing}
      onNext={onNextQuestion}
      speakerKey={speakerKey}
      correctStreak={correctStreak}
      wrongStreak={wrongStreak}
    />
  );
}
