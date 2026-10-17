import { useRef } from 'react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import {
  BTN_PAPER_ACTION,
  EXAM_NAV_CELL_PAPER,
  EXAM_SHEET,
  EXAM_SHEET_BTN,
  TYPE_BODY_PAPER,
  TYPE_SECTION_PAPER,
} from '../../lib/ui/tokens';
import { IconFlag } from '../icons';

export interface ExamReviewSheetProps {
  total: number;
  /** Question indexes still unanswered. */
  unanswered: readonly number[];
  /** Question indexes the student flagged. */
  flagged: readonly number[];
  /** Jump to a question and close the sheet. */
  onJump: (index: number) => void;
  /** "Quay lại làm tiếp" - first focusable (safe default focus). */
  onBack: () => void;
  /** "Nộp bài" - final submit. */
  onSubmit: () => void;
}

/**
 * CR-82 M5 (ARCHITECTURE s4.7, D-13): review-before-submit sheet for the
 * timed exam sitting, replacing the generic confirm dialog. A real
 * exam's "check your answers" moment - counts, unanswered + flagged
 * jump chips, then the non-gold NỘP BÀI action (N1: no gold inside the
 * timed sitting). Timer expiry auto-submits regardless; the parent
 * closes this sheet when finishedAtMs lands.
 */
export function ExamReviewSheet({ total, unanswered, flagged, onJump, onBack, onSubmit }: ExamReviewSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onBack);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Kiểm tra bài trước khi nộp"
        data-testid="exam-review-sheet"
        className={`${EXAM_SHEET} max-h-[80vh] !flex-none overflow-y-auto`}
      >
        <h2 className={TYPE_SECTION_PAPER}>Kiểm tra bài trước khi nộp</h2>
        <p className={`mt-2 ${TYPE_BODY_PAPER}`} data-testid="exam-review-counts">
          Đã làm: {total - unanswered.length}/{total} - Chưa làm: {unanswered.length} - Đã đánh dấu:{' '}
          {flagged.length}
        </p>

        {/* Actions sit first in DOM order: "Quay lại làm tiếp" is the
            first focusable -> the modal's safe default focus (NỘP BÀI
            must never be the accidental Enter target, s4.7). */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            data-testid="exam-review-back"
            onClick={onBack}
            className={`${EXAM_SHEET_BTN} flex-1 text-base`}
          >
            Quay lại làm tiếp
          </button>
          <button
            type="button"
            data-testid="exam-review-submit"
            onClick={onSubmit}
            className={`${BTN_PAPER_ACTION} min-h-[48px] flex-1 text-base`}
          >
            Nộp bài
          </button>
        </div>

        {unanswered.length === 0 ? (
          <p className={`mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-800 ring-1 ring-emerald-200`}>
            Em đã làm hết các câu rồi.
          </p>
        ) : (
          <div className="mt-4">
            <p className={`font-bold ${TYPE_BODY_PAPER}`}>Câu chưa làm - bấm để quay lại:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {unanswered.map((index) => (
                <button
                  key={index}
                  type="button"
                  data-testid={`exam-review-jump-${index}`}
                  onClick={() => onJump(index)}
                  className={`${EXAM_NAV_CELL_PAPER} flex items-center justify-center font-bold transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {flagged.length > 0 && (
          <div className="mt-4">
            <p className={`font-bold ${TYPE_BODY_PAPER}`}>
              <IconFlag size={14} aria-hidden="true" className="mr-1 inline-block" />
              Câu đã đánh dấu:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {flagged.map((index) => (
                <button
                  key={index}
                  type="button"
                  /* distinct id - a flagged-but-unanswered question would
                     otherwise collide with the unanswered chip above */
                  data-testid={`exam-review-flag-${index}`}
                  onClick={() => onJump(index)}
                  className={`${EXAM_NAV_CELL_PAPER} flex items-center justify-center font-bold transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
