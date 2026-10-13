import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { InstructionSpeaker } from './InstructionSpeaker';
import { SHEET, BTN_PAPER_SECONDARY } from '../lib/ui/tokens';

interface ExploreSheetProps {
  open: boolean;
  onClose: () => void;
  /** Focus returns to this element on every close path (AC-2.3). */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** G1-2 autoplay for the header speaker (AC-1.3). */
  speakerAutoplay?: boolean;
  speakerKey?: string;
  children: ReactNode;
}

/**
 * kids-UX (design-kids-ux §3.1.c): the "Khám phá" map-pouch bottom sheet.
 * All secondary choices live here so the launchpad keeps ONE gold action.
 * Close paths: "Đóng" button, backdrop tap, Escape. Focus moves into the
 * sheet on open, Tab is trapped while open, and focus returns to the
 * opener on close - same keyboard-modality contract as ConfirmEndDialog.
 * Rendered through a portal so `position: fixed` is never clipped by an
 * ancestor transform (SCREEN_ENTER).
 */
export default function ExploreSheet({
  open,
  onClose,
  returnFocusRef,
  speakerAutoplay = false,
  speakerKey,
  children,
}: ExploreSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  // Effect runs only when `open` flips; onClose identity changes every
  // parent render, so it is read through a ref instead of a dep.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const focusTimer = window.setTimeout(() => sheetRef.current?.focus(), 0);

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      /* Dev-review #11: initial focus is the sheet container itself
         (tabIndex=-1, outside the tabbable list) - plain Tab/Shift+Tab
         would escape into the page behind the portal. Route focus back
         inside whenever the active element is not a listed control. */
      const active = document.activeElement;
      const insideList = active instanceof HTMLElement && focusable.includes(active);
      if (!insideList) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        data-testid="explore-backdrop"
        aria-hidden="true"
        onClick={() => onCloseRef.current()}
        className="fixed inset-0 z-40 bg-[#0b1224]/70"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="explore-sheet-title"
        tabIndex={-1}
        data-testid="explore-sheet"
        className={`${SHEET} animate-screen-enter p-4 focus:outline-none motion-reduce:animate-none sm:p-6`}
      >
        <div className="mx-auto max-w-xl">
          <header className="flex items-center justify-between gap-2">
            <h2
              id="explore-sheet-title"
              className="font-display text-xl font-bold tracking-tight text-slate-800"
            >
              🗺️ Khám phá
            </h2>
            <div className="flex items-center gap-2">
              <InstructionSpeaker
                text="Chọn một góc để khám phá nhé!"
                lang="vi-VN"
                autoplay={speakerAutoplay}
                autoplayKey={speakerKey ?? 'explore-sheet'}
              />
              <button
                type="button"
                data-testid="explore-close"
                onClick={() => onCloseRef.current()}
                className={BTN_PAPER_SECONDARY}
              >
                Đóng
              </button>
            </div>
          </header>
          <div className="mt-3 space-y-3 pb-4">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  );
}
