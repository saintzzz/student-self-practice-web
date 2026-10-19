import { useEffect, useRef, useState, type ReactNode } from 'react';
import GradeSelect from './components/GradeSelect';
import JoinClassCard from './components/JoinClassCard';
import ParentReportScreen from './components/ParentReportScreen';
import StartBatchScreen from './components/StartBatchScreen';
import ArenaLiveLobby from './components/ArenaLiveLobby';
import BatchScreen from './components/BatchScreen';
import CreditsScreen from './components/CreditsScreen';
import PlacementScreen from './components/PlacementScreen';
import AuthScreen from './components/AuthScreen';
import AdminScreen from './components/AdminScreen';
import ExamRouteBoundary from './components/exam/ExamRouteBoundary';
import LandShell from './components/LandShell';
import { LottieBudgetProvider, PRE_ROUND_SLOTS } from './components/fx/LottieBudget';
import { bandForGrade } from './lib/ui/theme';
import { isSupabaseConfigured } from './lib/supabase/client';
import {
  fetchMyAccount,
  fetchMyAllowedGrades,
  getSession,
  logout,
  onAuthChange,
  type PracticeAccount,
} from './lib/auth/practiceAuth';
import { reloadPage } from './lib/reload';
import { bindEngagement, flushEngagement, unbindEngagement } from './lib/engagement/sync';
import { clearEngagementLocal, getOwnerAccountId, parkOwnerBlob } from './lib/engagement/store';
import { confirmParentEmail } from './lib/parentContact';
import { bindActivityOwner } from './lib/practiceResults';
import { GRADES } from './data/vocabulary';
import { ViewerProvider } from './lib/viewer/ViewerContext';
import { clearParentVerification } from './components/ParentGate';
import { __resetInstructionAutoplay } from './components/InstructionSpeaker';
import type { ExamProgramId } from './types/exam';
import FlashcardErrorBoundary from './components/flashcards/FlashcardErrorBoundary';
import GameRouteBoundary from './games/GameRouteBoundary';
import {
  advanceRoundQuestion,
  completeGameRound,
  createBatch,
  endBatchEarly,
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
  submitTracingAnswer,
} from './lib/practiceSession';
import type { PronunciationScoringOptions } from './lib/rounds/pronunciationScoring';
import type { Grade, TracingMeta } from './types';
import type { GameEnd } from './games/types';

type Screen = 'login' | 'admin' | 'grade-select' | 'start-batch' | 'batch' | 'credits' | 'placement' | 'exam' | 'report' | 'flashcards' | 'game';

// r16: StrictMode replays the mount effect - the confirm RPC consumes
// the token on first success, so a naive second call would see
// "expired". Share the in-flight promise per token instead: one
// network call, and the surviving effect displays its result.
const emailVerifyCache = new Map<string, Promise<boolean>>();
/** 'off' = Supabase not configured (pre-CR-08 guest-only behavior). */
type AuthMode = 'off' | 'loading' | 'login' | 'guest' | 'student' | 'admin';

declare global {
  interface Window {
    /**
     * Dev-only test hook: pin the next batch's seed so E2E can
     * deterministically reach seed-dependent content (e.g. a G1-2 gap
     * bank item) instead of relying on random coverage. Read once per
     * "Chơi" press, dev builds only (r34-B6).
     */
    __batchSeedForTesting?: string;
  }
}

// CR-82 (R-v5-12): the flashcards screen mounts INSIDE a retryable
// lazy boundary so a flaky-chunk failure leaves an explicit retry /
// skip affordance instead of a blank route (same family pattern as
// TracingChunkBoundary). The boundary owns its lazy type + Suspense.
function RouteFlashcards({ grade, onExit }: { grade: Grade; onExit: () => void }) {
  return <FlashcardErrorBoundary grade={grade} onExit={onExit} />;
}

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
  /** CR-97: live-race lobby overlay over the hub screen. */
  const [liveLobbyOpen, setLiveLobbyOpen] = useState(false);
  /** CR-48 phase 5: pinned V6 assessment form for the current exam run. */
  const [examFormId, setExamFormId] = useState<string | null>(null);
  /** CR-58/59: drill focus for the current run - coach skill drill or
   *  advanced-tier difficulty floor. */
  const [examFocus, setExamFocus] = useState<{ skills?: string[]; minDifficulty?: number; label?: string } | null>(null);
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [focusCreditsLink, setFocusCreditsLink] = useState(false);
  /** CR-83: which Game Zone title the 'game' screen is playing. */
  const [activeGame, setActiveGame] = useState<import('./games/types').GameId | null>(null);
  /** Hub tile expanded on the next start-batch mount - set by whichever
   *  sub-screen the kid returns from (game exit -> 'games'), reset on
   *  every other hub entry so a stale tile can't reopen. */
  const [hubOpenTile, setHubOpenTile] = useState<string | null>(null);
  /** r6: parent-email confirm-link outcome, rendered as its own screen. */
  const [verifyNotice, setVerifyNotice] = useState<'ok' | 'fail' | null>(null);
  /** r17: the auth uid this tab has loaded state for. Compared against
   *  session-change events - a second tab switching accounts must not
   *  leave this tab acting under the old identity. */
  const boundUidRef = useRef<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('verify_email');
    if (!token) return;
    let p = emailVerifyCache.get(token);
    if (!p) {
      p = confirmParentEmail(token);
      emailVerifyCache.set(token, p);
      void p.finally(() => emailVerifyCache.delete(token));
    }
    let cancelled = false;
    void p.then((ok) => {
      window.history.replaceState(null, '', window.location.pathname);
      if (!cancelled) setVerifyNotice(ok ? 'ok' : 'fail');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void (async () => {
      const session = await getSession();
      boundUidRef.current = session?.user?.id ?? null;
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
      boundUidRef.current = account.id;
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

  // r17: the mount effect above loads auth ONCE - without this
  // subscription a second tab's sign-out or account switch leaves this
  // tab displaying the old student while new requests authenticate as
  // the new one (stale grades, activity owner, engagement binding).
  // Once a real uid is bound, any identity change reloads to a clean
  // slate; unbound states (login screen, guest) stay put.
  useEffect(() => {
    if (!configured) return;
    let sub: { unsubscribe: () => void } | null = null;
    void onAuthChange((session) => {
      const next = session?.user?.id ?? null;
      if (boundUidRef.current && next !== boundUidRef.current) reloadPage();
    }).then((s) => {
      sub = s;
    });
    return () => {
      sub?.unsubscribe();
    };
  }, [configured]);

  async function handleLoggedIn(): Promise<void> {
    const account = await fetchMyAccount();
    if (!account) return;
    setMyAccount(account);
    boundUidRef.current = account.id;
    /* External-review r1 #3: the instruction-autoplay ledger is per
       viewer session - a new account must hear the voice-first intro
       again. */
    __resetInstructionAutoplay();
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
      // r13: remote revocation failures are surfaced, not silently
      // dropped - local cleanup below still runs either way.
      await logout().catch((e) => console.warn('signOut failed:', e));
    } finally {
      // Identity is intentionally unbound here: the auth-change event
      // from our own sign-out must not trigger the r17 reload - this
      // tab is already navigating to the login screen.
      boundUidRef.current = null;
      setMyAccount(null);
      setAllowedGrades(null);
      setBatch(null);
      setSelectedGradeId(null);
      setAuthMode('login');
      setScreen('login');
      /* kids-UX dev-review #2: a parent-gate pass is an in-memory
         authorization - sign-out/account change must revoke it so the
         next user on the device never inherits it. */
      clearParentVerification();
      // External-review r1 #3: same for the autoplay ledger.
      __resetInstructionAutoplay();
    }
  }

  function handleGuest(): void {
    // r5: an account-owned blob (kept after a failed logout sync) must
    // not be what the guest sees. Park it under its owner id - the
    // owner's next login restores it via bindEngagement.
    parkOwnerBlob();
    // Dev-review #2: switching to guest = leaving the account context -
    // revoke the parent pass too.
    clearParentVerification();
    // External-review r1 #3: a guest session gets its own autoplay ledger.
    __resetInstructionAutoplay();
    setAuthMode('guest');
    setScreen('grade-select');
  }

  function handleSelectGrade(gradeId: string): void {
    // Dev-review #2: switching grade leaves the parent corner's context -
    // the gate token is revoked so reports/pricing re-gate.
    if (gradeId !== selectedGradeId) clearParentVerification();
    setSelectedGradeId(gradeId);
    setHubOpenTile(null);
    setScreen('start-batch');
  }

  function handleBackToGrades(): void {
    // Dev-review #2: the only exit from the report corner - revoke the
    // pass on the way back to kid surfaces (design s3.6: the token is a
    // UX control, not a persistent credential).
    clearParentVerification();
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
    // r16: the finished batch's result row belongs to whoever started it.
    void bindActivityOwner();
    const seedOverride = import.meta.env.DEV ? window.__batchSeedForTesting : undefined;
    setBatch(createBatch(seedOverride, selectedGradeId ?? 'grade-2'));
    setScreen('batch');
  }

  /** CR-24/25: 'practice' = 20-question drill; 'exam' = 200q/30min mock.
   *  CR-28: 'review' = spaced-repetition session over due wrong questions.
   *  CR-58/59: focus = skill drill or advanced-tier filter. */
  function handleStartExam(programId: ExamProgramId, mode: 'practice' | 'exam' | 'review', formId?: string, focus?: { skills?: string[]; minDifficulty?: number; label?: string }): void {
    setExamProgramId(programId);
    setExamMode(mode);
    setExamFormId(formId ?? null);
    setExamFocus(focus ?? null);
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
    setExamFocus(null);
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
    setExamFocus(null);
    setArenaRun({ kind: 'accept', seed: challenge.seed, challengeId: challenge.id });
    setScreen('exam');
  }

  function handleArenaBot(): void {
    setExamProgramId('english');
    setExamMode('arena');
    setExamFocus(null);
    setArenaRun({ kind: 'bot', seed: newSeed() });
    setScreen('exam');
  }

  /** CR-97: live race - the lobby opens as an overlay; when the host
   *  starts, every client launches the same seeded arena run and the
   *  room id rides along for the standings broadcast. */
  function handleLiveStart(ctx: { roomId: string; code: string; seed: string }): void {
    setLiveLobbyOpen(false);
    setExamProgramId('english');
    setExamMode('arena');
    setExamFocus(null);
    setArenaRun({ kind: 'live', seed: ctx.seed, liveRoomId: ctx.roomId });
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

  function handleSubmitPronunciation(transcript: string, options?: PronunciationScoringOptions): void {
    if (!batch) return;
    setBatch(updateRoundSession(batch, (session) => submitPronunciationAnswer(session, transcript, options)));
  }

  function handleSubmitPairMatching(isCorrect: boolean): void {
    if (!batch) return;
    setBatch(updateRoundSession(batch, (session) => submitPairMatchingAnswer(session, isCorrect)));
  }

  /** CR-82 (D-10): tracing submits carry assisted/attempts telemetry. */
  function handleSubmitTracing(isCorrect: boolean, meta: TracingMeta): void {
    if (!batch) return;
    setBatch(updateRoundSession(batch, (session) => submitTracingAnswer(session, isCorrect, meta)));
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

  function handleEndBatchEarly(): void {
    if (!batch) return;
    setBatch(endBatchEarly(batch));
  }

  /** CR-86: the bonus game Round's run ended - GameEnd becomes the RoundOutcome. */
  function handleCompleteGameRound(end: GameEnd): void {
    if (!batch) return;
    setBatch(completeGameRound(batch, end));
  }

  // CR-10 DS-T1 + CR-82 (M2, spec s6.6): every screen lives inside a
  // land shell. Kid play surfaces (start-batch, batch) get the v5 hero
  // scene in the band tone (G1-2 dusk / G3-5 night); the journey map
  // (GradeSelect) and AuthScreen ride the hero brand night; adult
  // surfaces keep the brand strip. Exam keeps its own desk register.
  const shell = (node: ReactNode, opts?: { gradeId?: string | null; hero?: boolean }) => {
    if (opts?.gradeId) {
      const tone = bandForGrade(opts.gradeId) === 'G12' ? 'dusk' : 'night';
      return <LandShell gradeId={opts.gradeId} tone={tone} variant="hero">{node}</LandShell>;
    }
    return <LandShell land="brand" tone="night" variant={opts?.hero ? 'hero' : 'strip'}>{node}</LandShell>;
  };

  // kids-UX (ADR KUX-5): every screen renders inside one ViewerProvider so
  // band-aware components (StartBatchScreen launchpad, Khám phá sheet,
  // speakers) read the real grade band + login state anywhere in the tree.
  // The early returns below become renderScreen() results - routing and
  // screen composition are unchanged.
  function renderScreen(): ReactNode {
  if (verifyNotice) {
    return shell(
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl bg-white/90 p-6 text-center ring-1 ring-sky-200">
          <p className="text-lg font-extrabold text-sky-900">
            {verifyNotice === 'ok'
              ? 'Đã xác nhận email! Ba mẹ sẽ nhận báo cáo hàng tuần.'
              : 'Link xác nhận đã hết hạn hoặc đã dùng - vào app gửi lại email xác nhận.'}
          </p>
          <button
            type="button"
            data-testid="verify-email-continue"
            onClick={() => setVerifyNotice(null)}
            className="mt-4 rounded-xl bg-sky-600 px-5 py-2 font-extrabold text-white transition hover:bg-sky-500"
          >
            Tiếp tục
          </button>
        </div>
      </div>,
    );
  }

  if (authMode === 'loading') {
    return shell(
      <div className="flex min-h-screen items-center justify-center text-lg font-bold text-sky-700">
        Đang tải...
      </div>,
    );
  }

  /* CR-82 (D-21 / AC-2.5): pre-round screens mount ZERO Lottie players -
     the greeting mascot renders its static pose so no player chunk, WASM
     or mascot/emoji JSON request fires before the first question. */
  if (configured && (authMode === 'login' || screen === 'login')) {
    return shell(
      <LottieBudgetProvider slots={PRE_ROUND_SLOTS}>
        <AuthScreen onLoggedIn={handleLoggedIn} onGuest={handleGuest} />
      </LottieBudgetProvider>,
      { hero: true },
    );
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
      <LottieBudgetProvider slots={PRE_ROUND_SLOTS}>
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
        />
      </LottieBudgetProvider>,
      { hero: true },
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
      <LottieBudgetProvider slots={PRE_ROUND_SLOTS}>
        <StartBatchScreen
        grade={selectedGrade}
        onStartBatch={handleStartBatch}
        onStartExam={handleStartExam}
        onArenaCreate={handleArenaCreate}
        onArenaAccept={handleArenaAccept}
        onArenaBot={handleArenaBot}
        onArenaLive={myAccount ? () => setLiveLobbyOpen(true) : undefined}
        onStartFlashcards={() => setScreen('flashcards')}
        onStartGame={(gameId) => {
          setActiveGame(gameId);
          setScreen('game');
        }}
        onBack={handleBackToGrades}
        initialHubTile={hubOpenTile}
        isGuest={authMode !== 'student'}
        isAdmin={authMode === 'admin'}
        onLogin={authMode === 'guest' ? () => { setAuthMode('login'); setScreen('login'); } : undefined}
        />
        {liveLobbyOpen && myAccount && (
          <ArenaLiveLobby
            gradeId={selectedGrade.id}
            me={{ id: myAccount.id, name: myAccount.display_name }}
            onStart={handleLiveStart}
            onClose={() => setLiveLobbyOpen(false)}
          />
        )}
      </LottieBudgetProvider>,
      { gradeId: selectedGradeId },
    );
  }

  // CR-82 (R-v5-12): flashcards is a top-level arena route - same
  // grade-scoped hero shell as the hub, and the PRE_ROUND_SLOTS budget
  // keeps the screen Lottie-free outside its own perch slot.
  if (screen === 'flashcards' && selectedGrade) {
    return shell(
      <LottieBudgetProvider slots={PRE_ROUND_SLOTS}>
        <RouteFlashcards
          grade={selectedGrade}
          onExit={() => {
            setHubOpenTile(null);
            setScreen('start-batch');
          }}
        />
      </LottieBudgetProvider>,
      { gradeId: selectedGradeId },
    );
  }

  // CR-83: Game Zone - arcade run inside the grade's land vignette; the
  // whole game subtree loads as one lazy chunk behind a retry boundary.
  if (screen === 'game' && selectedGrade && activeGame) {
    return shell(
      <LottieBudgetProvider slots={PRE_ROUND_SLOTS}>
        <GameRouteBoundary
          grade={selectedGrade}
          gameId={activeGame}
          onExit={() => {
            setActiveGame(null);
            /* "Quay lai khu tro choi" must reopen the games tile - the
               hub remounts collapsed without it (bug: exit landed on the
               bare launchpad instead of the shelf). */
            setHubOpenTile('games');
            setScreen('start-batch');
          }}
        />
      </LottieBudgetProvider>,
      { gradeId: selectedGradeId },
    );
  }

  // CR-24: exam runs full-screen on its own dark chrome (IOE-style) - not
  // inside the brand LandShell, matching the real exam's "leave the app,
  // enter the exam hall" feel.
  if (screen === 'exam' && selectedGrade) {
    return (
      /* CR-82 M9: the exam subtree loads as a lazy chunk behind a
         retryable boundary (entry-bundle D-03 cap). */
      <ExamRouteBoundary
        programId={examProgramId}
        gradeId={selectedGrade.id}
        gradeLabel={selectedGrade.name}
        studentName={myAccount?.display_name}
        mode={examMode}
        arena={arenaRun ?? undefined}
        formId={examFormId ?? undefined}
        focus={examFocus ?? undefined}
        onExit={() => {
          setHubOpenTile(null);
          setScreen('start-batch');
        }}
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
        onSubmitTracing={handleSubmitTracing}
        onNextQuestion={handleNextQuestion}
        onNextRound={handleNextRound}
        onStartNewBatch={handleStartBatch}
        onChooseGrade={handleBackToGrades}
        onEndBatch={handleEndBatchEarly}
        onRoundTimeExpired={handleRoundTimeExpired}
        onCompleteGameRound={handleCompleteGameRound}
        guestLocked={authMode === 'guest'}
        onRequestLogin={() => {
          setAuthMode('login');
          setScreen('login');
        }}
      />,
      { gradeId: batch.gradeId },
    );
  }

  return shell(
    <LottieBudgetProvider slots={PRE_ROUND_SLOTS}>
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
      />
    </LottieBudgetProvider>,
    { hero: true },
  );
  }

  return (
    <ViewerProvider
      gradeId={selectedGradeId}
      loggedIn={authMode === 'student' || authMode === 'admin'}
    >
      {renderScreen()}
    </ViewerProvider>
  );
}
