import { useState } from 'react';
import GradeSelect from './components/GradeSelect';
import TopicSelect from './components/TopicSelect';
import QuestionCard from './components/QuestionCard';
import ResultSummary from './components/ResultSummary';
import { GRADES, getQuestionsByTopic, getTopicsByGrade } from './data/questions';
import {
  advanceToNextQuestion,
  computeSessionResult,
  createSession,
  getCurrentQuestion,
  isSessionComplete,
  submitExtraLetterAnswer,
  submitListeningAnswer,
  submitOptionAnswer,
  type PracticeSessionState,
} from './lib/practiceSession';

type Screen = 'grade-select' | 'topic-select' | 'practice' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('grade-select');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [session, setSession] = useState<PracticeSessionState | null>(null);

  function handleSelectGrade(gradeId: string): void {
    setSelectedGradeId(gradeId);
    setScreen('topic-select');
  }

  function handleBackToGrades(): void {
    setSelectedGradeId(null);
    setScreen('grade-select');
  }

  function handleSelectTopic(topicId: string): void {
    setSelectedTopicId(topicId);
    setSession(createSession(getQuestionsByTopic(topicId)));
    setScreen('practice');
  }

  function handleSubmitOption(index: number): void {
    if (!session) return;
    setSession(submitOptionAnswer(session, index));
  }

  function handleSubmitListening(typedAnswer: string): void {
    if (!session) return;
    setSession(submitListeningAnswer(session, typedAnswer));
  }

  function handleSubmitExtraLetter(letterIndex: number): void {
    if (!session) return;
    setSession(submitExtraLetterAnswer(session, letterIndex));
  }

  function handleNext(): void {
    if (!session) return;
    const advanced = advanceToNextQuestion(session);
    setSession(advanced);
    if (isSessionComplete(advanced)) {
      setScreen('result');
    }
  }

  function handlePracticeAgain(): void {
    if (!selectedTopicId) return;
    setSession(createSession(getQuestionsByTopic(selectedTopicId)));
    setScreen('practice');
  }

  function handleChooseTopic(): void {
    setSession(null);
    setScreen('topic-select');
  }

  if (screen === 'grade-select') {
    return <GradeSelect grades={GRADES} onSelectGrade={handleSelectGrade} />;
  }

  const selectedGrade = GRADES.find((grade) => grade.id === selectedGradeId);

  if (screen === 'topic-select' && selectedGrade) {
    return (
      <TopicSelect
        grade={selectedGrade}
        topics={getTopicsByGrade(selectedGrade.id)}
        onSelectTopic={handleSelectTopic}
        onBack={handleBackToGrades}
      />
    );
  }

  if (screen === 'practice' && session) {
    const currentQuestion = getCurrentQuestion(session);
    if (currentQuestion) {
      return (
        <QuestionCard
          question={currentQuestion}
          questionNumber={session.currentIndex + 1}
          totalQuestions={session.questions.length}
          currentAnswer={session.currentAnswer}
          onSubmitOption={handleSubmitOption}
          onSubmitListening={handleSubmitListening}
          onSubmitExtraLetter={handleSubmitExtraLetter}
          onNext={handleNext}
        />
      );
    }
  }

  if (screen === 'result' && session) {
    return (
      <ResultSummary
        result={computeSessionResult(session)}
        onPracticeAgain={handlePracticeAgain}
        onChooseTopic={handleChooseTopic}
      />
    );
  }

  return <GradeSelect grades={GRADES} onSelectGrade={handleSelectGrade} />;
}
