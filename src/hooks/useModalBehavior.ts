import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, [tabindex]:not([tabindex="-1"])';

/**
 * kids-UX step 5 (ADR KUX-3): shared modal behaviour extracted from
 * ConfirmEndDialog so every overlay (ParentGate, sheets, share preview)
 * gets the same WAI-ARIA modal contract for free:
 *
 *  - initial focus lands on the first enabled focusable element inside
 *    `dialogRef` (matching ConfirmEndDialog's old cancelRef focus - the
 *    cancel button is first in its DOM order);
 *  - Escape invokes `onClose`;
 *  - Tab / Shift+Tab cycle inside the dialog (focus trap);
 *  - on unmount, focus returns to whatever had it before the modal
 *    opened.
 *
 * `onClose` is read through a ref so inline arrow props do not tear down
 * and re-arm the trap (and re-steal focus) on every parent re-render -
 * a real hazard now that modals host interactive content like the
 * ParentGate keypad.
 *
 * The hook deliberately owns ONLY this behaviour - backdrop styling,
 * dialog markup and buttons stay in each component.
 */
export function useModalBehavior(
  dialogRef: React.RefObject<HTMLElement>,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const first = dialogRef.current
      ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(
          (el) => !el.hasAttribute('disabled'),
        )
      : undefined;
    first?.focus();

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const firstEl = focusable[0]!;
      const lastEl = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      /* Dev-review fix: the focused element may sit OUTSIDE the tabbable
         list (a programmatically-focused container or a tabIndex=-1
         element like ParentGate's question text). In that case neither
         boundary check matches and plain Tab/Shift+Tab would escape the
         dialog - route it back inside instead. */
      const insideList = active instanceof HTMLElement && focusable.includes(active);
      if (!insideList) {
        e.preventDefault();
        (e.shiftKey ? lastEl : firstEl).focus();
      } else if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [dialogRef]);
}
