import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExamNavigatorDialog } from './ExamNavigatorDialog';

/** CR-82 M5 (ARCHITECTURE s4.6): paper question navigator for the exam
 *  sitting - counts, jump+close, cell states, modal behaviour. */

function renderNav(overrides: Partial<Parameters<typeof ExamNavigatorDialog>[0]> = {}) {
  const props = {
    total: 12,
    currentIndex: 2,
    answered: [true, false, false, true, false, false, false, false, false, false, false, false],
    flagged: new Set([1, 5]),
    onJump: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<ExamNavigatorDialog {...props} />);
  return props;
}

describe('ExamNavigatorDialog (CR-82 M5)', () => {
  it('is a labelled modal dialog with one cell per question', () => {
    renderNav();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`exam-navigator-cell-${i}`)).toBeInTheDocument();
    }
  });

  it('a cell click jumps to that question and closes via onJump', () => {
    const props = renderNav();
    fireEvent.click(screen.getByTestId('exam-navigator-cell-7'));
    expect(props.onJump).toHaveBeenCalledWith(7);
  });

  it('marks answered cells (icon + aria-label), flagged cells, and aria-current on the current cell', () => {
    renderNav();
    expect(screen.getByTestId('exam-navigator-cell-0')).toHaveAttribute('aria-label', expect.stringContaining('đã trả lời'));
    expect(screen.getByTestId('exam-navigator-cell-1')).toHaveAttribute('aria-label', expect.stringContaining('đã đánh dấu'));
    expect(screen.getByTestId('exam-navigator-cell-2')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('exam-navigator-cell-3')).not.toHaveAttribute('aria-current');
  });

  it('Escape closes and focus is trapped inside (shared useModalBehavior)', () => {
    const props = renderNav();
    // Initial focus lands on the first focusable element inside.
    expect(document.activeElement).not.toBe(document.body);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });
});
