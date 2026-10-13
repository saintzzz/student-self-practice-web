import { useEffect, useMemo, useRef, useState } from 'react';
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
import { arenaAccept, arenaCreate, botGhost, type ArenaDuelResult } from '../lib/arena';
import { recordArenaDuel, type Sticker } from '../lib/engagement/store';
import { captureExamWrongAnswers } from '../lib/exam/examSession';
import { createExamFromBank, gradeNumber } from '../lib/qb/bank';
import { createExamTelemetry, type ExamTelemetry } from '../lib/qb/telemetry';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { EmojiVisual } from './EmojiVisual';
import ConfirmEndDialog from './ConfirmEndDialog';
import { WORD_IPA } from '../data/ipaMap';
import { ExamResult, MarkupText, PROGRAM_LABEL } from './ExamResult';
import Mascot from './Mascot';
import { EXAM_HEADER_BRAND, EXAM_NAV_ANSWERED, EXAM_NAV_CELL, EXAM_OPTION, EXAM_SELECTED, BTN_AUDIO, BTN_SECONDARY_NAVY } from '../lib/ui/tokens';
import { IconArrowRight, IconBook, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconHandshake, IconMail, IconMedal, IconMuscle, IconNote, IconParty, IconPencil, IconSpeaker, IconSwords, IconTrophy } from './icons';

/**
 * CR-24 - IOE-style Thi thử player. Visual language follows the real
 * ioe.vn exam: dark chalkboard in a wooden frame, numbered question
 * strip (10/page), top countdown, SUBMIT button, no per-question
 * verdict (exam conditions). 200 questions / 30 minutes by default.
 *
 * kids-UX step 9 (design s3.9, OM-3=C): the ONLY brand injection inside
 * the exam hall is the small EXAM_HEADER_BRAND badge in the header -
 * question cards, nav strip, timer and interior chrome stay IOE-faithful.
 * The results view lives in ExamResult.tsx (full brand celebration there).
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
  kind: 'create' | 'accept' | 'bot';
  seed: string;
  challengeId?: string;
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
  mode: 'exam' | 'practice' | 'review' | 'arena';
  arena?: ArenaRun;
  /** CR-48 phase 5: pinned V6 assessment form (unit test/diagnostic/
   *  midterm/final). When set, questions come from fetch_form in form
   *  order instead of a random mock sample. */
  formId?: string;
  /** CR-58/59: drill focus - qb skill filter (coach) or difficulty floor
   *  (advanced tier). label shows on the intro screen. */
  focus?: { skills?: string[]; minDifficulty?: number; label?: string };
  onExit: () => void;
}

export default function ExamScreen({ programId, gradeId, gradeLabel, studentName, mode, arena, formId, focus, onExit }: ExamScreenProps) {
  const isArena = mode === 'arena';
  const isPractice = mode !== 'exam';
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
  /** CR-69: confirm before the manual NỘP BÀI / KẾT THÚC ends the session. */
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

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
      if (!isReview) {
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
  }, [exam, result, isPractice, isReview, isArena, gradeId, programId]);

  /* CR-69: if the timer expired while the submit confirmation was open,
     the flag survives into the next exam's retry - reset it wherever a
     run finishes or a fresh run begins. */
  useEffect(() => {
    if (exam?.finishedAtMs !== null && exam?.finishedAtMs !== undefined) setSubmitConfirmOpen(false);
  }, [exam]);

  async function begin(): Promise<void> {
    setSubmitConfirmOpen(false);
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
          mode: formId ? 'form' : isPractice ? (isReview ? 'review' : 'practice') : 'mock',
          formId,
        });
        try {
          const bankExam = await createExamFromBank(programId, gradeId, {
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

  if (!exam) {
    // Fresh count at render time - items may have been mastered in a
    // just-finished session, leaving nothing to review right now.
    const reviewCount = isReview ? getDueReviewItems(gradeId).length : 0;
    return <ExamIntro programId={programId} gradeId={gradeId} gradeLabel={gradeLabel} isPractice={isPractice} isReview={isReview} isArena={isArena} reviewCount={reviewCount} loading={loadingBank} loadError={loadError} focusLabel={focus?.label} onBegin={begin} onExit={onExit} />;
  }

  if (result) {
    if (isArena && arena) {
      return <ArenaResult exam={exam} result={result} arena={arena} gradeId={gradeId} gradeLabel={gradeLabel} programId={programId} studentName={studentName} onExit={onExit} />;
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
  const isLastQuestion = exam.currentIndex >= exam.questions.length - 1;

  return (
    <div data-testid="exam-screen" className="flex min-h-screen flex-col bg-[#0d1b26] p-2 text-white sm:p-4">
      {/* IOE header bar: title + clock + student + submit */}
      <header className="flex items-center justify-between gap-2 border-b-4 border-amber-800/80 bg-[#132433] px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {/* kids-UX R7: the single brand element inside the exam hall -
              a small badge + greeting mascot. Everything else keeps the
              IOE mono look. */}
          <span data-testid="exam-brand" className={`${EXAM_HEADER_BRAND} shrink-0`}>
            <Mascot mood="greeting" size="inline" />
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
            <div data-testid="exam-progress" className="rounded-lg bg-[#0a1520] px-3 py-1 text-lg font-extrabold text-amber-300">
              Câu {exam.currentIndex + 1}/{exam.questions.length}
            </div>
            <div data-testid="exam-elapsed" className="rounded-lg bg-[#0a1520] px-3 py-1 font-mono text-lg font-extrabold tabular-nums text-sky-300">
              <IconClock size={15} className="mr-1 inline-block" /> {Math.floor(Math.max(0, now - exam.startedAtMs) / 60000)}:{String(Math.floor(Math.max(0, now - exam.startedAtMs) / 1000) % 60).padStart(2, '0')}
            </div>
          </div>
        ) : (
          <div
            data-testid="exam-timer"
            className={`shrink-0 rounded-lg px-3 py-1 font-mono text-xl font-extrabold tabular-nums sm:text-2xl ${
              left <= 60 ? 'animate-pulse motion-reduce:animate-none bg-rose-600 text-white' : 'bg-[#0a1520] text-amber-300'
            }`}
          >
            <IconClock size={18} className="mr-1 inline-block" /> {mm}:{ss}
          </div>
        )}
        <button
          type="button"
          data-testid="exam-submit"
          onClick={() => setSubmitConfirmOpen(true)}
          className="min-h-[48px] shrink-0 rounded-lg bg-sky-700 px-4 text-base font-extrabold tracking-wide text-white shadow-md transition hover:bg-sky-600 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60"
        >
          {isPractice ? 'KẾT THÚC' : 'NỘP BÀI'}
        </button>
      </header>

      {submitConfirmOpen && (
        <ConfirmEndDialog
          title={isPractice ? 'Kết thúc bài?' : 'Nộp bài thi?'}
          body={isPractice ? 'Em sẽ xem điểm các câu đã làm luôn nhé.' : 'Em sẽ không sửa được câu trả lời nữa.'}
          confirmLabel={isPractice ? 'Kết thúc' : 'Nộp bài'}
          onConfirm={() => {
            setSubmitConfirmOpen(false);
            setExam((c) => (c ? submitExam(c, Date.now()) : c));
          }}
          onCancel={() => setSubmitConfirmOpen(false)}
        />
      )}

      {/* r5: surface an under-filled session instead of silently running
          short - a fixed form missing rows is a content defect, not a
          smaller exam. */}
      {(exam.poolShort || (exam.droppedCount ?? 0) > 0) && (
        <div data-testid="exam-pool-warning" className="border-b border-amber-700/60 bg-amber-950/70 px-3 py-1.5 text-center text-xs font-bold text-amber-200">
          {exam.poolShort
            ? 'Ngân hàng câu hỏi chưa đủ cho bài này - số câu ít hơn dự kiến. Báo cô giáo/bố mẹ kiểm tra nhé.'
            : 'Một số câu hỏi bị lỗi dữ liệu nên bị bỏ qua. Báo cô giáo/bố mẹ kiểm tra nhé.'}
        </div>
      )}

      {/* Question number strip - exam only; practice is sequential. */}
      {!isPractice && (
        <div className="flex items-center gap-1 overflow-x-auto bg-[#132433] px-2 py-1.5">
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
              /* CR-73 exam.navStrip: unanswered = exam.card; answered =
                 status.success translucent + check (not color-alone);
                 current = exam.selected ring; current+answered keeps
                 the check + aria-current. */
              return (
                <button
                  key={q.id}
                  type="button"
                  data-testid={`exam-nav-${index}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  onClick={() => jump(index)}
                  className={`${EXAM_NAV_CELL} shrink-0 ${
                    isCurrent ? EXAM_SELECTED : answered ? EXAM_NAV_ANSWERED : ''
                  }`}
                >
                  {answered && (
                    <IconCheck size={12} aria-hidden="true" className="mr-0.5" />
                  )}
                  {answered && <span className="sr-only">đã trả lời</span>}
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
        </div>
      )}

      {/* Chalkboard */}
      <main className="mx-auto my-3 w-full max-w-3xl flex-1 rounded-lg border-8 border-amber-800/70 bg-[#16232e] p-4 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] sm:p-8">
        <ExamQuestionView question={question} answer={exam.answers[exam.currentIndex] ?? null} onAnswer={answer} />
        {isPractice && verdict && (
          <div
            data-testid="practice-verdict"
            className={`mt-6 rounded-xl border-l-4 p-4 ${
              verdict.isCorrect ? 'border-emerald-500 bg-emerald-500/15' : 'border-rose-500 bg-rose-500/15'
            }`}
          >
            <div className={`text-lg font-extrabold ${verdict.isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
              {verdict.isCorrect ? <span className="inline-flex items-center gap-1.5">Chính xác! <IconParty size={18} /></span> : 'Chưa đúng rồi.'}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-200">
              Đáp án đúng: <span className="font-extrabold text-emerald-300"><MarkupText text={examCorrectAnswerText(question)} /></span>
            </div>
            {question.explanation && <div className="mt-1 text-sm text-slate-300"><MarkupText text={question.explanation} /></div>}
            <button
              type="button"
              data-testid="practice-next"
              onClick={practiceNext}
              className="mt-3 w-full rounded-lg bg-amber-400 px-4 py-2.5 font-extrabold text-amber-950 transition hover:bg-amber-300 active:scale-95 sm:w-auto"
            >
              <span className="inline-flex items-center gap-1.5">{isLastQuestion ? 'Xem kết quả' : 'Câu tiếp theo'} <IconArrowRight size={16} /></span>
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1b26] p-4 text-white">
      <div className="w-full max-w-lg rounded-2xl border-8 border-amber-800/70 bg-[#16232e] p-6 text-center shadow-2xl sm:p-10">
        <div className="mb-2 flex justify-center text-amber-300">
          {isArena ? <IconSwords size={44} /> : isReview ? <IconBook size={44} /> : isPractice ? <IconPencil size={44} /> : <IconNote size={44} />}
        </div>
        <h1 className="font-display text-2xl font-extrabold text-amber-300 sm:text-3xl">
          {title}
        </h1>
        {!isReview && <p className="mt-1 text-lg font-bold text-sky-200">{gradeLabel}</p>}
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm font-semibold text-slate-200 sm:text-base">
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
              <li>• Không hiện đúng/sai trong lúc thi - đúng như thi thật</li>
              <li>• Hết giờ tự động nộp bài</li>
            </>
          )}
        </ul>
        {loadError && (
          <p className="mt-4 rounded-lg bg-red-500/15 px-4 py-2 text-sm font-bold text-red-300">
            {focusLabel
              ? 'Phần này đang được bổ sung thêm câu hỏi - em thử Luyện đề nhé!'
              : 'Không tải được đề - kiểm tra mạng rồi bấm Thử lại nhé.'}
          </p>
        )}
        {(!isReview || (reviewCount ?? 0) > 0) && (
          <button
            type="button"
            data-testid="exam-begin"
            onClick={onBegin}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-lg font-extrabold text-amber-950 shadow-lg transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
          >
            {loading ? 'Đang tải đề...' : loadError ? 'Thử lại' : isReview ? 'Bắt đầu ôn' : isArena ? 'Vào đấu trường' : isPractice ? 'Bắt đầu luyện' : 'Bắt đầu làm bài'}
          </button>
        )}
        <button
          type="button"
          onClick={onExit}
          className="mt-3 w-full rounded-xl border border-slate-500/60 px-6 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
}

/** Exported for the real-bank render contract tests (CR-42). */
export function ExamQuestionView({
  question,
  answer,
  onAnswer,
}: {
  question: ExamQuestion;
  answer: ExamAnswer | null;
  onAnswer: (a: ExamAnswer) => void;
}) {
  switch (question.kind) {
    case 'image-choice':
      return (
        <div>
          <div className="mb-6 text-center text-7xl"><EmojiVisual emoji={question.emoji} /></div>
          <div className="text-center font-mono text-xl text-slate-100">Hình này là gì?</div>
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
              className="mx-auto mb-4 max-w-xl rounded-lg bg-white/5 p-4 font-mono text-base leading-relaxed text-slate-100 sm:text-lg"
            >
              {question.passage}
            </p>
          )}
          <PromptLine
            text={question.kind === 'odd-pronunciation' ? 'Chọn từ có phát âm khác với 3 từ còn lại.' : question.prompt}
            imageUrl={question.kind === 'grammar-mcq' ? question.imageUrl : undefined}
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
          <p className="mx-auto mb-4 max-w-xl rounded-lg bg-white/5 p-4 font-mono text-base leading-relaxed text-slate-100 sm:text-lg">{question.passage}</p>
          <PromptLine text={question.statement} />
          <div className="mt-6 flex justify-center gap-4">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                data-testid={`exam-tf-${v}`}
                onClick={() => onAnswer({ type: 'bool', value: v })}
                className={`${EXAM_OPTION} px-10 text-lg ${
                  answer?.type === 'bool' && answer.value === v ? EXAM_SELECTED : ''
                }`}
              >
                {v ? 'True' : 'False'}
              </button>
            ))}
          </div>
        </div>
      );
    case 'word-order':
      return <WordOrderView key={question.id} question={question} onAnswer={onAnswer} />;
    case 'missing-letter':
      return (
        <TextInputView
          key={question.id}
          prompt={question.displaySentence}
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
            hint="Gõ từ em nghe được"
            onSubmit={(text) => onAnswer({ type: 'text', text })}
          />
        </div>
      );
    case 'extra-letter':
      return (
        <div>
          <PromptLine text="Tìm chữ cái thừa." />
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {question.displayLetters.map((letter, i) => (
              <button
                key={i}
                type="button"
                data-testid={`exam-letter-${i}`}
                onClick={() => onAnswer({ type: 'option', index: i })}
                className="h-16 w-16 rounded-xl bg-[#16232e] text-2xl font-extrabold uppercase text-white ring-1 ring-[#22303d] shadow-md transition hover:bg-[#132433] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 active:scale-95"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      );
    default:
      return <PromptLine text="Dạng câu này chưa hỗ trợ trong thi thử." />;
  }
}

function PromptLine({ text, imageUrl }: { text: string; imageUrl?: string }) {
  return (
    <div className="mx-auto mb-6 max-w-xl text-center font-mono text-lg leading-relaxed text-slate-100 sm:text-2xl">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          data-testid="exam-question-image"
          className="mx-auto mb-3 max-h-48 rounded-lg bg-white object-contain"
        />
      )}
      <MarkupText text={text} />
    </div>
  );
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
          className={`${EXAM_OPTION} text-left font-mono text-lg ${
            selected === i ? EXAM_SELECTED : ''
          }`}
        >
          <span className="mr-2 font-extrabold text-amber-400">{labels[i]}.</span>
          {optionImages?.[i] ? (
            <img src={optionImages[i]} alt={option} data-testid={`exam-option-image-${i}`} className="inline-block max-h-20 rounded bg-white object-contain p-1" />
          ) : (
            <MarkupText text={option} />
          )}
          {ipa && WORD_IPA[option.toLowerCase()] && (
            <span className="ml-2 text-sm font-normal text-sky-300">/{WORD_IPA[option.toLowerCase()]}/</span>
          )}
        </button>
      ))}
    </div>
  );
}

function TextInputView({ prompt, hint, ipa, imageUrl, onSubmit }: { prompt: string; hint: string; ipa?: string; imageUrl?: string; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <PromptLine text={prompt} imageUrl={imageUrl} />
      {ipa && <div className="mb-2 text-center font-mono text-lg text-sky-300">/{ipa}/</div>}
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
          className="w-full rounded-lg border-2 border-amber-300/60 bg-white/10 px-4 py-3 text-center font-mono text-xl font-bold text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
        />
        <button
          type="button"
          data-testid="exam-text-submit"
          disabled={!value.trim()}
          onClick={() => onSubmit(value)}
          className="rounded-lg bg-amber-400 px-8 py-2.5 font-extrabold text-amber-950 shadow transition hover:bg-amber-300 disabled:opacity-40"
        >
          ANSWER
        </button>
      </div>
    </div>
  );
}

export function WordOrderView({ question, onAnswer }: { question: Extract<ExamQuestion, { kind: 'word-order' }>; onAnswer: (a: ExamAnswer) => void }) {
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
      <PromptLine text="Sắp xếp các từ thành câu đúng." />
      {/* answer line */}
      <div className="mx-auto mb-6 flex min-h-14 max-w-xl flex-wrap items-center justify-center gap-2 rounded-lg bg-white/5 p-3">
        {picked.length === 0 && <span className="text-sm text-slate-500">Bấm các từ bên dưới theo đúng thứ tự</span>}
        {picked.map((tileIndex, slot) => (
          <button
            key={slot}
            type="button"
            data-testid={`exam-slot-${slot}`}
            onClick={() => setPicked((prev) => prev.filter((_, s) => s !== slot))}
            className={`${EXAM_OPTION} !min-h-[48px] px-3 py-2 font-mono text-base ${EXAM_SELECTED}`}
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
            className="min-h-[64px] rounded-lg bg-[#16232e] px-4 py-2.5 font-mono text-lg font-extrabold text-white ring-1 ring-[#22303d] shadow-md transition hover:bg-[#132433] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 active:scale-95"
          >
            {question.tiles[tileIndex]}
          </button>
        ))}
      </div>
      {picked.length > 0 && (
        <button type="button" onClick={() => setPicked([])} className="mx-auto mt-4 block text-sm font-bold text-slate-400 underline">
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
        className={`${BTN_AUDIO} rounded-full px-5 py-3`}
      >
        <IconSpeaker size={18} /> Nghe lại
      </button>
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
}: {
  exam: ExamState;
  result: ReturnType<typeof computeExamResult>;
  arena: ArenaRun;
  gradeId: string;
  gradeLabel: string;
  programId: ExamProgramId;
  studentName?: string;
  onExit: () => void;
}) {
  const myScore = result.points;
  // Arena has no time limit so result.timeUsedSec clamps to 0 - the
  // "faster wins" tie-break needs the REAL elapsed wall-clock time.
  const myTimeMs = Math.max(0, (exam.finishedAtMs ?? Date.now()) - exam.startedAtMs);
  const [duel, setDuel] = useState<ArenaDuelResult | null>(null);
  const [created, setCreated] = useState(false);
  const [failed, setFailed] = useState(false);
  const [newBadges, setNewBadges] = useState<Sticker[]>([]);
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current) return;
    settled.current = true;
    // CR-37: a finished duel (win or loss) feeds the arena badges -
    // guests earn them too, the counters are localStorage-based.
    const settle = (won: boolean) => setNewBadges(recordArenaDuel(won));
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

          {newBadges.length > 0 && (
            <div data-testid="arena-new-badges" className="mt-4 rounded-xl bg-amber-400/15 p-3 text-sm font-extrabold text-amber-200 ring-1 ring-amber-400/40">
              <span className="mr-1 inline-flex items-center"><IconMedal size={16} /></span> Huy hiệu mới: {newBadges.map((b) => `${b.emoji} ${b.nameVi}`).join(' - ')}
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
