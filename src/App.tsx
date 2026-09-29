import { useState } from 'react';
import GradeSelect from './components/GradeSelect';
import StartBatchScreen from './components/StartBatchScreen';
import BatchScreen from './components/BatchScreen';
import CreditsScreen from './components/CreditsScreen';
import { GRADES } from './data/vocabulary';
import {
  advanceRoundQuestion,
  createBatch,
  endRoundEarly,
  goToNextRound,
  updateRoundSession,
  type BatchState,
} from './lib/batch/batchSession';
import {
  submitExtraLetterAnswer,
  submitListeningAnswer,
  submitOptionAnswer,
  submitPairMatchingAnswer,
  submitPronunciationAnswer,
} from './lib/practiceSession';

type Screen = 'grade-select' | 'start-batch' | 'batch' | 'credits';

export default function App() {
  const [screen, setScreen] = useState<Screen>('grade-select');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [focusCreditsLink, setFocusCreditsLink] = useState(false);

  function handleSelectGrade(gradeId: string): void {
    setSelectedGradeId(gradeId);
    setScreen('start-batch');
  }

  function handleBackToGrades(): void {
    setSelectedGradeId(null);
    setBatch(null);
    setScreen('grade-select');
  }

  function handleOpenCredits(): void {
    setFocusCreditsLink(false);
    setScreen('credits');
  }

  function handleCreditsBack(): void {
    // AC-7.10: focus returns to the "Nguồn hình ảnh" pill on grade-select.
    setFocusCreditsLink(true);
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

  function handleSubmitPronunciation(transcript: string): void {
    if (!batch) return;
    setBatch(updateRoundSession(batch, (session) => submitPronunciationAnswer(session, transcript)));
  }

  function handleSubmitPairMatching(isCorrect: boolean): void {
    if (!batch) return;
    setBatch(updateRoundSession(batch, (session) => submitPairMatchingAnswer(session, isCorrect)));
  }

  function handleNextQuestion(): void {
    if (!batch) return;
    setBatch(advanceRoundQuestion(batch));
  }

  function handleNextRound(): void {
    if (!batch) return;
    setBatch(goToNextRound(batch));
  }

  /** Round's 5:00 countdown reached 0 (plan.md v7 AC28) - end the Round now, scored on whatever was answered so far. */
  function handleRoundTimeExpired(): void {
    if (!batch) return;
    setBatch(endRoundEarly(batch));
  }

  if (screen === 'credits') {
    return <CreditsScreen onBack={handleCreditsBack} />;
  }

  if (screen === 'grade-select') {
    return (
      <GradeSelect
        grades={GRADES}
        onSelectGrade={handleSelectGrade}
        onOpenCredits={handleOpenCredits}
        focusCreditsLink={focusCreditsLink}
      />
    );
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
        onSubmitPronunciation={handleSubmitPronunciation}
        onSubmitPairMatching={handleSubmitPairMatching}
        onNextQuestion={handleNextQuestion}
        onNextRound={handleNextRound}
        onStartNewBatch={handleStartBatch}
        onChooseGrade={handleBackToGrades}
        onRoundTimeExpired={handleRoundTimeExpired}
      />
    );
  }

  return (
    <GradeSelect
      grades={GRADES}
      onSelectGrade={handleSelectGrade}
      onOpenCredits={handleOpenCredits}
      focusCreditsLink={focusCreditsLink}
    />
  );
}
