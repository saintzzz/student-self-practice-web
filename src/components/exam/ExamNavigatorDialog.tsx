import { useRef } from 'react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import {
  EXAM_NAV_ANSWERED_PAPER,
  EXAM_NAV_CELL_PAPER,
  EXAM_NAV_FLAGGED,
  EXAM_SHEET,
  EXAM_SHEET_BTN,
  TYPE_BODY_PAPER,
  TYPE_SECTION_PAPER,
} from '../../lib/ui/tokens';
import { IconCheck, IconFlag } from '../icons';

export interface ExamNavigatorDialogProps {
  total: number;
  currentIndex: number;
  answered: ReadonlyArray<boolean>;
  flagged: ReadonlySet<number>;
  /** Jump to a question and close the dialog. */
  onJump: (index: number) => void;
  onClose: () => void;
}

/**
 * CR-82 M5 (ARCHITECTURE s4.6, spec s10.3 "Tất cả câu"): paper question
 * navigator for the timed exam sitting - a printable-style grid over the
 * desk. 48px cells for kid hands, 5/10-col responsive grid, modal
 * behaviour shared with every other dialog (focus trap, Escape, restore
 * to `exam-nav-open`).
 */
export function ExamNavigatorDialog({
  total,
  currentIndex,
  answered,
  flagged,
  onJump,
  onClose,
}: ExamNavigatorDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tất cả câu hỏi"
        data-testid="exam-navigator"
        className={`${EXAM_SHEET} max-h-[70vh] !flex-none overflow-y-auto`}
      >
        <h2 className={TYPE_SECTION_PAPER}>Tất cả câu hỏi</h2>

        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: total }, (_, index) => {
            const isCurrent = index === currentIndex;
            const isAnswered = answered[index] === true;
            const isFlagged = flagged.has(index);
            return (
              <button
                key={index}
                type="button"
                data-testid={`exam-navigator-cell-${index}`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Câu ${index + 1}${isAnswered ? ' - đã trả lời' : ''}${isFlagged ? ' - đã đánh dấu' : ''}${isCurrent ? ' - đang làm' : ''}`}
                onClick={() => onJump(index)}
                className={`${EXAM_NAV_CELL_PAPER} relative flex items-center justify-center font-bold transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 motion-reduce:transition-none ${
                  isAnswered ? EXAM_NAV_ANSWERED_PAPER : ''
                } ${isFlagged ? `ring-2 ${EXAM_NAV_FLAGGED}` : ''} ${isCurrent ? 'ring-2 !ring-sky-600' : ''}`}
              >
                {isAnswered ? (
                  <IconCheck size={16} aria-hidden="true" className="absolute left-0.5 top-0.5" />
                ) : null}
                {isFlagged ? (
                  <IconFlag size={12} aria-hidden="true" className="absolute right-0.5 top-0.5" />
                ) : null}
                {index + 1}
              </button>
            );
          })}
        </div>

        {/* Legend - icon + text, never color-alone. */}
        <div className={`mt-5 flex flex-wrap gap-4 ${TYPE_BODY_PAPER}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className={`${EXAM_NAV_CELL_PAPER} ${EXAM_NAV_ANSWERED_PAPER} !h-6 !w-6 flex items-center justify-center`}>
              <IconCheck size={12} aria-hidden="true" />
            </span>
            Đã trả lời
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`${EXAM_NAV_CELL_PAPER} ${EXAM_NAV_FLAGGED} !h-6 !w-6 flex items-center justify-center`}>
              <IconFlag size={10} aria-hidden="true" />
            </span>
            Đã đánh dấu
          </span>
        </div>

        {/* Shortcut list footer (s4.6). */}
        <p className={`mt-4 border-t border-slate-200 pt-3 text-xs ${TYPE_BODY_PAPER}`}>
          Phím tắt: 1-4 hoặc A-D chọn đáp án - Mũi tên đổi câu - F đánh dấu - N mở bảng này
        </p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            data-testid="exam-navigator-close"
            onClick={onClose}
            className={EXAM_SHEET_BTN}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
