import { useState } from 'react';
import type { ExamProgramId, ExamQuestion } from '../types/exam';
import {
  computeExamResult,
  examCorrectAnswerText,
  EXAM_POINTS_PER_QUESTION,
  type ExamAnswer,
} from '../lib/exam/examSession';
import { starsForScore } from '../lib/engagement/store';
import Mascot from './Mascot';
import Confetti from './celebrations/Confetti';
import { SendResultsCard } from './SendResultsCard';
import { ShareCard } from './ShareCard';
import { CARD, NAV_PILL, SCORE_PILL_LG } from '../lib/ui/tokens';
import { IconHome, IconPlay } from './icons';

/**
 * kids-UX step 9 (design-kids-ux s3.9, OM-3=C, AC-7.1): the exam results
 * screen is the "full brand celebration" half of the hybrid ruling - the
 * exam hall interior stays IOE-faithful while results get the navy/gold
 * card, mascot celebration and the "Xong rồi / Chơi tiếp" session fork.
 * Extracted verbatim from ExamScreen, then restyled; all existing
 * data-testids and the answer-review list are unchanged.
 */

/** CR-24: program display names (shared with the exam header/intro). */
export const PROGRAM_LABEL: Record<ExamProgramId, string> = {
  english: 'Tiếng Anh',
  math: 'Toán tiếng Anh',
  science: 'Khoa học',
};

/** The one gold element on this screen (concept budget rule): the fork's
 *  "Chơi tiếp". Same pill geometry as NAV_PILL so the fork reads as a pair. */
const FORK_GOLD =
  'inline-flex min-h-[76px] flex-1 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 text-xl font-extrabold text-amber-950 shadow-md transition hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 motion-reduce:transition-none';

/**
 * CR-40: IOE bank strings carry literal `<u>underline</u>` markup for the
 * "underlined part" pronunciation questions. Render it as real underlines
 * instead of leaking raw tags. Shared by the exam interior (imported back
 * into ExamScreen) and the answer-review list below.
 */
export function MarkupText({ text }: { text: string }) {
  const parts = text.split(/(<u>.*?<\/u>)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('<u>') && p.endsWith('</u>') ? (
          <u key={i}>{p.slice(3, -4)}</u>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** First name only for the share card (privacy matrix: first name + grade,
 *  no surname). Mirrors GradeSelect's "Bé" handling. */
function shareFirstName(displayName: string): string {
  const stripped = displayName.trim().replace(/^bé\s+/i, '');
  const first = stripped.split(/\s+/).pop() ?? stripped;
  return `Bé ${first}`;
}

export function ExamResult({
  result,
  programId,
  gradeLabel,
  isPractice,
  studentName,
  onExit,
  onRetry,
}: {
  result: ReturnType<typeof computeExamResult>;
  programId: ExamProgramId;
  gradeLabel: string;
  isPractice: boolean;
  /** Display name -> first-name-only share card (PII-minimized). */
  studentName?: string;
  onExit: () => void;
  /** CR-28: hidden when the review queue is drained (nothing to retry). */
  onRetry?: () => void;
}) {
  const mm = Math.floor(result.timeUsedSec / 60);
  const ss = result.timeUsedSec % 60;
  const wrong = result.review.filter((r) => !r.isCorrect);
  const [showReview, setShowReview] = useState(false);
  const passed = result.correctCount / Math.max(1, result.answeredCount) >= 0.8;
  // Stars emphasis (kids-UX): the 0-3 star scale kids already know from
  // round summaries, computed from the same points ratio. Points stay the
  // headline - R-08 keeps the IOE convention parents read.
  const stars = starsForScore(result.points, Math.max(1, result.totalCount * EXAM_POINTS_PER_QUESTION));

  const shareTitle = studentName ? `${shareFirstName(studentName)} - ${gradeLabel}` : `English Arena - ${gradeLabel}`;
  const shareLines = [
    `${isPractice ? 'Luyện đề' : 'Thi thử'} ${PROGRAM_LABEL[programId]}: ${result.points} điểm`,
    `${result.correctCount}/${result.totalCount} câu đúng`,
  ];

  return (
    <div data-testid="exam-result" className="min-h-screen bg-[#0d1b26] p-4 text-white">
      <div className="mx-auto max-w-2xl">
        {/* Brand celebration: navy CARD replaces the wooden exam frame. */}
        <div className={`${CARD} relative text-center`}>
          {passed && <Confetti />}
          <div className="flex justify-center">
            <Mascot mood={passed ? 'celebrating' : 'encouraging'} />
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-amber-300">{isPractice ? 'Kết quả luyện đề' : 'Kết quả thi thử'}</h1>
          <p className="mt-1 text-sm font-bold text-slate-400">
            {PROGRAM_LABEL[programId]} - {gradeLabel}
          </p>
          <div className="mt-5">
            <span className={SCORE_PILL_LG}>{result.points} điểm</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2" role="img" aria-label={`Em được ${stars} trên 3 sao`}>
            {[0, 1, 2].map((slot) => (
              <span key={slot} aria-hidden="true" className={`text-4xl ${slot < stars ? 'text-amber-300' : 'text-white/20'}`}>
                {slot < stars ? '★' : '☆'}
              </span>
            ))}
          </div>
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
              className={`${NAV_PILL} flex-1`}
            >
              Xem đáp án ({wrong.length} câu sai)
            </button>
            {onRetry && (
              <button
                type="button"
                data-testid="exam-retry"
                onClick={onRetry}
                className={`${NAV_PILL} flex-1`}
              >
                {isPractice ? 'Luyện lại' : 'Thi lại'}
              </button>
            )}
          </div>

          {/* Session fork (design s3.10) replaces the old "Thoát" button:
              "Chơi tiếp" retries the same program/mode (the only gold
              element), "Xong rồi" exits to the launchpad. */}
          <p className="mt-6 text-base font-bold text-slate-300">Em muốn làm gì tiếp?</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onExit} className={`${NAV_PILL} flex-1`}>
              <span className="inline-flex items-center gap-2"><IconHome size={18} /> Xong rồi</span>
            </button>
            {onRetry && (
              <button type="button" data-testid="exam-play-again" onClick={onRetry} className={FORK_GOLD}>
                <span className="inline-flex items-center gap-2"><IconPlay size={18} /> Chơi tiếp</span>
              </button>
            )}
          </div>

          <SendResultsCard />
          {/* Dev-review #1/#2: ShareCard owns its own privacy - null for
              guests, ParentGate + live-token re-check for signed-in
              viewers. No wrapper state needed here. */}
          <div className="mt-4">
            <ShareCard title={shareTitle} lines={shareLines} label="Chia sẻ thành tích" />
          </div>
        </div>

        {/* Answer review list - unchanged (IOE fidelity of the review). */}
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
                <div className="mt-1 font-mono text-sm text-slate-100"><MarkupText text={reviewPrompt(item.question)} /></div>
                <div className="mt-2 text-sm">
                  <span className="font-bold text-slate-300">Đáp án đúng: </span>
                  <span className="font-extrabold text-emerald-300"><MarkupText text={examCorrectAnswerText(item.question)} /></span>
                </div>
                {!item.isCorrect && (
                  <div className="mt-1 text-sm">
                    <span className="font-bold text-slate-300">Em chọn: </span>
                    <span className="text-rose-300"><MarkupText text={answerText(item.answer, item.question)} /></span>
                  </div>
                )}
                {item.question.explanation && (
                  <div className="mt-1 text-xs text-slate-400"><MarkupText text={item.question.explanation} /></div>
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
