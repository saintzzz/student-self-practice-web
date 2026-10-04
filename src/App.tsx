import { useEffect, useState, type ReactNode } from 'react';
import GradeSelect from './components/GradeSelect';
import JoinClassCard from './components/JoinClassCard';
import ParentReportScreen from './components/ParentReportScreen';
import StartBatchScreen from './components/StartBatchScreen';
import BatchScreen from './components/BatchScreen';
import CreditsScreen from './components/CreditsScreen';
import PlacementScreen from './components/PlacementScreen';
import AuthScreen from './components/AuthScreen';
import AdminScreen from './components/AdminScreen';
import ExamScreen from './components/ExamScreen';
import LandShell from './components/LandShell';
import { isSupabaseConfigured } from './lib/supabase/client';
import {
  fetchMyAccount,
  fetchMyAllowedGrades,
  getSession,
  logout,
  type PracticeAccount,
} from './lib/auth/practiceAuth';
import { bindEngagement, flushEngagement, unbindEngagement } from './lib/engagement/sync';
import { clearEngagementLocal, getOwnerAccountId } from './lib/engagement/store';
import { GRADES } from './data/vocabulary';
import type { ExamProgramId } from './types/exam';
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

type Screen = 'login' | 'admin' | 'grade-select' | 'start-batch' | 'batch' | 'credits' | 'placement' | 'exam' | 'report';
/** 'off' = Supabase not configured (pre-CR-08 guest-only behavior). */
type AuthMode = 'off' | 'loading' | 'login' | 'guest' | 'student' | 'admin';

export default function App() {
  const configured = isSupabaseConfigured();
  const [authMode, setAuthMode] = useState<AuthMode>(configured ? 'loading' : 'off');
  const [myAccount, setMyAccount] = useState<PracticeAccount | null>(null);
  const [allowedGrades, setAllowedGrades] = useState<string[] | null>(null);
  const [screen, setScreen] = useState<Screen>('grade-select');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [examProgramId, setExamProgramId] = useState<ExamProgramId>('english');
  const [examMode, setExamMode] = useState<'practice' | 'exam' | 'review' | 'arena'>('exam');
  /** CR-34: pending arena duel context for the exam screen. */
  const [arenaRun, setArenaRun] = useState<import('./components/ExamScreen').ArenaRun | null>(null);
  /** CR-48 phase 5: pinned V6 assessment form for the current exam run. */
  const [examFormId, setExamFormId] = useState<string | null>(null);
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
        void bindEngagement(account.id);
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
      void bindEngagement(account.id);
      setAllowedGrades(await fetchMyAllowedGrades());
      setAuthMode('student');
      setScreen('grade-select');
    }
  }

  async function handleSignOut(): Promise<void> {
    /* CR-45 (M4): flush while the session is still valid, then unbind,
       then clear the blob - but only when the flush actually reached
       the server. Clearing after a failed/offline flush would destroy
       progress that exists nowhere else; the owner marker keeps the
       blob safe until the same account resumes (and B1's pre-pull
       discard still protects any different account that logs in).
       logout runs last inside try/finally so local cleanup always
       happens even if sign-out throws. */
    const synced = await flushEngagement().catch(() => false);
    unbindEngagement();
    if (synced && getOwnerAccountId()) clearEngagementLocal();
    try {
      await logout();
    } finally {
      setMyAccount(null);
      setAllowedGrades(null);
      setBatch(null);
      setSelectedGradeId(null);
      setAuthMode('login');
      setScreen('login');
    }
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

  /** CR-24/25: 'practice' = 20-question drill; 'exam' = 200q/30min mock.
   *  CR-28: 'review' = spaced-repetition session over due wrong questions. */
  function handleStartExam(programId: ExamProgramId, mode: 'practice' | 'exam' | 'review', formId?: string): void {
    setExamProgramId(programId);
    setExamMode(mode);
    setExamFormId(formId ?? null);
    setArenaRun(null);
    setScreen('exam');
  }

  /** CR-34: arena duels always run the English program - the app is
   *  "English Arena" and the bank is deepest there. */
  function newSeed(): string {
    return `arena-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function handleArenaCreate(): void {
    setExamProgramId('english');
    setExamMode('arena');
    setArenaRun({ kind: 'create', seed: newSeed() });
    setScreen('exam');
  }

  function handleArenaAccept(challenge: { id: string; seed: string; program_id?: string }): void {
    // The accepted duel must replay the challenge's OWN program with its
    // seed - otherwise an identical seed would render a different set.
    const pid: ExamProgramId =
      challenge.program_id === 'math' || challenge.program_id === 'science' ? challenge.program_id : 'english';
    setExamProgramId(pid);
    setExamMode('arena');
    setArenaRun({ kind: 'accept', seed: challenge.seed, challengeId: challenge.id });
    setScreen('exam');
  }

  function handleArenaBot(): void {
    setExamProgramId('english');
    setExamMode('arena');
    setArenaRun({ kind: 'bot', seed: newSeed() });
    setScreen('exam');
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

  // CR-10 DS-T1: every screen lives inside a land shell. CR-16: the whole
  // app rides the VieSchool navy/gold 'brand' surface so play screens match
  // login/landing/admin - per-grade land identity stays inside the map's
  // grade cards (kid-friendly accents on a branded backdrop).
  const shell = (node: ReactNode, _gradeId?: string | null) => (
    <LandShell land="brand">{node}</LandShell>
  );

  if (authMode === 'loading') {
    return shell(
      <div className="flex min-h-screen items-center justify-center text-lg font-bold text-sky-700">
        Đang tải...
      </div>,
    );
  }

  if (configured && (authMode === 'login' || screen === 'login')) {
    return shell(<AuthScreen onLoggedIn={handleLoggedIn} onGuest={handleGuest} />);
  }

  if (screen === 'admin' && myAccount) {
    return shell(
      <AdminScreen
        account={myAccount}
        onSignOut={handleSignOut}
        onPractice={() => setScreen('grade-select')}
      />,
    );
  }

  if (screen === 'credits') {
    return shell(<CreditsScreen onBack={handleCreditsBack} />);
  }

  const authChipProps =
    authMode === 'guest'
      ? { onLogin: () => { setAuthMode('login'); setScreen('login'); } }
      : authMode === 'student' || authMode === 'admin'
        ? { onSignOut: handleSignOut }
        : {};

  // CR-47: joining a class can open new grade scopes - refetch them so
  // the newly unlocked lands show without a reload.
  const joinClassSlot = (
    <JoinClassCard
      isGuest={authMode !== 'student'}
      onJoined={() => void fetchMyAllowedGrades().then(setAllowedGrades).catch(() => {})}
    />
  );

  if (screen === 'grade-select') {
    return shell(
      <GradeSelect
        grades={GRADES}
        onSelectGrade={handleSelectGrade}
        onOpenCredits={handleOpenCredits}
        onPlacement={() => setScreen('placement')}
        onReport={() => setScreen('report')}
        focusCreditsLink={focusCreditsLink}
        allowedGrades={authMode === 'student' ? (allowedGrades ?? []) : undefined}
        guestTrial={authMode === 'guest'}
        studentName={myAccount?.display_name}
        joinClassSlot={joinClassSlot}
        {...authChipProps}
      />,
    );
  }

  if (screen === 'report') {
    return shell(
      <ParentReportScreen
        grades={GRADES}
        onBack={handleBackToGrades}
        isLoggedIn={authMode === 'student'}
      />,
    );
  }

  if (screen === 'placement') {
    return shell(
      <PlacementScreen
        isLoggedIn={authMode === 'student'}
        onStartGrade={(gradeId) => handleSelectGrade(gradeId)}
        onBack={handleBackToGrades}
      />,
    );
  }

  const selectedGrade = GRADES.find((grade) => grade.id === selectedGradeId);

  if (screen === 'start-batch' && selectedGrade) {
    return shell(
      <StartBatchScreen
        grade={selectedGrade}
        onStartBatch={handleStartBatch}
        onStartExam={handleStartExam}
        onArenaCreate={handleArenaCreate}
        onArenaAccept={handleArenaAccept}
        onArenaBot={handleArenaBot}
        onBack={handleBackToGrades}
        isGuest={authMode !== 'student'}
        isAdmin={authMode === 'admin'}
        onLogin={authMode === 'guest' ? () => { setAuthMode('login'); setScreen('login'); } : undefined}
      />,
      selectedGradeId,
    );
  }

  // CR-24: exam runs full-screen on its own dark chrome (IOE-style) - not
  // inside the brand LandShell, matching the real exam's "leave the app,
  // enter the exam hall" feel.
  if (screen === 'exam' && selectedGrade) {
    return (
      <ExamScreen
        programId={examProgramId}
        gradeId={selectedGrade.id}
        gradeLabel={selectedGrade.name}
        studentName={myAccount?.display_name}
        mode={examMode}
        arena={arenaRun ?? undefined}
        formId={examFormId ?? undefined}
        onExit={() => setScreen('start-batch')}
      />
    );
  }

  if (screen === 'batch' && batch) {
    return shell(
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
        guestLocked={authMode === 'guest'}
        onRequestLogin={() => {
          setAuthMode('login');
          setScreen('login');
        }}
      />,
      batch.gradeId,
    );
  }

  return shell(
    <GradeSelect
      grades={GRADES}
      onSelectGrade={handleSelectGrade}
      onOpenCredits={handleOpenCredits}
      focusCreditsLink={focusCreditsLink}
      allowedGrades={authMode === 'student' ? (allowedGrades ?? []) : undefined}
      guestTrial={authMode === 'guest'}
      studentName={myAccount?.display_name}
      joinClassSlot={joinClassSlot}
      {...authChipProps}
    />,
  );
}
