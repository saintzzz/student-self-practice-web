import { useState } from 'react';
import GradeSelect from './components/GradeSelect';
import StartBatchScreen from './components/StartBatchScreen';
import BatchScreen from './components/BatchScreen';
import { GRADES } from './data/vocabulary';
import {
  advanceRoundQuestion,
  createBatch,
  goToNextRound,
  updateRoundSession,
  type BatchState,
} from './lib/batch/batchSession';
import { submitExtraLetterAnswer, submitListeningAnswer, submitOptionAnswer } from './lib/practiceSession';

type Screen = 'grade-select' | 'start-batch' | 'batch';

export default function App() {
  const [screen, setScreen] = useState<Screen>('grade-select');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchState | null>(null);

  function handleSelectGrade(gradeId: string): void {
    setSelectedGradeId(gradeId);
    setScreen('start-batch');
  }

  function handleBackToGrades(): void {
    setSelectedGradeId(null);
    setBatch(null);
    setScreen('grade-select');
  }

  function handleStartBatch(): void {
    setBatch(createBatch());
    setScreen('batch');
  }

  function handleSubmitOption(index: number): void {
    if (!batch) return;
    setBatch(updateRoundSession(batch, (session) => submitOptionAnswer(session, index)));
  }

  function handleSubmitListening(typedAnswer: string): void {
    if (!batch) return;
    setBatch(updateRoundSession(batch, (session) => submitListeningAnswer(session, typedAnswer)));
  }

  function handleSubmitExtraLetter(letterIndex: number): void {
    if (!batch) return;
    setBatch(updateRoundSession(batch, (session) => submitExtraLetterAnswer(session, letterIndex)));
  }

  function handleNextQuestion(): void {
    if (!batch) return;
    setBatch(advanceRoundQuestion(batch));
  }

  function handleNextRound(): void {
    if (!batch) return;
    setBatch(goToNextRound(batch));
  }

  if (screen === 'grade-select') {
    return <GradeSelect grades={GRADES} onSelectGrade={handleSelectGrade} />;
  }

  const selectedGrade = GRADES.find((grade) => grade.id === selectedGradeId);

  if (screen === 'start-batch' && selectedGrade) {
    return <StartBatchScreen grade={selectedGrade} onStartBatch={handleStartBatch} onBack={handleBackToGrades} />;
  }

  if (screen === 'batch' && batch) {
    return (
      <BatchScreen
        batch={batch}
        onSubmitOption={handleSubmitOption}
        onSubmitListening={handleSubmitListening}
        onSubmitExtraLetter={handleSubmitExtraLetter}
        onNextQuestion={handleNextQuestion}
        onNextRound={handleNextRound}
        onStartNewBatch={handleStartBatch}
        onChooseGrade={handleBackToGrades}
      />
    );
  }

  return <GradeSelect grades={GRADES} onSelectGrade={handleSelectGrade} />;
}
