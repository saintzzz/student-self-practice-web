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
import {
  BTN_SECONDARY_PAPER,
  EXAM_DESK,
  EXAM_SHEET,
  GOLD_HAIRLINE,
  SCORE_PILL_LG,
  TYPE_BODY_PAPER,
  TYPE_HERO_NUMBER_PAPER,
  TYPE_SECTION_PAPER,
} from '../lib/ui/tokens';
import { IconHome, IconPlay } from './icons';

/**
 * kids-UX step 9 (design-kids-ux s3.9, OM-3=C, AC-7.1): the exam results
 * screen is the "full brand celebration" half of the hybrid ruling.
 * CR-82 M5 (spec s10.4): the celebration is a paper CERTIFICATE on the
 * desk - EXAM_SHEET + GOLD_HAIRLINE, TYPE_HERO_NUMBER_PAPER correct
 * count, the gold SCORE_PILL for points, mascot celebrating/encouraging.
 * All existing data-testids and the answer-review list are unchanged.
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

/** Certificate stat tile - the report-sheet depth idiom (gradient face +
 *  inset highlight + soft bottom edge) so the tiles read as printed
 *  boxes on the certificate, not floating flat cards. */
const STAT_TILE =
  'rounded-xl bg-gradient-to-b from-white to-slate-50 p-3 ring-1 ring-slate-200 shadow-[inset_0_1px_0_white,0_3px_0_rgba(15,23,42,0.08)]';

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
  // CR-106: taught rows are ungraded - never counted as "sai" on the
  // review toggle or in the pass ratio (totalCount already excludes them).
  const wrong = result.review.filter((r) => !r.isCorrect && !('bankTaught' in r.question && r.question.bankTaught));
  const [showReview, setShowReview] = useState(false);
  const passed = result.correctCount / Math.max(1, result.totalCount) >= 0.8;
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
    <div data-testid="exam-result" className={`${EXAM_DESK} items-center`}>
      <div className="mx-auto w-full max-w-2xl">
        {/* Paper certificate (s10.4): EXAM_SHEET + GOLD_HAIRLINE. */}
        <div className={`${EXAM_SHEET} ${GOLD_HAIRLINE} relative !flex-none text-center`}>
          {passed && <Confetti />}
          <div className="flex justify-center">
            <Mascot mood={passed ? 'celebrating' : 'encouraging'} />
          </div>
          <h1 className={`mt-2 ${TYPE_SECTION_PAPER}`}>{isPractice ? 'Kết quả luyện đề' : 'Kết quả thi thử'}</h1>
          <p className={`mt-1 text-sm font-bold ${TYPE_BODY_PAPER}`}>
            {PROGRAM_LABEL[programId]} - {gradeLabel}
          </p>
          <div className="mt-5">
            <span className={SCORE_PILL_LG}>{result.points} điểm</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2" role="img" aria-label={`Em được ${stars} trên 3 sao`}>
            {[0, 1, 2].map((slot) => (
              <span key={slot} aria-hidden="true" className={`text-4xl ${slot < stars ? 'text-amber-400' : 'text-slate-300'}`}>
                {slot < stars ? '★' : '☆'}
              </span>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className={STAT_TILE}>
              <div data-testid="exam-score" className={`${TYPE_HERO_NUMBER_PAPER} text-3xl`}>{result.points}</div>
              <div className="text-xs font-bold text-slate-500">điểm</div>
            </div>
            <div className={STAT_TILE}>
              <div className={`${TYPE_HERO_NUMBER_PAPER} text-3xl`}>
                {result.correctCount}/{result.totalCount}
              </div>
              <div className="text-xs font-bold text-slate-500">câu đúng</div>
            </div>
            <div className={STAT_TILE}>
              <div className={`${TYPE_HERO_NUMBER_PAPER} text-3xl`}>
                {mm}:{String(ss).padStart(2, '0')}
              </div>
              <div className="text-xs font-bold text-slate-500">thời gian</div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              data-testid="exam-review-toggle"
              onClick={() => setShowReview(!showReview)}
              className={`${BTN_SECONDARY_PAPER} flex-1`}
            >
              Xem đáp án ({wrong.length} câu sai)
            </button>
            {onRetry && (
              <button
                type="button"
                data-testid="exam-retry"
                onClick={onRetry}
                className={`${BTN_SECONDARY_PAPER} flex-1`}
              >
                {isPractice ? 'Luyện lại' : 'Thi lại'}
              </button>
            )}
          </div>

          {/* Session fork (design s3.10) replaces the old "Thoát" button:
              "Chơi tiếp" retries the same program/mode (the only gold
              element), "Xong rồi" exits to the launchpad. */}
          <p className={`mt-6 text-base font-bold ${TYPE_BODY_PAPER}`}>Em muốn làm gì tiếp?</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onExit} className={`${BTN_SECONDARY_PAPER} flex-1`}>
              <span className="inline-flex items-center gap-2"><IconHome size={18} /> Xong rồi</span>
            </button>
            {onRetry && (
              <button type="button" data-testid="exam-play-again" onClick={onRetry} className={FORK_GOLD}>
                <span className="inline-flex items-center gap-2"><IconPlay size={18} /> Chơi tiếp</span>
              </button>
            )}
          </div>

          <SendResultsCard surface="paper" />
          {/* Dev-review #1/#2: ShareCard owns its own privacy - null for
              guests, ParentGate + live-token re-check for signed-in
              viewers. No wrapper state needed here. */}
          <div className="mt-4">
            <ShareCard title={shareTitle} lines={shareLines} label="Chia sẻ thành tích" surface="paper" />
          </div>
        </div>

        {/* Answer review list on paper (testids unchanged). */}
        {showReview && (
          <div data-testid="exam-review" className="mt-4 space-y-3 pb-10">
            {result.review.map((item) => (
              <div
                key={item.index}
                className={`rounded-xl border-l-4 bg-white p-4 text-left ring-1 ring-slate-200 ${
                  item.isCorrect ? 'border-emerald-600' : 'border-slate-400'
                }`}
              >
                <div className="text-xs font-bold text-slate-500">Câu {item.index + 1}</div>
                <div className="mt-1 text-sm font-semibold text-slate-800"><MarkupText text={reviewPrompt(item.question)} /></div>
                {'bankTaught' in item.question && item.question.bankTaught ? (
                  /* CR-106: a disclosed row was never oracle-scored - no
                     key exists to show, and it was not graded anyway. */
                  <div className="mt-2 text-sm font-bold text-sky-800">Đã học - câu này không tính điểm</div>
                ) : (
                  <>
                <div className="mt-2 text-sm">
                  <span className="font-bold text-slate-700">Đáp án đúng: </span>
                  <span className="font-extrabold text-emerald-800"><MarkupText text={examCorrectAnswerText(item.question)} /></span>
                </div>
                {!item.isCorrect && (
                  <div className="mt-1 text-sm">
                    <span className="font-bold text-slate-700">Em chọn: </span>
                    <span className="text-rose-700"><MarkupText text={answerText(item.answer, item.question)} /></span>
                  </div>
                )}
                {item.question.explanation && (
                  <div className={`mt-1 text-xs ${TYPE_BODY_PAPER}`}><MarkupText text={item.question.explanation} /></div>
                )}
                  </>
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
