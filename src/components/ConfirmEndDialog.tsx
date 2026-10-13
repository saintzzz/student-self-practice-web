import { useRef } from 'react';
import { useModalBehavior } from '../hooks/useModalBehavior';
import { CARD_DARK } from '../lib/ui/tokens';

interface ConfirmEndDialogProps {
  /** Kid-facing heading, e.g. "Kết thúc bài?" */
  title: string;
  /** One-line consequence, e.g. "Em sẽ xem điểm luôn nhé." */
  body: string;
  /** Confirm button label matching the action that opened the dialog. */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * CR-69: centered confirmation for the destructive KẾT THÚC / NỘP BÀI
 * buttons - they used to end the whole session on a single mis-tap.
 * Backdrop tap, Escape, and the "Chơi tiếp" button all cancel.
 * aria-modal="true" is paired with real keyboard modality via
 * useModalBehavior: initial focus on the safe action (the cancel button
 * is the first focusable element), Tab trapped inside, focus restored
 * on close.
 */
export default function ConfirmEndDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmEndDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onCancel);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div ref={dialogRef} className={`${CARD_DARK} w-full max-w-sm text-center`} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl font-extrabold text-amber-300">{title}</h2>
        <p className="mt-2 text-lg text-slate-300">{body}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            data-testid="end-confirm-cancel"
            onClick={onCancel}
            className="min-h-[52px] flex-1 rounded-3xl border-2 border-slate-500/50 font-display text-lg font-extrabold text-slate-300 transition hover:border-slate-400 focus:outline-none focus:ring-4 focus:ring-sky-400/60"
          >
            Chơi tiếp
          </button>
          <button
            type="button"
            data-testid="end-confirm-ok"
            onClick={onConfirm}
            className="min-h-[52px] flex-1 rounded-3xl bg-gradient-to-b from-amber-300 to-amber-500 font-display text-lg font-extrabold text-[#0b1224] transition focus:outline-none focus:ring-4 focus:ring-amber-300/60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
