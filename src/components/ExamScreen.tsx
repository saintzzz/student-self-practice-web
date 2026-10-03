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
  EXAM_QUESTION_COUNT,
  PRACTICE_QUESTION_COUNT,
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
import { skillKeyFor } from '../lib/engagement/skills';
import { saveExamResult } from '../lib/practiceResults';
import { captureExamWrongAnswers } from '../lib/exam/examSession';
import { EmojiVisual } from './EmojiVisual';
import { WORD_IPA } from '../data/ipaMap';

/**
 * CR-24 - IOE-style Thi thử player. Visual language follows the real
 * ioe.vn exam: dark chalkboard in a wooden frame, numbered question
 * strip (10/page), top countdown, SUBMIT button, no per-question
 * verdict (exam conditions). 200 questions / 30 minutes by default.
 */

export const PROGRAM_LABEL: Record<ExamProgramId, string> = {
  english: 'Tiếng Anh',
  math: 'Toán tiếng Anh',
  science: 'Khoa học',
};

const STRIP_PAGE = 10;

interface ExamScreenProps {
  programId: ExamProgramId;
  gradeId: string;
  gradeLabel: string;
  studentName?: string;
  /** CR-25: 'exam' = IOE mock (200q/30min); 'practice' = drill (20q, instant
   *  verdicts). CR-28: 'review' = practice-style session over the due
   *  spaced-repetition queue (pulled fresh at begin()). */
  mode: 'exam' | 'practice' | 'review';
  onExit: () => void;
}

export default function ExamScreen({ programId, gradeId, gradeLabel, studentName, mode, onExit }: ExamScreenProps) {
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

  // 1s heartbeat for the countdown + auto-submit on expiry (exam mode only).
  useEffect(() => {
    if (isPractice || !exam || exam.finishedAtMs !== null) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [exam, isPractice]);

  useEffect(() => {
    if (!isPractice && exam && exam.finishedAtMs === null && remainingSeconds(exam, now) <= 0) {
      setExam((current) => (current ? submitExam(current, Date.now()) : current));
    }
  }, [exam, now, isPractice]);

  const result = useMemo(
    () => (exam && exam.finishedAtMs !== null ? computeExamResult(exam) : null),
    [exam],
  );

  // CR-27: record the mode-complete quest once per finished exam instance
  // (ref guard keeps StrictMode double-effects from double-marking).
  const questRecordedFor = useRef<ExamState | null>(null);
  useEffect(() => {
    if (!exam || !result || questRecordedFor.current === exam) return;
    questRecordedFor.current = exam;
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
      });
    }
  }, [exam, result, isPractice, isReview, gradeId, programId]);

  function begin(): void {
    const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
        finishedAtMs: null,
      });
    } else {
      const count = isPractice ? PRACTICE_QUESTION_COUNT : EXAM_QUESTION_COUNT;
      setExam(createExam(programId, gradeId, seed, Date.now(), count));
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
      setExam(answerCurrent(exam, answer));
      setVerdict({ isCorrect });
      playSfx(isCorrect ? 'correct' : 'wrong');
      // CR-27: count at answer time - correct answers land on the day
      // they were earned even if the session crosses midnight.
      if (isCorrect && !creditedRef.current.has(exam.currentIndex)) {
        creditedRef.current.add(exam.currentIndex);
        recordCorrectAnswers(1);
      }
      // CR-29: parent-report stats - one entry per answered question.
      if (!creditedRef.current.has(`s${exam.currentIndex}`)) {
        creditedRef.current.add(`s${exam.currentIndex}`);
        recordSkillAnswer(gradeId, skillKeyFor(question), isCorrect);
      }
      // CR-28: review mode advances/resets the item's stage; a normal
      // drill instead captures the wrong question for future review.
      if (isReview) recordReviewOutcome(gradeId, question.id, isCorrect);
      else if (!isCorrect) recordWrongExamQuestion(gradeId, question);
      return;
    }
    if (!exam) return;
    const currentQuestion = exam.questions[exam.currentIndex];
    if (!currentQuestion) return;
    // CR-27: same at-answer counting in exam mode (no verdict shown,
    // but the quest still credits the correct answer immediately).
    const examCorrect = isExamAnswerCorrect(currentQuestion, answer);
    if (examCorrect && !creditedRef.current.has(exam.currentIndex)) {
      creditedRef.current.add(exam.currentIndex);
      recordCorrectAnswers(1);
    }
    // CR-29: skill stats per answer; a re-answer during review does not
    // double-count - the stats reflect the FIRST answer, matching what
    // a real exam score sheet records.
    if (!creditedRef.current.has(`s${exam.currentIndex}`)) {
      creditedRef.current.add(`s${exam.currentIndex}`);
      recordSkillAnswer(gradeId, skillKeyFor(currentQuestion), examCorrect);
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
    return <ExamIntro programId={programId} gradeLabel={gradeLabel} isPractice={isPractice} isReview={isReview} reviewCount={reviewCount} onBegin={begin} onExit={onExit} />;
  }

  if (result) {
    // CR-28: after a review session the queue may be fully rescheduled -
    // a retry with zero due items would have nothing to render.
    const canRetry = !isReview || getDueReviewItems(gradeId).length > 0;
    return <ExamResult result={result} programId={programId} gradeLabel={gradeLabel} isPractice={isPractice} onExit={onExit} onRetry={canRetry ? begin : undefined} />;
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
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold tracking-wide text-sky-200 sm:text-lg">
            {isReview ? 'Ôn lại câu sai' : isPractice ? 'Luyện đề' : 'Thi thử'} - {isReview ? gradeLabel : `${PROGRAM_LABEL[programId]} - ${gradeLabel}`}
          </div>
          {studentName && <div className="truncate text-xs font-bold text-slate-400">{studentName}</div>}
        </div>
        {isPractice ? (
          <div data-testid="exam-progress" className="shrink-0 rounded-lg bg-[#0a1520] px-3 py-1 text-lg font-extrabold text-amber-300">
            Câu {exam.currentIndex + 1}/{exam.questions.length}
          </div>
        ) : (
          <div
            data-testid="exam-timer"
            className={`shrink-0 rounded-lg px-3 py-1 font-mono text-xl font-extrabold tabular-nums sm:text-2xl ${
              left <= 60 ? 'animate-pulse bg-rose-600 text-white' : 'bg-[#0a1520] text-amber-300'
            }`}
          >
            ⏰ {mm}:{ss}
          </div>
        )}
        <button
          type="button"
          data-testid="exam-submit"
          onClick={() => setExam((c) => (c ? submitExam(c, Date.now()) : c))}
          className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-sm font-extrabold tracking-wide text-white shadow-md transition hover:bg-sky-500 active:scale-95"
        >
          {isPractice ? 'KẾT THÚC' : 'NỘP BÀI'}
        </button>
      </header>

      {/* Question number strip - exam only; practice is sequential. */}
      {!isPractice && (
        <div className="flex items-center gap-1 overflow-x-auto bg-[#132433] px-2 py-1.5">
          <button
            type="button"
            aria-label="Trước"
            disabled={stripOffset === 0}
            onClick={() => setStripOffset(Math.max(0, stripOffset - STRIP_PAGE))}
            className="shrink-0 rounded-md bg-amber-500/90 px-2 py-1 text-sm font-extrabold text-amber-950 disabled:opacity-30"
          >
            ◀
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {stripQuestions.map((q, i) => {
              const index = stripOffset + i;
              const isCurrent = index === exam.currentIndex;
              const answered = answeredSet[index] !== null && answeredSet[index] !== undefined;
              return (
                <button
                  key={q.id}
                  type="button"
                  data-testid={`exam-nav-${index}`}
                  onClick={() => jump(index)}
                  className={`h-8 w-8 shrink-0 rounded-md text-sm font-extrabold transition sm:h-9 sm:w-9 ${
                    isCurrent
                      ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                      : answered
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-300 text-amber-950 hover:bg-amber-200'
                  }`}
                >
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
            className="shrink-0 rounded-md bg-amber-500/90 px-2 py-1 text-sm font-extrabold text-amber-950 disabled:opacity-30"
          >
            ▶
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
              {verdict.isCorrect ? 'Chính xác! 🎉' : 'Chưa đúng rồi.'}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-200">
              Đáp án đúng: <span className="font-extrabold text-emerald-300">{examCorrectAnswerText(question)}</span>
            </div>
            {question.explanation && <div className="mt-1 text-sm text-slate-300">{question.explanation}</div>}
            <button
              type="button"
              data-testid="practice-next"
              onClick={practiceNext}
              className="mt-3 w-full rounded-lg bg-amber-400 px-4 py-2.5 font-extrabold text-amber-950 transition hover:bg-amber-300 active:scale-95 sm:w-auto"
            >
              {isLastQuestion ? 'Xem kết quả →' : 'Câu tiếp theo →'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function ExamIntro({ programId, gradeLabel, isPractice, isReview, reviewCount, onBegin, onExit }: { programId: ExamProgramId; gradeLabel: string; isPractice: boolean; isReview?: boolean; reviewCount?: number; onBegin: () => void; onExit: () => void }) {
  const title = isReview ? `Ôn lại câu sai - ${gradeLabel}` : `${isPractice ? 'Luyện đề' : 'Thi thử'} - ${PROGRAM_LABEL[programId]}`;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1b26] p-4 text-white">
      <div className="w-full max-w-lg rounded-2xl border-8 border-amber-800/70 bg-[#16232e] p-6 text-center shadow-2xl sm:p-10">
        <div className="mb-2 text-5xl">{isReview ? '📚' : isPractice ? '✏️' : '📝'}</div>
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
          ) : isPractice ? (
            <>
              <li>• {PRACTICE_QUESTION_COUNT} câu hỏi giống dạng đề thi thật</li>
              <li>• Chữa từng câu ngay - có đáp án + giải thích + phiên âm</li>
              <li>• Không giới hạn thời gian, cứ làm từ từ nhé</li>
            </>
          ) : (
            <>
              <li>• 200 câu hỏi - làm trong 30 phút</li>
              <li>• Bấm số câu để nhảy tới câu bất kỳ, làm xong quay lại sửa được</li>
              <li>• Không hiện đúng/sai trong lúc thi - đúng như thi thật</li>
              <li>• Hết giờ tự động nộp bài</li>
            </>
          )}
        </ul>
        {(!isReview || (reviewCount ?? 0) > 0) && (
          <button
            type="button"
            data-testid="exam-begin"
            onClick={onBegin}
            className="mt-6 w-full rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-lg font-extrabold text-amber-950 shadow-lg transition hover:-translate-y-0.5 active:scale-95"
          >
            {isReview ? 'Bắt đầu ôn' : isPractice ? 'Bắt đầu luyện' : 'Bắt đầu làm bài'}
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

function ExamQuestionView({
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
          <PromptLine text={question.kind === 'odd-pronunciation' ? 'Chọn từ có phát âm khác với 3 từ còn lại.' : question.prompt} />
          <OptionButtons options={question.options} selected={answer?.type === 'option' ? answer.index : null} onPick={(i) => onAnswer({ type: 'option', index: i })} ipa={question.kind === 'odd-pronunciation'} />
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
                className={`rounded-xl px-10 py-4 text-lg font-extrabold transition active:scale-95 ${
                  answer?.type === 'bool' && answer.value === v
                    ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                    : 'bg-amber-300 text-amber-950 hover:bg-amber-200'
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
                className="h-14 w-14 rounded-xl bg-amber-300 text-2xl font-extrabold uppercase text-amber-950 shadow-md transition hover:bg-amber-200 active:scale-95"
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

function PromptLine({ text }: { text: string }) {
  return <div className="mx-auto mb-6 max-w-xl text-center font-mono text-lg leading-relaxed text-slate-100 sm:text-2xl">{text}</div>;
}

function OptionButtons({
  options,
  selected,
  onPick,
  ipa,
}: {
  options: readonly string[];
  selected: number | null;
  onPick: (index: number) => void;
  ipa?: boolean;
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
          className={`rounded-xl px-4 py-4 text-left font-mono text-lg font-bold transition active:scale-95 ${
            selected === i
              ? 'bg-orange-500 text-white ring-2 ring-orange-300'
              : 'bg-[#22303d] text-slate-100 ring-1 ring-white/10 hover:bg-[#2a3a4a]'
          }`}
        >
          <span className="mr-2 font-extrabold text-amber-400">{labels[i]}.</span>
          {option}
          {ipa && WORD_IPA[option.toLowerCase()] && (
            <span className="ml-2 text-sm font-normal text-sky-300">/{WORD_IPA[option.toLowerCase()]}/</span>
          )}
        </button>
      ))}
    </div>
  );
}

function TextInputView({ prompt, hint, ipa, onSubmit }: { prompt: string; hint: string; ipa?: string; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <PromptLine text={prompt} />
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

function WordOrderView({ question, onAnswer }: { question: Extract<ExamQuestion, { kind: 'word-order' }>; onAnswer: (a: ExamAnswer) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const remaining = question.tiles.map((_, i) => i).filter((i) => !picked.includes(i));

  function pick(i: number) {
    setPicked((prev) => {
      if (prev.includes(i)) return prev;
      const next = [...prev, i];
      if (next.length === question.tiles.length) {
        onAnswer({ type: 'order', indices: next });
      }
      return next;
    });
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
            className="rounded-lg bg-emerald-600 px-3 py-2 font-mono text-base font-bold text-white shadow"
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
            className="rounded-lg bg-amber-300 px-4 py-2.5 font-mono text-lg font-extrabold text-amber-950 shadow-md transition hover:bg-amber-200 active:scale-95"
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
        className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-base font-extrabold text-white shadow-lg transition hover:bg-orange-400 active:scale-95"
      >
        🔊 Nghe lại
      </button>
    </div>
  );
}

function ExamResult({
  result,
  programId,
  gradeLabel,
  isPractice,
  onExit,
  onRetry,
}: {
  result: ReturnType<typeof computeExamResult>;
  programId: ExamProgramId;
  gradeLabel: string;
  isPractice: boolean;
  onExit: () => void;
  /** CR-28: hidden when the review queue is drained (nothing to retry). */
  onRetry?: () => void;
}) {
  const mm = Math.floor(result.timeUsedSec / 60);
  const ss = result.timeUsedSec % 60;
  const wrong = result.review.filter((r) => !r.isCorrect);
  const [showReview, setShowReview] = useState(false);

  return (
    <div data-testid="exam-result" className="min-h-screen bg-[#0d1b26] p-4 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border-8 border-amber-800/70 bg-[#16232e] p-6 text-center sm:p-10">
          <div className="text-5xl">{result.correctCount / Math.max(1, result.answeredCount) >= 0.8 ? '🏆' : '💪'}</div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-amber-300">{isPractice ? 'Kết quả luyện đề' : 'Kết quả thi thử'}</h1>
          <p className="mt-1 text-sm font-bold text-slate-400">
            {PROGRAM_LABEL[programId]} - {gradeLabel}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/5 p-3">
              <div data-testid="exam-score" className="text-3xl font-extrabold text-amber-300">{result.points}</div>
              <div className="text-xs font-bold text-slate-400">điểm</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-3xl font-extrabold text-emerald-400">
                {result.correctCount}/{result.totalCount}
              </div>
              <div className="text-xs font-bold text-slate-400">câu đúng</div>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <div className="text-3xl font-extrabold text-sky-300">
                {mm}:{String(ss).padStart(2, '0')}
              </div>
              <div className="text-xs font-bold text-slate-400">thời gian</div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              data-testid="exam-review-toggle"
              onClick={() => setShowReview(!showReview)}
              className="flex-1 rounded-xl bg-sky-600 px-4 py-3 font-extrabold text-white transition hover:bg-sky-500"
            >
              Xem đáp án ({wrong.length} câu sai)
            </button>
            {onRetry && (
              <button
                type="button"
                data-testid="exam-retry"
                onClick={onRetry}
                className="flex-1 rounded-xl bg-amber-400 px-4 py-3 font-extrabold text-amber-950 transition hover:bg-amber-300"
              >
                {isPractice ? 'Luyện lại' : 'Thi lại'}
              </button>
            )}
            <button
              type="button"
              onClick={onExit}
              className="flex-1 rounded-xl border border-slate-500/60 px-4 py-3 font-bold text-slate-300 transition hover:bg-white/5"
            >
              Thoát
            </button>
          </div>
        </div>

        {showReview && (
          <div data-testid="exam-review" className="mt-4 space-y-3 pb-10">
            {result.review.map((item) => (
              <div
                key={item.index}
                className={`rounded-xl border-l-4 p-4 text-left ${
                  item.isCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'
                }`}
              >
                <div className="text-xs font-bold text-slate-400">Câu {item.index + 1}</div>
                <div className="mt-1 font-mono text-sm text-slate-100">{reviewPrompt(item.question)}</div>
                <div className="mt-2 text-sm">
                  <span className="font-bold text-slate-300">Đáp án đúng: </span>
                  <span className="font-extrabold text-emerald-300">{examCorrectAnswerText(item.question)}</span>
                </div>
                {!item.isCorrect && (
                  <div className="mt-1 text-sm">
                    <span className="font-bold text-slate-300">Em chọn: </span>
                    <span className="text-rose-300">{answerText(item.answer, item.question)}</span>
                  </div>
                )}
                {item.question.explanation && (
                  <div className="mt-1 text-xs text-slate-400">{item.question.explanation}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function reviewPrompt(q: ExamQuestion): string {
  switch (q.kind) {
    case 'word-order':
      return `Sắp xếp: ${q.tiles.join(' / ')}`;
    case 'true-false-reading':
      return `${q.passage} - "${q.statement}"`;
    case 'grammar-mcq':
    case 'odd-pronunciation':
      return q.kind === 'grammar-mcq' ? q.prompt : `Phát âm khác: ${q.options.join(' / ')}`;
    case 'missing-letter':
      return q.displaySentence;
    case 'text-answer':
      return q.displaySentence;
    case 'image-choice':
      return `${q.emoji} - chọn từ đúng`;
    case 'listening-sentence-fill-blank':
      return q.displaySentence;
    case 'listening-fill-blank':
      return 'Nghe và viết lại từ';
    case 'extra-letter':
      return `Tìm chữ thừa trong: ${q.displayLetters.join('')}`;
    default:
      return '';
  }
}

function answerText(answer: ExamAnswer | null, q: ExamQuestion): string {
  if (!answer) return '(bỏ qua)';
  switch (answer.type) {
    case 'option': {
      if (q.kind === 'extra-letter') return String(q.displayLetters[answer.index] ?? '?');
      const qo = q as { options?: readonly string[] };
      return qo.options?.[answer.index] ?? `lựa chọn ${answer.index}`;
    }
    case 'text':
      return answer.text || '(trống)';
    case 'bool':
      return answer.value ? 'True' : 'False';
    case 'order': {
      if (q.kind === 'word-order') return answer.indices.map((i) => q.tiles[i]).join(' ');
      return '';
    }
  }
}
