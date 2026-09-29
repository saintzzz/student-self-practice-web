import { useEffect, useState } from 'react';
import GradeSelect from './components/GradeSelect';
import StartBatchScreen from './components/StartBatchScreen';
import BatchScreen from './components/BatchScreen';
import CreditsScreen from './components/CreditsScreen';
import AuthScreen from './components/AuthScreen';
import AdminScreen from './components/AdminScreen';
import { isSupabaseConfigured } from './lib/supabase/client';
import {
  fetchMyAccount,
  fetchMyAllowedGrades,
  getSession,
  logout,
  type PracticeAccount,
} from './lib/auth/practiceAuth';
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

type Screen = 'login' | 'admin' | 'grade-select' | 'start-batch' | 'batch' | 'credits';
/** 'off' = Supabase not configured (pre-CR-08 guest-only behavior). */
type AuthMode = 'off' | 'loading' | 'login' | 'guest' | 'student' | 'admin';

export default function App() {
  const configured = isSupabaseConfigured();
  const [authMode, setAuthMode] = useState<AuthMode>(configured ? 'loading' : 'off');
  const [myAccount, setMyAccount] = useState<PracticeAccount | null>(null);
  const [allowedGrades, setAllowedGrades] = useState<string[] | null>(null);
  const [screen, setScreen] = useState<Screen>('grade-select');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [focusCreditsLink, setFocusCreditsLink] = useState(false);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void (async () => {
      const session = await getSession();
      if (!session || cancelled) {
        if (!cancelled) setAuthMode('login');
        return;
      }
      const account = await fetchMyAccount();
      if (cancelled) return;
      if (!account) {
        setAuthMode('login');
        return;
      }
      setMyAccount(account);
      if (account.role === 'admin') {
        setAuthMode('admin');
        setScreen('admin');
      } else {
        setAllowedGrades(await fetchMyAllowedGrades());
        if (!cancelled) {
          setAuthMode('student');
          setScreen('grade-select');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  async function handleLoggedIn(): Promise<void> {
    const account = await fetchMyAccount();
    if (!account) return;
    setMyAccount(account);
    if (account.role === 'admin') {
      setAuthMode('admin');
      setScreen('admin');
    } else {
      setAllowedGrades(await fetchMyAllowedGrades());
      setAuthMode('student');
      setScreen('grade-select');
    }
  }

  async function handleSignOut(): Promise<void> {
    await logout();
    setMyAccount(null);
    setAllowedGrades(null);
    setBatch(null);
    setSelectedGradeId(null);
    setAuthMode('login');
    setScreen('login');
  }

  function handleGuest(): void {
    setAuthMode('guest');
    setScreen('grade-select');
  }

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
    setBatch(createBatch(undefined, selectedGradeId ?? 'grade-2'));
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

  if (authMode === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-lg font-bold text-sky-700">
        Đang tải...
      </div>
    );
  }

  if (configured && (authMode === 'login' || screen === 'login')) {
    return <AuthScreen onLoggedIn={handleLoggedIn} onGuest={handleGuest} />;
  }

  if (screen === 'admin' && myAccount) {
    return (
      <AdminScreen
        account={myAccount}
        onSignOut={handleSignOut}
        onPractice={() => setScreen('grade-select')}
      />
    );
  }

  if (screen === 'credits') {
    return <CreditsScreen onBack={handleCreditsBack} />;
  }

  const authChipProps =
    authMode === 'guest'
      ? { onLogin: () => { setAuthMode('login'); setScreen('login'); } }
      : authMode === 'student' || authMode === 'admin'
        ? { onSignOut: handleSignOut }
        : {};

  if (screen === 'grade-select') {
    return (
      <GradeSelect
        grades={GRADES}
        onSelectGrade={handleSelectGrade}
        onOpenCredits={handleOpenCredits}
        focusCreditsLink={focusCreditsLink}
        allowedGrades={authMode === 'student' ? (allowedGrades ?? []) : undefined}
        {...authChipProps}
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
      allowedGrades={authMode === 'student' ? (allowedGrades ?? []) : undefined}
      {...authChipProps}
    />
  );
}
