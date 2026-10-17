import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExamReviewSheet } from './ExamReviewSheet';

/** CR-82 M5 (ARCHITECTURE s4.7, D-13): review-before-submit sheet for the
 *  timed exam sitting - counts, jump chips, empty copy, safe-default
 *  focus on "Quay lại làm tiếp". */

function renderSheet(overrides: Partial<Parameters<typeof ExamReviewSheet>[0]> = {}) {
  const props = {
    total: 5,
    unanswered: [1, 3],
    flagged: [2],
    onJump: vi.fn(),
    onBack: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<ExamReviewSheet {...props} />);
  return props;
}

describe('ExamReviewSheet (CR-82 M5)', () => {
  it('shows the counts line and unanswered jump chips', () => {
    renderSheet();
    expect(screen.getByTestId('exam-review-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('exam-review-counts')).toHaveTextContent('Đã làm: 3/5 - Chưa làm: 2 - Đã đánh dấu: 1');
    expect(screen.getByTestId('exam-review-jump-1')).toBeInTheDocument();
    expect(screen.getByTestId('exam-review-jump-3')).toBeInTheDocument();
    expect(screen.getByTestId('exam-review-flag-2')).toBeInTheDocument();
  });

  it('a jump chip calls onJump with the question index', () => {
    const props = renderSheet();
    fireEvent.click(screen.getByTestId('exam-review-jump-3'));
    expect(props.onJump).toHaveBeenCalledWith(3);
  });

  it('shows the all-done copy when nothing is unanswered', () => {
    renderSheet({ unanswered: [] });
    expect(screen.getByText('Em đã làm hết các câu rồi.')).toBeInTheDocument();
    expect(screen.queryByTestId('exam-review-jump-0')).toBeNull();
  });

  it('Back is the safe default focus and calls onBack; Submit calls onSubmit', () => {
    const props = renderSheet();
    expect(document.activeElement).toBe(screen.getByTestId('exam-review-back'));

    fireEvent.click(screen.getByTestId('exam-review-back'));
    expect(props.onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('exam-review-submit'));
    expect(props.onSubmit).toHaveBeenCalled();
  });
});
