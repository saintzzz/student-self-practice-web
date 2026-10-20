import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExamProgramId, ExamQuestion } from '../types/exam';
import {
  answerCurrent,
  computeExamResult,
  createExam,
  examCorrectAnswerText,
  isExamAnswerCorrect,
  jumpTo,
  remainingSeconds,
  submitExam,
  examConfigForGrade,
  EXAM_POINTS_PER_QUESTION,
  type ExamAnswer,
  type ExamState,
} from '../lib/exam/examSession';
import { speakSentence } from '../lib/speech';
import { playSfx } from '../lib/sfx';
import {
  recordBigModeComplete,
  recordCorrectAnswers,
  recordDrillComplete,
  recordReviewOutcome,
  recordWrongExamQuestion,
  recordSkillAnswer,
  getDueReviewItems,
} from '../lib/engagement/store';
import { bankSkillOf, skillKeyFor } from '../lib/engagement/skills';
import { saveExamResult, bindActivityOwner, activityOwnerMatches } from '../lib/practiceResults';
import { getSession } from '../lib/auth/practiceAuth';
import { arenaAccept, arenaCreate, botGhost, type ArenaDuelResult } from '../lib/arena';
import { liveRoomFinish, liveRoomLeave, liveRoomState, subscribeLiveRoom, type LiveChannel, type LivePlayer } from '../lib/arenaLive';
import { recordArenaDuel, type Sticker } from '../lib/engagement/store';
import { captureExamWrongAnswers } from '../lib/exam/examSession';
import { createExamFromAssignment, createExamFromBank, gradeNumber } from '../lib/qb/bank';
import { assignmentSubmit } from '../lib/assignments';
import { createExamTelemetry, type ExamTelemetry } from '../lib/qb/telemetry';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { EmojiVisual } from './EmojiVisual';
import { ArtImg } from './ArtImg';
import ConfirmEndDialog from './ConfirmEndDialog';
import { WORD_IPA } from '../data/ipaMap';
import { ExamResult, MarkupText, PROGRAM_LABEL } from './ExamResult';
import { MascotAvatar } from './mascot/MascotAvatar';
import { ExamProgressRing } from './exam/ExamProgressRing';
import { ExamNavigatorDialog } from './exam/ExamNavigatorDialog';
import { ExamReviewSheet } from './exam/ExamReviewSheet';
import { useExamShortcuts } from './exam/useExamShortcuts';
import {
  EXAM_DESK,
  EXAM_HEADER_BRAND,
  EXAM_NAV_ANSWERED,
  EXAM_NAV_CELL,
  EXAM_NAV_FLAGGED,
  EXAM_OPTION_PAPER,
  EXAM_OPTION_KEY,
  EXAM_PRACTICE_NEXT,
  EXAM_QNUM,
  EXAM_SELECTED,
  EXAM_SELECTED_KEY_PAPER,
  EXAM_SELECTED_PAPER,
  EXAM_SHEET,
  EXAM_SHEET_BTN,
  EXAM_SHEET_HEADER,
  EXAM_TIMER,
  EXAM_TIMER_URGENT,
  EXAM_VERDICT_CORRECT,
  EXAM_VERDICT_WRONG,
  BTN_SECONDARY_NAVY,
  BTN_SECONDARY_PAPER,
  CTA_GOLD_XL,
  TYPE_BODY_PAPER,
  TYPE_PROMPT_PAPER_G12,
  TYPE_PROMPT_PAPER_G345,
} from '../lib/ui/tokens';
import { IconArrowRight, IconCheck, IconCheckCircle, IconChevronLeft, IconChevronRight, IconClock, IconFlag, IconHandshake, IconMail, IconMedal, IconMuscle, IconParty, IconSpeaker, IconSwords, IconTrophy } from './icons';

/**
 * CR-24 - IOE-style Thi thử player. Visual language follows the real
 * ioe.vn exam: numbered question strip (10/page), top countdown, SUBMIT
 * button, no per-question verdict (exam conditions).
 *
 * CR-82 M5 (spec s10, R-v5-03): the hall is now a dark quiet DESK with a
 * single paper sheet - slate-50 paper, ruled header, lettered options
 * like a printed IOE sheet. No mascot during the sitting (R-v5-06; the
 * badge keeps the wordmark only), no gold fills in the timed sitting
 * (N1), flags + navigator + review-before-submit (D-13/D-18).
 */

export { PROGRAM_LABEL };

const STRIP_PAGE = 10;
/** CR-34: arena duels are 10 questions - long enough to matter, short
 *  enough for a quick challenge. */
const ARENA_QUESTION_COUNT = 10;

/** CR-34: arena duel context. 'create' opens a challenge after the run;
 *  'accept' plays the challenge's seed and submits to arena_accept;
 *  'bot' races a deterministic local ghost (guest mode, no RPC). */
export interface ArenaRun {
  /** 'live' = CR-97 real-time N-player race: same seed, broadcast
   *  progress; result renders a podium once the room settles. */
  kind: 'create' | 'accept' | 'bot' | 'live';
  seed: string;
  challengeId?: string;
  liveRoomId?: string;
}

interface ExamScreenProps {
  programId: ExamProgramId;
  gradeId: string;
  gradeLabel: string;
  studentName?: string;
  /** CR-25: 'exam' = IOE mock (200q/30min); 'practice' = drill (20q, instant
   *  verdicts). CR-28: 'review' = practice-style session over the due
   *  spaced-repetition queue (pulled fresh at begin()). CR-34: 'arena' =
   *  10-question duel run on a shared seed (practice pacing). */
  mode: 'exam' | 'practice' | 'review' | 'arena' | 'assignment';
  arena?: ArenaRun;
  /** CR-98: assignment run - fixed form, results land via assignment_submit
   *  (not saveExamResult). id/title come from assignment_take. */
  assignment?: { id: string; title: string };
  /** CR-48 phase 5: pinned V6 assessment form (unit test/diagnostic/
   *  midterm/final). When set, questions come from fetch_form in form
   *  order instead of a random mock sample. */
  formId?: string;
  /** CR-58/59: drill focus - qb skill filter (coach) or difficulty floor
   *  (advanced tier). label shows on the intro screen. */
  focus?: { skills?: string[]; minDifficulty?: number; label?: string };
  onExit: () => void;
}

export default function ExamScreen({ programId, gradeId, gradeLabel, studentName, mode, arena, assignment, formId, focus, onExit }: ExamScreenProps) {
  const isArena = mode === 'arena';
  const isAssignment = mode === 'assignment';
  // CR-98: assignments run exam-style - countdown, no instant verdicts.
  const isPractice = mode !== 'exam' && mode !== 'assignment';
  const isReview = mode === 'review';
  const [exam, setExam] = useState<ExamState | null>(null);
  const [stripOffset, setStripOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  /** practice-mode verdict shown after each answer (null = awaiting answer). */
  const [verdict, setVerdict] = useState<{ isCorrect: boolean } | null>(null);
  /** CR-27/29: question indexes already credited toward the daily quest
   *  (number keys) and the skill stats (`s${index}` keys) - a re-answer
   *  during exam review must not count twice. */
  const creditedRef = useRef<Set<string | number>>(new Set());
  /** CR-48: fetching the V6 canonical bank over RPC before a session starts. */
  const [loadingBank, setLoadingBank] = useState(false);
  /** CR-48 phase 4: bank fetch failed - bundled bank is retired for exam/drill. */
  const [loadError, setLoadError] = useState(false);
  /** CR-49: per-answer telemetry + adaptive shadow log (V7 slice 1). */
  const telemetryRef = useRef<ExamTelemetry | null>(null);
  /** When the current question first rendered - latency basis. */
  const questionShownAtRef = useRef<number>(0);
  /** CR-69: confirm before the manual NỘP BÀI / KẾT THÚC ends the session.
   *  CR-82 M5: exam mode opens ExamReviewSheet instead (D-13); this flag
   *  now only drives the PRACTICE-mode ConfirmEndDialog. */
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  /** CR-82 M5 (D-18): per-question flags + navigator - pure UI state,
   *  never written to ExamState/telemetry/results. Cleared in begin()
   *  and on finish (MEMORY: stale confirm state lesson). */
  const [flags, setFlags] = useState<ReadonlySet<number>>(new Set());
  const [navOpen, setNavOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  /** sr-only timer announcements - each fires once per run. */
  const announced5Ref = useRef(false);
  const announced1Ref = useRef(false);

  // CR-97: live arena race - broadcast progress per answer, render the
  // standings strip from broadcast events, settle via RPC at the end.
  const isLiveArena = isArena && arena?.kind === 'live' && !!arena.liveRoomId;
  const liveChannelRef = useRef<LiveChannel | null>(null);
  const livePointsRef = useRef(0);
  /** True once the exam is over or the player abandoned - a later exit
   *  must NOT mark them "left" again (a finisher already has a row with
   *  a score; leave's finished_at update is also idempotent-guarded).
   *  Sticky: once set it stays set - the live-room contract, not just
   *  the exam clock. */
  const liveFinishedRef = useRef(false);
  liveFinishedRef.current = liveFinishedRef.current || exam?.finishedAtMs != null;
  const liveMeIdRef = useRef('me');
  /** Idempotent abandonment: tell the room we left so it can settle
   *  without waiting on the 30-minute stale cleanup. Covers BOTH exit
   *  kinds - the in-app "Quay lại" (no pagehide fires) and tab close. */
  const liveAbandon = useCallback(() => {
    if (!isLiveArena || liveFinishedRef.current || !arena?.liveRoomId) return;
    liveFinishedRef.current = true;
    liveChannelRef.current?.send({ type: 'leave', id: liveMeIdRef.current });
    void liveRoomLeave(arena.liveRoomId);
  }, [isLiveArena, arena?.liveRoomId]);
  const [liveOpponents, setLiveOpponents] = useState<Map<string, LivePlayer & { q?: number }>>(new Map());
  useEffect(() => {
    if (!isLiveArena || !arena?.liveRoomId) return;
    let cancelled = false;
    const onHide = () => liveAbandon();
    window.addEventListener('pagehide', onHide);
    void (async () => {
      const session = await getSession();
      const meId = session?.user?.id ?? 'me';
      liveMeIdRef.current = meId;
      const meName = studentName ?? 'Bạn';
      const ch = await subscribeLiveRoom(arena.liveRoomId!, { id: meId, name: meName }, {
        onRoster: (players) =>
          setLiveOpponents((cur) => {
            const next = new Map(cur);
            for (const p of players) if (p.id !== meId && !next.has(p.id)) next.set(p.id, { ...p, q: 0 });
            return next;
          }),
        onProgress: (p) =>
          setLiveOpponents((cur) => {
            const next = new Map(cur);
            next.set(p.id, { id: p.id, name: p.name, q: p.q, score: p.score, timeMs: null, finished: false });
            return next;
          }),
        onFinish: (p) =>
          setLiveOpponents((cur) => {
            const next = new Map(cur);
            next.set(p.id, { id: p.id, name: p.name, q: 999, score: p.score, timeMs: p.timeMs, finished: true });
            return next;
          }),
        onLeave: (id) =>
          setLiveOpponents((cur) => {
            const next = new Map(cur);
            next.delete(id);
            return next;
          }),
      });
      if (cancelled) {
        ch?.unsubscribe();
        return;
      }
      liveChannelRef.current = ch;
    })();
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', onHide);
      liveChannelRef.current?.unsubscribe();
      liveChannelRef.current = null;
    };
  }, [isLiveArena, arena?.liveRoomId, studentName, liveAbandon]);

  // r16: bind the result owner to the identity at activity start - a
  // mid-exam account switch must not attribute the run to the new user.
  useEffect(() => { void bindActivityOwner(); }, []);

  // 1s heartbeat - countdown + auto-submit in exam mode; the elapsed
  // stopwatch display in practice/review/arena (CR-52).
  useEffect(() => {
    if (!exam || exam.finishedAtMs !== null) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [exam]);

  useEffect(() => {
    if (!isPractice && exam && exam.finishedAtMs === null && remainingSeconds(exam, now) <= 0) {
      setExam((current) => (current ? submitExam(current, Date.now()) : current));
    }
  }, [exam, now, isPractice]);

  const result = useMemo(
    () => (exam && exam.finishedAtMs !== null ? computeExamResult(exam) : null),
    [exam],
  );

  // CR-49: latency basis per question + flush telemetry on finish/unmount.
  useEffect(() => {
    questionShownAtRef.current = Date.now();
  }, [exam?.currentIndex, exam?.questions]);
  useEffect(() => {
    if (exam?.finishedAtMs !== null && exam) void telemetryRef.current?.flush();
  }, [exam]);
  useEffect(() => () => { void telemetryRef.current?.flush(); }, []);

  // CR-27: record the mode-complete quest once per finished exam instance
  // (ref guard keeps StrictMode double-effects from double-marking).
  const questRecordedFor = useRef<ExamState | null>(null);
  useEffect(() => {
    if (!exam || !result || questRecordedFor.current === exam) return;
    questRecordedFor.current = exam;
    // CR-34: arena runs are a duel, not practice - they must not feed
    // quests, stats, the review queue, or the weekly leaderboard.
    if (!isArena) {
      if (isPractice) recordDrillComplete();
      else recordBigModeComplete();
      // CR-28: exam-mode wrongs are only known after submit - capture
      // every answered-and-wrong question into the review queue.
      if (!isPractice) captureExamWrongAnswers(gradeId, result.review);
      // CR-30: persist drill/exam completions - the weekly leaderboard
      // counts all results rows, not only 4-round batches. Review sessions
      // replay already-earned points, so they don't insert again.
      // CR-98: assignments persist via assignment_submit (server validates
      // the answer set and writes the results row itself).
      if (isAssignment && assignment) {
        const payload = {
          score: result.points,
          total: result.totalCount * EXAM_POINTS_PER_QUESTION,
          timeSec: result.timeUsedSec,
          answers: result.review.map((r) => ({ q_id: String(r.question.id), correct: r.isCorrect })),
          snapshot: { questionIds: exam.questions.map((q) => String(q.id)) },
        };
        // A lost submit means the teacher never sees the score - one retry
        // after a short delay; 'already-submitted' is success-by-absence.
        const submit = () => assignmentSubmit(assignment.id, payload).then((res) => {
          if ('error' in res && res.error !== 'already-submitted') {
            setTimeout(() => void assignmentSubmit(assignment.id, payload).then((r2) => {
              if ('error' in r2) console.warn('[assignment] submit retry:', r2.error);
            }), 3000);
          }
        });
        void submit();
      } else if (!isReview) {
        void saveExamResult(gradeId, programId, {
          points: result.points,
          totalCount: result.totalCount,
          correctCount: result.correctCount,
          timeUsedSec: result.timeUsedSec,
        }, {
          formId,
          questionIds: exam.questions.map((q) => String(q.id)),
        });
      }
    }
  }, [exam, result, isPractice, isReview, isArena, isAssignment, assignment, gradeId, programId]);

  /* CR-69 + CR-82 M5: if the timer expired while the submit confirmation
     or the review sheet was open, the flags survive into the next exam's
     retry - reset them wherever a run finishes or a fresh run begins. */
  useEffect(() => {
    if (exam?.finishedAtMs !== null && exam?.finishedAtMs !== undefined) {
      setSubmitConfirmOpen(false);
      setReviewOpen(false);
      setNavOpen(false);
      setFlags(new Set());
    }
  }, [exam]);

  async function begin(): Promise<void> {
    setSubmitConfirmOpen(false);
    setReviewOpen(false);
    setNavOpen(false);
    setFlags(new Set());
    announced5Ref.current = false;
    announced1Ref.current = false;
    // CR-34: arena duels run on the challenge seed so both players get
    // the identical question set - the only fair basis for a comparison.
    const seed = isArena && arena ? arena.seed : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (isReview) {
      // CR-28: the session is the due review queue itself - same
      // ExamState shape, no countdown (practice-style pacing). Re-fetch
      // on every begin so "Luyen lai" drops items just mastered; an
      // empty queue means nothing left to review - stay on the intro.
      const questions = getDueReviewItems(gradeId).map((item) => item.question);
      if (questions.length === 0) return;
      setExam({
        programId,
        gradeId,
        questions,
        answers: questions.map(() => null),
        currentIndex: 0,
        startedAtMs: Date.now(),
        timeLimitSec: 0,
        untimed: true,
        finishedAtMs: null,
      });
    } else {
      // CR-46: counts come from the grade config - every grade gets the
      // same features, only the sitting length scales.
      const gradeConfig = examConfigForGrade(gradeId);
      const count = isArena ? ARENA_QUESTION_COUNT : isPractice ? gradeConfig.drillCount : undefined;
      // CR-48 phase 4: practice/exam ONLY draw from the canonical V6
      // bank (publicationPolicy + variant-group enforced server-side);
      // the bundled bank is retired for these modes. Guests reach the
      // practice pool via the public RPC inside createExamFromBank.
      if (!isArena && isSupabaseConfigured()) {
        setLoadingBank(true);
        setLoadError(false);
        telemetryRef.current = createExamTelemetry({
          programId,
          grade: gradeNumber(gradeId),
          mode: isAssignment ? 'form' : formId ? 'form' : isPractice ? (isReview ? 'review' : 'practice') : 'mock',
          formId,
        });
        try {
          const bankExam = isAssignment && assignment
            // CR-98: the class đề is a fixed form - full load, no sampling.
            ? await createExamFromAssignment(assignment.id, programId, gradeId)
            : await createExamFromBank(programId, gradeId, {
              count,
              mode: isPractice ? 'practice' : 'mock',
              formId,
              focus,
            });
          if (bankExam) {
            setExam(bankExam);
            setNow(Date.now());
            setStripOffset(0);
            setVerdict(null);
            creditedRef.current = new Set<string | number>();
            return;
          }
          setLoadError(true);
        } catch {
          setLoadError(true);
        } finally {
          setLoadingBank(false);
        }
        return;
      }
      // Arena duels keep the seeded bundled bank: both players must see
      // the identical question set, which requires deterministic local
      // generation - documented CR-48 ruling.
      setExam({ ...createExam(programId, gradeId, seed, Date.now(), count), untimed: isPractice });
    }
    setNow(Date.now());
    setStripOffset(0);
    setVerdict(null);
    creditedRef.current = new Set<string | number>();
  }

  function answer(answer: ExamAnswer): void {
    if (isPractice) {
      if (verdict) return; // already answered - wait for "Câu tiếp".
      if (!exam) return;
      const question = exam.questions[exam.currentIndex];
      if (!question) return;
      const isCorrect = isExamAnswerCorrect(question, answer);
      telemetryRef.current?.record(question, answer, Date.now() - questionShownAtRef.current);
      telemetryRef.current?.logAdaptive(question, isCorrect);
      setExam(answerCurrent(exam, answer));
      setVerdict({ isCorrect });
      playSfx(isCorrect ? 'correct' : 'wrong');
      // CR-97: live race - broadcast this answer's progress so the
      // standings strip on every player's screen updates immediately.
      // The score ref tracks even before the channel is ready, so the
      // strip and the finish RPC always see the real tally.
      if (isLiveArena) {
        if (isCorrect) livePointsRef.current += EXAM_POINTS_PER_QUESTION;
        liveChannelRef.current?.sendProgress(exam.currentIndex + 1, livePointsRef.current);
      }
      // CR-34: arena answers never feed engagement - a duel is not
      // practice progress.
      if (!isArena) {
        // CR-27: count at answer time - correct answers land on the day
        // they were earned even if the session crosses midnight.
        if (isCorrect && !creditedRef.current.has(exam.currentIndex)) {
          creditedRef.current.add(exam.currentIndex);
          recordCorrectAnswers(1);
        }
        // CR-29: parent-report stats - one entry per answered question.
        if (!creditedRef.current.has(`s${exam.currentIndex}`)) {
          creditedRef.current.add(`s${exam.currentIndex}`);
          recordSkillAnswer(gradeId, bankSkillOf(question) ?? skillKeyFor(question), isCorrect);
        }
        // CR-28: review mode advances/resets the item's stage; a normal
        // drill instead captures the wrong question for future review.
        if (isReview) recordReviewOutcome(gradeId, question.id, isCorrect);
        else if (!isCorrect) recordWrongExamQuestion(gradeId, question);
      }
      return;
    }
    if (!exam) return;
    const currentQuestion = exam.questions[exam.currentIndex];
    if (!currentQuestion) return;
    // CR-27: same at-answer counting in exam mode (no verdict shown,
    // but the quest still credits the correct answer immediately).
    const examCorrect = isExamAnswerCorrect(currentQuestion, answer);
    telemetryRef.current?.record(currentQuestion, answer, Date.now() - questionShownAtRef.current);
    if (examCorrect && !creditedRef.current.has(exam.currentIndex)) {
      creditedRef.current.add(exam.currentIndex);
      recordCorrectAnswers(1);
    }
    // CR-29: skill stats per answer; a re-answer during review does not
    // double-count - the stats reflect the FIRST answer, matching what
    // a real exam score sheet records.
    if (!creditedRef.current.has(`s${exam.currentIndex}`)) {
      creditedRef.current.add(`s${exam.currentIndex}`);
      recordSkillAnswer(gradeId, bankSkillOf(currentQuestion) ?? skillKeyFor(currentQuestion), examCorrect);
    }
    setExam((current) => {
      if (!current) return current;
      const next = answerCurrent(current, answer);
      // Auto-advance to the next unanswered question - essential at 200q.
      const advanceTo =
        next.answers.findIndex((a, i) => a === null && i > next.currentIndex) !== -1
          ? next.answers.findIndex((a, i) => a === null && i > next.currentIndex)
          : next.answers.findIndex((a) => a === null);
      return jumpTo(next, advanceTo === -1 ? next.currentIndex : advanceTo);
    });
  }

  /** Practice-mode "Câu tiếp theo" - sequential, ends on the last question. */
  function practiceNext(): void {
    setVerdict(null);
    setExam((current) => {
      if (!current) return current;
      const nextIndex = current.currentIndex + 1;
      if (nextIndex >= current.questions.length) {
        return submitExam(current, Date.now());
      }
      return jumpTo(current, nextIndex);
    });
  }

  function jump(index: number): void {
    setExam((current) => (current ? jumpTo(current, index) : current));
    setStripOffset(Math.floor(index / STRIP_PAGE) * STRIP_PAGE);
  }

  /** CR-82 M5 (D-18): toggle the flag on the current question - pure UI
   *  state, cleared on begin()/finish. */
  function toggleFlag(): void {
    setFlags((prev) => {
      const next = new Set(prev);
      if (exam) {
        if (next.has(exam.currentIndex)) next.delete(exam.currentIndex);
        else next.add(exam.currentIndex);
      }
      return next;
    });
  }

  function openSubmit(): void {
    // CR-82 D-13: exam mode reviews before submitting; practice keeps
    // the generic confirm dialog.
    if (isPractice) setSubmitConfirmOpen(true);
    else setReviewOpen(true);
  }

  /* CR-82 M5 (D-18): keyboard shortcuts for the timed sitting - bound
     only while an exam-mode sitting is live and no dialog is open.
     Hook is unconditional (early returns below); `enabled` gates it. */
  const liveQuestion = exam && !result ? exam.questions[exam.currentIndex] : undefined;
  const liveOptionCount = liveQuestion && 'options' in liveQuestion ? liveQuestion.options.length : 0;
  useExamShortcuts(!isPractice && !!exam && !result, navOpen || reviewOpen || submitConfirmOpen, liveOptionCount, {
    onPickOption: (index) => answer({ type: 'option', index }),
    onPrev: () => jump(exam ? exam.currentIndex - 1 : 0),
    onNext: () => jump(exam ? exam.currentIndex + 1 : 0),
    onToggleFlag: toggleFlag,
    onOpenNavigator: () => setNavOpen(true),
  });

  /* spec s10.4: one-shot sr announcements at 5:00 / 1:00 remaining -
     flagged in an effect so render stays pure. */
  const secondsLeftNow = exam ? remainingSeconds(exam, now) : Number.POSITIVE_INFINITY;
  useEffect(() => {
    if (isPractice || !exam || exam.finishedAtMs !== null) return;
    if (!announced5Ref.current && secondsLeftNow <= 300 && secondsLeftNow > 60) announced5Ref.current = true;
    if (!announced1Ref.current && secondsLeftNow <= 60 && secondsLeftNow > 0) announced1Ref.current = true;
  }, [exam, isPractice, secondsLeftNow]);

  if (!exam) {
    // Fresh count at render time - items may have been mastered in a
    // just-finished session, leaving nothing to review right now.
    const reviewCount = isReview ? getDueReviewItems(gradeId).length : 0;
    return <ExamIntro programId={programId} gradeId={gradeId} gradeLabel={gradeLabel} isPractice={isPractice} isReview={isReview} isArena={isArena} reviewCount={reviewCount} loading={loadingBank} loadError={loadError} focusLabel={focus?.label} onBegin={begin} onExit={() => { liveAbandon(); onExit(); }} />;
  }

  if (result) {
    if (isArena && arena) {
      return <ArenaResult exam={exam} result={result} arena={arena} gradeId={gradeId} gradeLabel={gradeLabel} programId={programId} studentName={studentName} onExit={onExit} liveChannel={liveChannelRef.current} />;
    }
    // CR-28: after a review session the queue may be fully rescheduled -
    // a retry with zero due items would have nothing to render.
    const canRetry = !isReview || getDueReviewItems(gradeId).length > 0;
    return <ExamResult result={result} programId={programId} gradeLabel={gradeLabel} isPractice={isPractice} studentName={studentName} onExit={onExit} onRetry={canRetry ? begin : undefined} />;
  }

  const question = exam.questions[exam.currentIndex]!;
  const left = remainingSeconds(exam, now);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const stripQuestions = exam.questions.slice(stripOffset, stripOffset + STRIP_PAGE);
  const answeredSet = exam.answers;
  const answeredCount = answeredSet.filter((a) => a !== null && a !== undefined).length;
  const unansweredIndexes = exam.questions
    .map((_, i) => i)
    .filter((i) => answeredSet[i] === null || answeredSet[i] === undefined);
  const flaggedIndexes = [...flags].sort((a, b) => a - b);
  const isLastQuestion = exam.currentIndex >= exam.questions.length - 1;
  const isG12 = gradeId === 'grade-1' || gradeId === 'grade-2';
  const urgent = !isPractice && left <= 60;

  /* spec s10.4: the live region announces "Còn 5 phút" at 5:00 and
     "Còn 1 phút" at 1:00 - the flags below make each fire once per run. */
  const srAnnouncement = !isPractice && left <= 60 && announced1Ref.current
    ? 'Còn 1 phút'
    : !isPractice && left <= 300 && announced5Ref.current
      ? 'Còn 5 phút'
      : '';

  return (
    <div data-testid="exam-screen" className={EXAM_DESK}>
      {/* Desk header: wordmark badge (no mascot - R-v5-06) | title |
          progress ring (exam) | timer | NỘP BÀI */}
      <header className="flex items-center justify-between gap-2 border-b-2 border-desk-line bg-desk-bar px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span data-testid="exam-brand" className={`${EXAM_HEADER_BRAND} shrink-0`}>
            English Arena
          </span>
          <div className="min-w-0">
          <div className="truncate text-sm font-extrabold tracking-wide text-sky-200 sm:text-lg">
            {isReview ? 'Ôn lại câu sai' : isPractice ? 'Luyện đề' : 'Thi thử'} - {isReview ? gradeLabel : `${PROGRAM_LABEL[programId]} - ${gradeLabel}`}
          </div>
          {studentName && <div className="truncate text-xs font-bold text-slate-400">{studentName}</div>}
          </div>
        </div>
        {isPractice ? (
          <div className="flex shrink-0 items-center gap-2">
            <div data-testid="exam-elapsed" className="rounded-lg bg-desk-well px-3 py-1 font-mono text-lg font-extrabold tabular-nums text-sky-300">
              <IconClock size={15} className="mr-1 inline-block" /> {Math.floor(Math.max(0, now - exam.startedAtMs) / 60000)}:{String(Math.floor(Math.max(0, now - exam.startedAtMs) / 1000) % 60).padStart(2, '0')}
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <ExamProgressRing current={exam.currentIndex} total={exam.questions.length} answered={answeredCount} />
            <div data-testid="exam-timer" className={`${EXAM_TIMER} ${urgent ? EXAM_TIMER_URGENT : ''}`}>
              <IconClock size={18} className="inline-block" aria-hidden="true" /> {mm}:{ss}
            </div>
          </div>
        )}
        <button
          type="button"
          data-testid="exam-submit"
          onClick={openSubmit}
          className="min-h-[48px] shrink-0 rounded-lg bg-sky-700 px-4 text-base font-extrabold tracking-wide text-white shadow-md transition hover:bg-sky-600 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 motion-reduce:transition-none"
        >
          {isPractice ? 'KẾT THÚC' : 'NỘP BÀI'}
        </button>
      </header>

      {/* CR-97: live race standings - every player's progress streams in
          via broadcast; sorted live by score then progress. */}
      {isLiveArena && exam.finishedAtMs === null && (
        <LiveStandingsStrip
          opponents={liveOpponents}
          meName={studentName ?? 'Bạn'}
          meQ={answeredCount}
          meScore={livePointsRef.current}
          total={exam.questions.length}
        />
      )}

      {/* sr-only timer announcements (spec s10.4): "Còn 5 phút" at 5:00,
          "Còn 1 phút" at 1:00 - each once per run. */}
      <div aria-live="polite" className="sr-only">
        {srAnnouncement}
      </div>

      {/* Practice mode keeps the generic confirm; exam mode gets the
          review-before-submit sheet (D-13). */}
      {submitConfirmOpen && isPractice && (
        <ConfirmEndDialog
          title="Kết thúc bài?"
          body="Em sẽ xem điểm các câu đã làm luôn nhé."
          confirmLabel="Kết thúc"
          onConfirm={() => {
            setSubmitConfirmOpen(false);
            setExam((c) => (c ? submitExam(c, Date.now()) : c));
          }}
          onCancel={() => setSubmitConfirmOpen(false)}
        />
      )}
      {reviewOpen && !isPractice && (
        <ExamReviewSheet
          total={exam.questions.length}
          unanswered={unansweredIndexes}
          flagged={flaggedIndexes}
          onJump={(index) => {
            setReviewOpen(false);
            jump(index);
          }}
          onBack={() => setReviewOpen(false)}
          onSubmit={() => {
            setReviewOpen(false);
            setExam((c) => (c ? submitExam(c, Date.now()) : c));
          }}
        />
      )}
      {navOpen && !isPractice && (
        <ExamNavigatorDialog
          total={exam.questions.length}
          currentIndex={exam.currentIndex}
          answered={exam.answers.map((a) => a !== null && a !== undefined)}
          flagged={flags}
          onJump={(index) => {
            setNavOpen(false);
            jump(index);
          }}
          onClose={() => setNavOpen(false)}
        />
      )}

      {/* r5: surface an under-filled session instead of silently running
          short - a fixed form missing rows is a content defect, not a
          smaller exam. */}
      {(exam.poolShort || (exam.droppedCount ?? 0) > 0) && (
        <div data-testid="exam-pool-warning" className="border-b border-amber-200 bg-amber-100 px-3 py-1.5 text-center text-xs font-bold text-amber-900">
          {exam.poolShort
            ? 'Ngân hàng câu hỏi chưa đủ cho bài này - số câu ít hơn dự kiến. Báo cô giáo/bố mẹ kiểm tra nhé.'
            : 'Một số câu hỏi bị lỗi dữ liệu nên bị bỏ qua. Báo cô giáo/bố mẹ kiểm tra nhé.'}
        </div>
      )}

      {/* Question number strip - exam only; practice is sequential.
          CR-82 M5: flagged cells carry the amber flag ring (desk register)
          and the strip ends with "Tất cả câu" opening the navigator. */}
      {!isPractice && (
        <div className="flex items-center gap-1 overflow-x-auto bg-desk-bar px-2 py-1.5">
          <button
            type="button"
            aria-label="Trước"
            disabled={stripOffset === 0}
            onClick={() => setStripOffset(Math.max(0, stripOffset - STRIP_PAGE))}
            className={`${EXAM_NAV_CELL} shrink-0 disabled:opacity-30`}
          >
            <IconChevronLeft size={20} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {stripQuestions.map((q, i) => {
              const index = stripOffset + i;
              const isCurrent = index === exam.currentIndex;
              const answered = answeredSet[index] !== null && answeredSet[index] !== undefined;
              const isFlagged = flags.has(index);
              /* CR-73 exam.navStrip: unanswered = exam.card; answered =
                 status.success translucent + check (not color-alone);
                 current = exam.selected ring; current+answered keeps
                 the check + aria-current. CR-82: flagged adds the amber
                 flag ring + icon on the desk strip (EXAM_NAV_FLAGGED). */
              return (
                <button
                  key={q.id}
                  type="button"
                  data-testid={`exam-nav-${index}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => jump(index)}
                  className={`${EXAM_NAV_CELL} relative shrink-0 ${
                    isCurrent ? EXAM_SELECTED : answered ? EXAM_NAV_ANSWERED : ''
                  } ${isFlagged ? `ring-2 ${EXAM_NAV_FLAGGED}` : ''}`}
                >
                  {answered && (
                    <IconCheck size={12} aria-hidden="true" className="mr-0.5" />
                  )}
                  {isFlagged && (
                    <IconFlag size={10} aria-hidden="true" className="absolute -right-1 -top-1 text-amber-300" />
                  )}
                  {answered && <span className="sr-only">đã trả lời</span>}
                  {isFlagged && <span className="sr-only">đã đánh dấu</span>}
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-label="Sau"
            disabled={stripOffset + STRIP_PAGE >= exam.questions.length}
            onClick={() => setStripOffset(stripOffset + STRIP_PAGE)}
            className={`${EXAM_NAV_CELL} shrink-0 disabled:opacity-30`}
          >
            <IconChevronRight size={20} />
          </button>
          <button
            type="button"
            data-testid="exam-nav-open"
            onClick={() => setNavOpen(true)}
            className={`${EXAM_NAV_CELL} shrink-0 w-auto px-3 text-sm`}
          >
            Tất cả câu
          </button>
        </div>
      )}

      {/* Paper sheet (spec s10): ruled header + navy question chip +
          flag toggle + the question on paper inks. */}
      <main className={`${EXAM_SHEET} flex flex-col`}>
        <div className={EXAM_SHEET_HEADER}>
          <span>
            <span className={EXAM_QNUM}>Câu {exam.currentIndex + 1}</span>
            <span className="text-slate-500">/ {exam.questions.length}</span>
          </span>
          {!isPractice && (
            <button
              type="button"
              data-testid="exam-flag"
              aria-pressed={flags.has(exam.currentIndex)}
              onClick={toggleFlag}
              className={`${EXAM_SHEET_BTN} !min-h-[40px] px-3 text-sm ${
                flags.has(exam.currentIndex) ? `ring-2 ${EXAM_NAV_FLAGGED}` : ''
              }`}
            >
              <IconFlag size={14} aria-hidden="true" />
              {flags.has(exam.currentIndex) ? 'Bỏ đánh dấu' : 'Đánh dấu câu này'}
            </button>
          )}
        </div>
        {/* my-auto centres the question vertically on the sheet (auto
            margins absorb leftover space) and collapses to top-flow the
            moment a long passage needs the room - no clipping. */}
        <div className="my-auto">
        <ExamQuestionView question={question} answer={exam.answers[exam.currentIndex] ?? null} onAnswer={answer} promptClass={isG12 ? TYPE_PROMPT_PAPER_G12 : TYPE_PROMPT_PAPER_G345} />
        {isPractice && verdict && (
          <div
            data-testid="practice-verdict"
            className={`mt-6 ${verdict.isCorrect ? EXAM_VERDICT_CORRECT : EXAM_VERDICT_WRONG}`}
          >
            <div className="text-lg font-extrabold">
              {verdict.isCorrect ? <span className="inline-flex items-center gap-1.5">Chính xác! <IconParty size={18} /></span> : 'Chưa đúng rồi.'}
            </div>
            <div className="mt-1 text-sm font-bold">
              Đáp án đúng: <span className="font-extrabold text-emerald-800"><MarkupText text={examCorrectAnswerText(question)} /></span>
            </div>
            {question.explanation && <div className={`mt-1 text-sm ${TYPE_BODY_PAPER}`}><MarkupText text={question.explanation} /></div>}
            {/* N1: the ONE gold action of the untimed practice sitting. */}
            <button
              type="button"
              data-testid="practice-next"
              onClick={practiceNext}
              className={`mt-3 ${EXAM_PRACTICE_NEXT} ${isG12 ? '' : '!min-h-[64px]'} w-full sm:w-auto`}
            >
              <span className="inline-flex items-center gap-1.5">{isLastQuestion ? 'Xem kết quả' : 'Câu tiếp theo'} <IconArrowRight size={16} /></span>
            </button>
          </div>
        )}
        </div>
        {!isPractice && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              data-testid="exam-prev"
              disabled={exam.currentIndex === 0}
              onClick={() => jump(exam.currentIndex - 1)}
              className={`${EXAM_SHEET_BTN} disabled:opacity-40`}
            >
              <IconChevronLeft size={16} aria-hidden="true" /> Câu trước
            </button>
            <button
              type="button"
              data-testid="exam-next"
              disabled={isLastQuestion}
              onClick={() => jump(exam.currentIndex + 1)}
              className={`${EXAM_SHEET_BTN} disabled:opacity-40`}
            >
              Câu sau <IconChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function ExamIntro({ programId, gradeId, gradeLabel, isPractice, isReview, isArena, reviewCount, loading, loadError, focusLabel, onBegin, onExit }: { programId: ExamProgramId; gradeId: string; gradeLabel: string; isPractice: boolean; isReview?: boolean; isArena?: boolean; reviewCount?: number; loading?: boolean; loadError?: boolean; focusLabel?: string; onBegin: () => void; onExit: () => void }) {
  const title = isArena
    ? `Đấu trường - ${PROGRAM_LABEL[programId]}`
    : isReview ? `Ôn lại câu sai - ${gradeLabel}` : focusLabel ? `${focusLabel} - ${PROGRAM_LABEL[programId]}` : `${isPractice ? 'Luyện đề' : 'Thi thử'} - ${PROGRAM_LABEL[programId]}`;

  /* spec s10.4: the bank fetch keeps the desk register - a paper sheet
     skeleton, not the navy spinner of old. */
  if (loading) {
    return (
      <div className={EXAM_DESK} data-testid="exam-intro">
        <main className={EXAM_SHEET} aria-busy="true">
          <div className="h-6 w-2/3 rounded bg-slate-200 animate-pulse motion-reduce:animate-none" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-200 animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
          <p className={`mt-6 text-center ${TYPE_BODY_PAPER}`}>Đang lấy đề...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={`${EXAM_DESK} items-center justify-center`} data-testid="exam-intro">
      {/* Paper card on the desk; the ONE mascot of this screen (greeting,
          block size) and the ONE gold action (exam-begin). */}
      <div className={`${EXAM_SHEET} max-w-lg !flex-none text-center`}>
        <div className="flex justify-center">
          <MascotAvatar sizePx={80} />
        </div>
        <h1 className={`${TYPE_PROMPT_PAPER_G345} mt-2`}>
          {title}
        </h1>
        {!isReview && <p className={`mt-1 text-lg font-bold ${TYPE_BODY_PAPER}`}>{gradeLabel}</p>}
        <ul className={`mx-auto mt-5 max-w-sm space-y-2 text-left text-sm font-semibold sm:text-base ${TYPE_BODY_PAPER}`}>
          {isReview ? (
            (reviewCount ?? 0) > 0 ? (
              <>
                <li>• {reviewCount} câu em từng trả lời sai - làm lại để nhớ lâu hơn</li>
                <li>• Chữa từng câu ngay - có đáp án + giải thích + phiên âm</li>
                <li>• Trả lời đúng vài lần cách ngày, câu sẽ "tốt nghiệp" nhé</li>
              </>
            ) : (
              <li>• Không còn câu nào cần ôn - tuyệt vời! Làm Luyện đề hoặc Thi thử để thêm nhé</li>
            )
          ) : isArena ? (
            <>
              <li>• {ARENA_QUESTION_COUNT} câu hỏi - cả hai chơi đúng cùng một đề</li>
              <li>• Ai nhiều điểm hơn thắng - hòa điểm thì ai nhanh hơn thắng</li>
              <li>• Biết đúng/sai ngay sau mỗi câu - làm nhanh nhưng đừng vội nhé</li>
            </>
          ) : isPractice ? (
            <>
              <li>• {examConfigForGrade(gradeId).drillCount} câu hỏi giống dạng đề thi thật</li>
              <li>• Chữa từng câu ngay - có đáp án + giải thích + phiên âm</li>
              <li>• Không giới hạn thời gian, cứ làm từ từ nhé</li>
            </>
          ) : (
            <>
              <li>• {examConfigForGrade(gradeId).examCount} câu hỏi - làm trong {Math.floor(examConfigForGrade(gradeId).examTimeSec / 60)} phút</li>
              <li>• Bấm số câu để nhảy tới câu bất kỳ, làm xong quay lại sửa được</li>
              <li>• Đánh dấu câu khó bằng lá cờ - phím F cũng được</li>
              <li>• Hết giờ tự động nộp bài</li>
            </>
          )}
        </ul>
        {loadError && (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-200">
            {focusLabel
              ? 'Phần này đang được bổ sung thêm câu hỏi - em thử Luyện đề nhé!'
              : 'Chưa tải được đề - em kiểm tra mạng rồi thử lại nhé.'}
          </p>
        )}
        {(!isReview || (reviewCount ?? 0) > 0) && (
          <button
            type="button"
            data-testid="exam-begin"
            onClick={onBegin}
            disabled={loading}
            className={`${CTA_GOLD_XL} mt-6 w-full text-lg disabled:opacity-60`}
          >
            {loadError ? 'Thử lại' : isReview ? 'Bắt đầu ôn' : isArena ? 'Vào đấu trường' : isPractice ? 'Bắt đầu luyện' : 'Bắt đầu làm bài'}
          </button>
        )}
        <button
          type="button"
          onClick={onExit}
          className={`${BTN_SECONDARY_PAPER} mt-3 w-full`}
        >
          Quay lại
        </button>
      </div>
    </div>
  );
}

/** Exported for the real-bank render contract tests (CR-42).
 *  CR-82 M5: `promptClass` carries the grade-appropriate TYPE_PROMPT_PAPER
 *  composite - a `*_NAVY` composite may never render inside EXAM_SHEET
 *  (spec s5.3 rule 2). */
export function ExamQuestionView({
  question,
  answer,
  onAnswer,
  promptClass = TYPE_PROMPT_PAPER_G345,
}: {
  question: ExamQuestion;
  answer: ExamAnswer | null;
  onAnswer: (a: ExamAnswer) => void;
  promptClass?: string;
}) {
  switch (question.kind) {
    case 'image-choice':
      return (
        <div>
          {/* Exhibit on paper - formal register, no tilt, no soft-3D. */}
          <div className="mx-auto mb-6 flex max-w-xs justify-center rounded-xl bg-white p-4 text-center text-7xl shadow-none ring-1 ring-slate-200">
            <EmojiVisual emoji={question.emoji} />
          </div>
          <div className={`text-center ${TYPE_BODY_PAPER}`}>Hình này là gì?</div>
          <OptionButtons options={question.options} selected={answer?.type === 'option' ? answer.index : null} onPick={(i) => onAnswer({ type: 'option', index: i })} />
        </div>
      );
    case 'grammar-mcq':
    case 'odd-pronunciation':
      return (
        <div>
          {question.kind === 'grammar-mcq' && question.transcript && (
            <ListenButton text={question.transcript} />
          )}
          {question.kind === 'grammar-mcq' && question.passage && (
            <p
              data-testid="exam-passage"
              className={`mx-auto mb-4 max-w-xl rounded-xl bg-white p-4 text-base leading-relaxed ring-1 ring-slate-200 sm:text-lg ${TYPE_BODY_PAPER}`}
            >
              {question.passage}
            </p>
          )}
          <PromptLine
            text={question.kind === 'odd-pronunciation' ? 'Chọn từ có phát âm khác với 3 từ còn lại.' : question.prompt}
            imageUrl={question.kind === 'grammar-mcq' ? question.imageUrl : undefined}
            className={promptClass}
          />
          <OptionButtons
            options={question.options}
            selected={answer?.type === 'option' ? answer.index : null}
            onPick={(i) => onAnswer({ type: 'option', index: i })}
            ipa={question.kind === 'odd-pronunciation'}
            optionImages={question.kind === 'grammar-mcq' ? question.optionImages : undefined}
          />
        </div>
      );
    case 'true-false-reading':
      return (
        <div>
          <p className={`mx-auto mb-4 max-w-xl rounded-xl bg-white p-4 text-base leading-relaxed ring-1 ring-slate-200 sm:text-lg ${TYPE_BODY_PAPER}`}>{question.passage}</p>
          <PromptLine text={question.statement} className={promptClass} />
          <div className="mt-6 flex justify-center gap-4">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                data-testid={`exam-tf-${v}`}
                onClick={() => onAnswer({ type: 'bool', value: v })}
                className={`${EXAM_OPTION_PAPER} w-auto px-10 text-lg ${
                  answer?.type === 'bool' && answer.value === v ? EXAM_SELECTED_PAPER : ''
                }`}
              >
                {v ? 'True' : 'False'}
              </button>
            ))}
          </div>
        </div>
      );
    case 'word-order':
      return <WordOrderView key={question.id} question={question} onAnswer={onAnswer} promptClass={promptClass} />;
    case 'missing-letter':
      return (
        <TextInputView
          key={question.id}
          prompt={question.displaySentence}
          promptClass={promptClass}
          hint="Gõ phần chữ còn thiếu"
          ipa={WORD_IPA[question.word.toLowerCase()]}
          onSubmit={(text) => onAnswer({ type: 'text', text })}
        />
      );
    case 'text-answer':
      return (
        <TextInputView
          key={question.id}
          prompt={question.displaySentence}
          promptClass={promptClass}
          hint="Gõ đáp án"
          imageUrl={question.imageUrl}
          onSubmit={(text) => onAnswer({ type: 'text', text })}
        />
      );
    case 'listening-sentence-fill-blank':
      return (
        <div>
          <ListenButton text={question.sentence} />
          <TextInputView
            key={question.id}
            prompt={question.displaySentence}
            promptClass={promptClass}
            hint="Nghe rồi gõ từ còn thiếu"
            onSubmit={(text) => onAnswer({ type: 'text', text })}
          />
        </div>
      );
    case 'listening-fill-blank':
      return (
        <div>
          <ListenButton text={question.word} />
          <TextInputView
            key={question.id}
            prompt="Nghe và gõ lại từ em nghe được."
            promptClass={promptClass}
            hint="Gõ từ em nghe được"
            onSubmit={(text) => onAnswer({ type: 'text', text })}
          />
        </div>
      );
    case 'extra-letter':
      return (
        <div>
          <PromptLine text="Tìm chữ cái thừa." className={promptClass} />
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {question.displayLetters.map((letter, i) => (
              <button
                key={i}
                type="button"
                data-testid={`exam-letter-${i}`}
                onClick={() => onAnswer({ type: 'option', index: i })}
                className="h-16 w-16 rounded-xl bg-white font-letter text-2xl font-bold uppercase text-slate-800 ring-1 ring-slate-300 shadow-sm transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-600 active:scale-95 motion-reduce:transition-none"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      );
    default:
      return <PromptLine text="Dạng câu này chưa hỗ trợ trong thi thử." className={promptClass} />;
  }
}

function PromptLine({ text, imageUrl, className = TYPE_PROMPT_PAPER_G345 }: { text: string; imageUrl?: string; className?: string }) {
  return (
    <div className={`mx-auto mb-6 max-w-xl text-center leading-relaxed ${className}`}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          decoding="async"
          data-testid="exam-question-image"
          className="art-breathe mx-auto mb-3 max-h-48 rounded-lg bg-white object-contain ring-1 ring-slate-200"
        />
      )}
      <MarkupText text={text} />
    </div>
  );
}

// Option image with a text fallback - a missing/broken asset must never
// leave an answerable question showing only an empty broken-image icon.
function OptionImg({ src, alt, delay, testId }: { src: string; alt: string; delay: number; testId: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MarkupText text={alt} />;
  return <img src={src} alt={alt} decoding="async" data-testid={testId} onError={() => setFailed(true)} className="art-breathe inline-block max-h-20 rounded bg-white object-contain p-1 ring-1 ring-slate-200" style={{ animationDelay: `${delay}s` }} />;
}

function OptionButtons({
  options,
  selected,
  onPick,
  ipa,
  optionImages,
}: {
  options: readonly string[];
  selected: number | null;
  onPick: (index: number) => void;
  ipa?: boolean;
  optionImages?: readonly string[];
}) {
  const labels = ['A', 'B', 'C', 'D'];
  return (
    <div className="mx-auto grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((option, i) => (
        <button
          key={i}
          type="button"
          data-testid={`exam-option-${i}`}
          onClick={() => onPick(i)}
          className={`${EXAM_OPTION_PAPER} text-lg ${
            selected === i ? EXAM_SELECTED_PAPER : ''
          }`}
        >
          {/* the letter key chip identifies the option boundary (s10.2) */}
          <span className={`${EXAM_OPTION_KEY} ${selected === i ? EXAM_SELECTED_KEY_PAPER : ''}`} aria-hidden="true">
            {labels[i]}
          </span>
          {optionImages?.[i] ? (
            <OptionImg src={optionImages[i]} alt={option} delay={(i % 4) * 0.7} testId={`exam-option-image-${i}`} />
          ) : (
            <MarkupText text={option} />
          )}
          {ipa && WORD_IPA[option.toLowerCase()] && (
            <span className="ml-2 text-sm font-normal text-sky-700">/{WORD_IPA[option.toLowerCase()]}/</span>
          )}
          {selected === i && <IconCheckCircle size={18} aria-hidden="true" className="ml-auto text-sky-700" />}
        </button>
      ))}
    </div>
  );
}

function TextInputView({ prompt, promptClass, hint, ipa, imageUrl, onSubmit }: { prompt: string; promptClass?: string; hint: string; ipa?: string; imageUrl?: string; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <PromptLine text={prompt} imageUrl={imageUrl} className={promptClass} />
      {ipa && <div className="mb-2 text-center font-mono text-lg text-sky-700">/{ipa}/</div>}
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <input
          type="text"
          data-testid="exam-text-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onSubmit(value);
          }}
          placeholder={hint}
          autoFocus
          className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-center font-mono text-xl font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/30"
        />
        <button
          type="button"
          data-testid="exam-text-submit"
          disabled={!value.trim()}
          onClick={() => onSubmit(value)}
          className={`${EXAM_SHEET_BTN} !bg-sky-700 !text-white !ring-sky-700 hover:!bg-sky-600 px-8 disabled:opacity-40`}
        >
          Trả lời
        </button>
      </div>
    </div>
  );
}

export function WordOrderView({ question, onAnswer, promptClass }: { question: Extract<ExamQuestion, { kind: 'word-order' }>; onAnswer: (a: ExamAnswer) => void; promptClass?: string }) {
  const [picked, setPicked] = useState<number[]>([]);
  const remaining = question.tiles.map((_, i) => i).filter((i) => !picked.includes(i));

  function pick(i: number) {
    // r15: never side-effect inside a state updater - StrictMode replays
    // updaters, which would double-fire the telemetry in onAnswer.
    if (picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (next.length === question.tiles.length) {
      onAnswer({ type: 'order', indices: next });
    }
  }

  return (
    <div>
      <PromptLine text="Sắp xếp các từ thành câu đúng." className={promptClass} />
      {/* answer line - paper well */}
      <div className="mx-auto mb-6 flex min-h-14 max-w-xl flex-wrap items-center justify-center gap-2 rounded-xl bg-slate-100 p-3 ring-1 ring-slate-200">
        {picked.length === 0 && <span className="text-sm text-slate-500">Bấm các từ bên dưới theo đúng thứ tự</span>}
        {picked.map((tileIndex, slot) => (
          <button
            key={slot}
            type="button"
            data-testid={`exam-slot-${slot}`}
            onClick={() => setPicked((prev) => prev.filter((_, s) => s !== slot))}
            className={`${EXAM_OPTION_PAPER} !min-h-[48px] w-auto px-3 py-2 text-base ${EXAM_SELECTED_PAPER}`}
          >
            {question.tiles[tileIndex]}
          </button>
        ))}
      </div>
      {/* tile pool */}
      <div className="flex flex-wrap justify-center gap-2">
        {remaining.map((tileIndex) => (
          <button
            key={tileIndex}
            type="button"
            data-testid={`exam-tile-${tileIndex}`}
            onClick={() => pick(tileIndex)}
            className="min-h-[64px] rounded-lg bg-white px-4 py-2.5 text-lg font-extrabold text-slate-800 ring-1 ring-slate-300 shadow-sm transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-600 active:scale-95 motion-reduce:transition-none"
          >
            {question.tiles[tileIndex]}
          </button>
        ))}
      </div>
      {picked.length > 0 && (
        <button type="button" onClick={() => setPicked([])} className="mx-auto mt-4 block text-sm font-bold text-slate-500 underline">
          Xóa làm lại
        </button>
      )}
    </div>
  );
}

function ListenButton({ text }: { text: string }) {
  return (
    <div className="mb-4 flex justify-center">
      <button
        type="button"
        data-testid="exam-listen"
        onClick={() => speakSentence(text)}
        className={`${EXAM_SHEET_BTN} rounded-full px-5 py-3`}
      >
        <IconSpeaker size={18} /> Nghe lại
      </button>
    </div>
  );
}

/** CR-97: live standings strip during a race - one chip per racer,
 *  sorted by score then progress; finished racers pin to the top. */
function LiveStandingsStrip({
  opponents,
  meName,
  meQ,
  meScore,
  total,
}: {
  opponents: Map<string, LivePlayer & { q?: number }>;
  meName: string;
  meQ: number;
  meScore: number;
  total: number;
}) {
  const racers = [
    { id: '__me__', name: meName, q: meQ, score: meScore, finished: false, me: true },
    ...[...opponents.values()].map((p) => ({ ...p, q: p.q ?? 0, me: false })),
  ].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.q ?? 0) - (a.q ?? 0));
  return (
    <div data-testid="arena-live-standings" className="flex flex-wrap items-center gap-1.5 border-b border-desk-line bg-desk-well px-3 py-2">
      {racers.map((r, i) => (
        <span
          key={r.id}
          data-testid={`live-standing-${r.id}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ${
            r.me ? 'bg-sky-500/25 text-sky-200 ring-sky-400/50' : 'bg-white/5 text-slate-200 ring-white/10'
          }`}
        >
          {i === 0 && <IconTrophy size={12} className="text-amber-300" />}
          <span className="max-w-24 truncate">{r.name}</span>
          <span className="tabular-nums text-slate-400">{r.finished ? '🏁' : `c${r.q}/${total}`}</span>
          <span className="tabular-nums text-amber-300">{r.score ?? 0}đ</span>
        </span>
      ))}
    </div>
  );
}

/** CR-34: arena duel result. Settles the challenge exactly once per
 *  finished run (ref guard) then shows the two-sided scoreboard. */
function ArenaResult({
  exam,
  result,
  arena,
  gradeId,
  gradeLabel,
  programId,
  studentName,
  onExit,
  liveChannel,
}: {
  exam: ExamState;
  result: ReturnType<typeof computeExamResult>;
  arena: ArenaRun;
  gradeId: string;
  gradeLabel: string;
  programId: ExamProgramId;
  studentName?: string;
  onExit: () => void;
  /** CR-97: the ExamScreen's live channel - broadcasts my finish. */
  liveChannel?: LiveChannel | null;
}) {
  const myScore = result.points;
  // Arena has no time limit so result.timeUsedSec clamps to 0 - the
  // "faster wins" tie-break needs the REAL elapsed wall-clock time.
  const myTimeMs = Math.max(0, (exam.finishedAtMs ?? Date.now()) - exam.startedAtMs);
  const [duel, setDuel] = useState<ArenaDuelResult | null>(null);
  const [created, setCreated] = useState(false);
  const [failed, setFailed] = useState(false);
  const [newBadges, setNewBadges] = useState<Sticker[]>([]);
  const [livePodium, setLivePodium] = useState<LivePlayer[] | null>(null);
  /** True while the room is still 'racing' - standings show, no verdict. */
  const [livePending, setLivePending] = useState(false);
  const settled = useRef(false);
  /** Cancels the live settle poll when the result unmounts. */
  const settleCancelled = useRef(false);
  useEffect(() => () => {
    settleCancelled.current = true;
  }, []);

  useEffect(() => {
    if (settled.current) return;
    settled.current = true;
    // CR-37: a finished duel (win or loss) feeds the arena badges -
    // guests earn them too, the counters are localStorage-based.
    const settle = (won: boolean) => setNewBadges(recordArenaDuel(won));
    if (arena.kind === 'live' && arena.liveRoomId) {
      // CR-97: announce my finish, post the result (server measures the
      // time itself), then poll the settled leaderboard until 'done'.
      // Same identity guard as create/accept: an account switch mid-run
      // must not post under the new user.
      void (async () => {
        if (!(await activityOwnerMatches())) {
          setFailed(true);
          return;
        }
        const session = await getSession();
        const myId = session?.user?.id ?? '';
        liveChannel?.sendFinish(myScore, myTimeMs);
        // The finish write must land before any podium maths - retry a
        // flaky connection, then surface a retryable error, never a
        // podium built on a result that was never persisted.
        let posted = await liveRoomFinish(arena.liveRoomId!, myScore);
        for (let i = 0; !posted && i < 2 && !settleCancelled.current; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          posted = await liveRoomFinish(arena.liveRoomId!, myScore);
        }
        if (!posted) {
          if (!settleCancelled.current) setFailed(true);
          return;
        }
        // Standings refresh live while kids finish at their own pace -
        // 2.5s cadence for the first 4min, then 10s until the room is
        // 'done' (a never-finishing room still ends via the 30min stale
        // cleanup, so this loop cannot outlive the result screen).
        // The WIN only settles once the room is 'done' - provisional
        // standings never declare a victor.
        const fastUntil = Date.now() + 240_000;
        let players: LivePlayer[] = [];
        while (!settleCancelled.current) {
          const st = await liveRoomState(arena.liveRoomId!);
          if (st) {
            players = st.players;
            setLivePodium(players);
            if (st.status === 'done') break;
            setLivePending(true);
          }
          await new Promise((r) => setTimeout(r, Date.now() < fastUntil ? 2500 : 10_000));
        }
        if (settleCancelled.current) return;
        settle(players[0]?.id === myId && players.length > 1);
        setLivePending(false);
      })();
      return;
    }
    if (arena.kind === 'bot') {
      const ghost = botGhost(arena.seed, result.totalCount * EXAM_POINTS_PER_QUESTION);
      const iWon = myScore > ghost.score || (myScore === ghost.score && myTimeMs < ghost.timeMs);
      setDuel({
        my_score: myScore,
        my_time_ms: myTimeMs,
        opp_name: ghost.name,
        opp_score: ghost.score,
        opp_time_ms: ghost.timeMs,
        i_won: iWon,
        is_draw: myScore === ghost.score && myTimeMs === ghost.timeMs,
      });
      settle(iWon);
      return;
    }
    void (async () => {
      // r17: the duel belongs to the identity that STARTED the run.
      // An account switch during the exam must not post the challenge
      // under the new user - the r16 owner binding only covers the
      // result-row saves, not the arena RPCs.
      if (!(await activityOwnerMatches())) {
        setFailed(true);
        return;
      }
      if (arena.kind === 'create') {
        const id = await arenaCreate(arena.seed, gradeId, programId, myScore, myTimeMs);
        if (id) {
          setCreated(true);
          // A posted challenge is still a played arena run for badges.
          settle(false);
        } else {
          setFailed(true);
        }
      } else if (arena.challengeId) {
        const r = await arenaAccept(arena.challengeId, myScore, myTimeMs);
        if (r) {
          setDuel(r);
          settle(r.i_won && !r.is_draw);
        } else {
          setFailed(true);
        }
      }
    })();
  }, [arena, gradeId, programId, myScore, myTimeMs]);

  const mm = Math.floor(result.timeUsedSec / 60);
  const ss = result.timeUsedSec % 60;

  return (
    <div data-testid="arena-result" className="min-h-screen bg-[#0d1b26] p-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border-8 border-amber-800/70 bg-[#16232e] p-6 text-center sm:p-10">
          <div className="flex justify-center text-amber-300"><IconSwords size={44} /></div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-amber-300">Đấu trường Arena</h1>
          <p className="mt-1 text-sm font-bold text-slate-400">
            {PROGRAM_LABEL[programId]} - {gradeLabel}
          </p>

          {arena.kind === 'create' && (
            <div data-testid="arena-created" className="mt-6 rounded-xl bg-white/5 p-5">
              {created ? (
                <>
                  <div className="flex justify-center text-sky-300"><IconMail size={40} /></div>
                  <p className="mt-2 font-extrabold text-emerald-300">Đã tạo thử thách!</p>
                  <p className="mt-1 text-sm font-bold text-slate-300">
                    Điểm của bạn: <span className="text-amber-300">{myScore}</span> - thời gian{' '}
                    {mm}:{String(ss).padStart(2, '0')}
                  </p>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Bạn bè cùng khối sẽ thấy thử thách này trong mục Đấu trường và chơi đúng bộ câu của bạn.
                  </p>
                </>
              ) : failed ? (
                <p className="font-bold text-rose-300">Chưa lưu được thử thách. Kiểm tra đăng nhập rồi thử lại nhé.</p>
              ) : (
                <p className="font-bold text-slate-300">Đang tạo thử thách...</p>
              )}
            </div>
          )}

          {(arena.kind === 'accept' || arena.kind === 'bot') && (
            <div className="mt-6">
              {!duel && !failed && <p className="font-bold text-slate-300">Đang so kèo...</p>}
              {failed && <p className="font-bold text-rose-300">Thử thách này đã có người nhận hoặc bị lỗi.</p>}
              {duel && (
                <>
                  <div
                    data-testid="arena-verdict"
                    className={`rounded-xl p-4 font-display text-xl font-extrabold ${
                      duel.is_draw
                        ? 'bg-sky-500/20 text-sky-300'
                        : duel.i_won
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">{duel.is_draw ? <><IconHandshake size={20} /> Hòa nhau!</> : duel.i_won ? <><IconTrophy size={20} /> Bạn thắng!</> : <><IconMuscle size={20} /> Đối thủ thắng - cố lên!</>}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="text-sm font-bold text-sky-300">{studentName ?? 'Bạn'}</div>
                      <div className="mt-1 text-2xl font-extrabold text-amber-300">{duel.my_score}</div>
                      <div className="text-xs font-bold text-slate-400">{Math.floor(duel.my_time_ms / 60000)}:{String(Math.floor(duel.my_time_ms / 1000) % 60).padStart(2, '0')}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="text-sm font-bold text-rose-300">{duel.opp_name}</div>
                      <div className="mt-1 text-2xl font-extrabold text-amber-300">{duel.opp_score}</div>
                      <div className="text-xs font-bold text-slate-400">{Math.floor(duel.opp_time_ms / 60000)}:{String(Math.floor(duel.opp_time_ms / 1000) % 60).padStart(2, '0')}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-400">
                    {result.correctCount}/{result.totalCount} câu đúng - hòa điểm thì ai nhanh hơn sẽ thắng.
                  </p>
                </>
              )}
            </div>
          )}

          {arena.kind === 'live' && (
            <div data-testid="arena-live-podium" className="mt-6">
              {failed ? (
                <p className="font-bold text-rose-300">Không lưu được kết quả phòng đấu - kiểm tra đăng nhập nhé.</p>
              ) : !livePodium ? (
                <p className="font-bold text-slate-300">Đang tổng kết trận đấu...</p>
              ) : (
                <div className="space-y-2">
                  {livePodium.map((p, i) => (
                    <div
                      key={p.id}
                      data-testid={`live-podium-${i}`}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${
                        i === 0
                          ? 'bg-amber-400/15 ring-amber-400/50'
                          : 'bg-white/5 ring-white/10'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-extrabold text-slate-200">
                        {i === 0 ? <IconTrophy size={18} className="text-amber-300" /> : <span className="w-5 text-center text-slate-400">{i + 1}</span>}
                        <span className="max-w-40 truncate">{p.name}</span>
                        {p.score === null && (
                          <span className="text-xs font-bold text-slate-500">
                            {p.finished ? '(bỏ cuộc)' : '(đang làm...)'}
                          </span>
                        )}
                      </span>
                      <span className="text-right">
                        <span className="font-extrabold tabular-nums text-amber-300">{p.score ?? 0}đ</span>
                        <span className="ml-2 text-xs font-bold tabular-nums text-slate-400">
                          {Math.floor((p.timeMs ?? 0) / 60000)}:{String(Math.floor((p.timeMs ?? 0) / 1000) % 60).padStart(2, '0')}
                        </span>
                      </span>
                    </div>
                  ))}
                  {livePending && (
                    <p data-testid="arena-live-pending" className="pt-1 text-xs font-bold text-amber-200">
                      Đang chờ bạn bè làm xong - kết quả sẽ chốt khi cả phòng nộp bài.
                    </p>
                  )}
                  <p className="pt-1 text-xs font-bold text-slate-400">
                    Điểm của bạn: {myScore} - hòa điểm thì ai nhanh hơn xếp trên.
                  </p>
                </div>
              )}
            </div>
          )}

          {newBadges.length > 0 && (
            <div data-testid="arena-new-badges" className="mt-4 rounded-xl bg-amber-400/15 p-3 text-sm font-extrabold text-amber-200 ring-1 ring-amber-400/40">
              <span className="mr-1 inline-flex items-center"><IconMedal size={16} /></span> Huy hiệu mới: {newBadges.map((b) => (
                <span key={b.id} className="mx-1 inline-flex items-center gap-1 align-middle">
                  <ArtImg key={b.art} src={b.art} emoji={b.emoji} size={18} /> {b.nameVi}
                </span>
              )).flatMap((el, i) => (i === 0 ? [el] : [' - ', el]))}
            </div>
          )}

          <button
            type="button"
            data-testid="arena-exit"
            onClick={onExit}
            className={`mt-6 w-full min-h-[64px] ${BTN_SECONDARY_NAVY}`}
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
