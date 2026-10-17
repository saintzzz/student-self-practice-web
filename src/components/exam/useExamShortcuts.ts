import { useEffect } from 'react';

export interface ExamShortcutHandlers {
  /** Number keys / letter keys pick option i (0-based). */
  onPickOption: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFlag: () => void;
  onOpenNavigator: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}

/**
 * CR-82 M5 (D-18): keyboard shortcuts for the timed exam sitting -
 * `1-4`/`A-D` pick an option, ArrowLeft/Right move questions, `F` flags
 * the current one, `N` opens the navigator. Bound on `document` only
 * while the sitting is enabled and NO dialog is open; keys typed into
 * inputs/textareas/contenteditable are never intercepted (free-text
 * exam kinds share the same keys).
 */
export function useExamShortcuts(
  enabled: boolean,
  dialogOpen: boolean,
  optionCount: number,
  handlers: ExamShortcutHandlers,
): void {
  useEffect(() => {
    if (!enabled || dialogOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      /* single-char guards - multi-char keys like "arrowleft" would
         otherwise satisfy 'a' <= key <= 'd' lexicographically and be
         swallowed by the letter branch. */
      if (key.length === 1 && key >= '1' && key <= '9') {
        const index = Number(key) - 1;
        if (index < optionCount) {
          e.preventDefault();
          handlers.onPickOption(index);
        }
        return;
      }
      if (key.length === 1 && key >= 'a' && key <= 'd') {
        const index = key.charCodeAt(0) - 97;
        if (index < optionCount) {
          e.preventDefault();
          handlers.onPickOption(index);
        }
        return;
      }
      switch (key) {
        case 'arrowleft':
          e.preventDefault();
          handlers.onPrev();
          break;
        case 'arrowright':
          e.preventDefault();
          handlers.onNext();
          break;
        case 'f':
          e.preventDefault();
          handlers.onToggleFlag();
          break;
        case 'n':
          e.preventDefault();
          handlers.onOpenNavigator();
          break;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // handlers identity is rebuilt per render in the parent - ref would
    // churn anyway; the bind is cheap and the list is read live.
  }, [enabled, dialogOpen, optionCount, handlers]);
}
