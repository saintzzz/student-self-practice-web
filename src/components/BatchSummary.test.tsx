import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BatchSummary from './BatchSummary';
import type { BatchResult } from '../lib/batch/batchSession';

const RESULT: BatchResult = {
  totalCorrect: 14,
  totalQuestions: 20,
  points: 140,
  maxPoints: 200,
  rounds: [
    {
      roundNumber: 1,
      roundType: 'extra-letter',
      titleVi: 'Vòng 1: Bắn chữ cái thừa',
      correctCount: 7,
      totalCount: 10,
      points: 70,
      maxPoints: 100,
      implemented: true,
    },
    {
      roundNumber: 2,
      roundType: 'listening-sentence-fill-blank',
      titleVi: 'Vòng 2: Nghe và điền từ',
      correctCount: 7,
      totalCount: 10,
      points: 70,
      maxPoints: 100,
      implemented: true,
    },
    {
      roundNumber: 3,
      roundType: 'pronunciation-recording',
      titleVi: 'Vòng 3: Ghi âm phát âm',
      correctCount: 0,
      totalCount: 0,
      points: 0,
      maxPoints: 0,
      implemented: false,
    },
    {
      roundNumber: 4,
      roundType: 'describe-and-choose-image',
      titleVi: 'Vòng 4: Chọn hình đúng',
      correctCount: 0,
      totalCount: 0,
      points: 0,
      maxPoints: 0,
      implemented: false,
    },
  ],
};

describe('BatchSummary (AC21)', () => {
  it('shows the batch-score-summary testid with the total "X/Y" fraction', () => {
    render(<BatchSummary result={RESULT} onStartNewBatch={vi.fn()} onChooseGrade={vi.fn()} />);

    expect(screen.getByTestId('batch-score-summary')).toHaveTextContent('14/20');
  });

  it('shows the points/maxPoints total as the headline metric (plan.md v10, AC36)', () => {
    render(<BatchSummary result={RESULT} onStartNewBatch={vi.fn()} onChooseGrade={vi.fn()} />);

    expect(screen.getByTestId('batch-points-summary')).toHaveTextContent('140/200');
  });

  it('shows an encouraging completion badge, never "failed"/"incomplete" (AC37)', () => {
    render(<BatchSummary result={RESULT} onStartNewBatch={vi.fn()} onChooseGrade={vi.fn()} />);

    const badge = screen.getByTestId('batch-completion-badge');
    expect(badge).not.toHaveTextContent(/thất bại|chưa hoàn thành|incomplete|failed/i);
  });

  it('shows the app-wide pig mascot in celebrating mood (AC38)', () => {
    render(<BatchSummary result={RESULT} onStartNewBatch={vi.fn()} onChooseGrade={vi.fn()} />);

    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'celebrating');
  });

  it('renders a per-round breakdown entry for every round, including not-yet-implemented ones', () => {
    render(<BatchSummary result={RESULT} onStartNewBatch={vi.fn()} onChooseGrade={vi.fn()} />);

    expect(screen.getByTestId('round-breakdown-1')).toHaveTextContent('7/10');
    expect(screen.getByTestId('round-breakdown-1')).toHaveTextContent('70/100 điểm');
    expect(screen.getByTestId('round-breakdown-2')).toHaveTextContent('7/10');
    expect(screen.getByTestId('round-breakdown-3')).toHaveTextContent('Chưa có nội dung');
    expect(screen.getByTestId('round-breakdown-4')).toHaveTextContent('Chưa có nội dung');
  });

  it('calls onStartNewBatch and onChooseGrade from their respective buttons', async () => {
    const onStartNewBatch = vi.fn();
    const onChooseGrade = vi.fn();
    const user = userEvent.setup();
    render(<BatchSummary result={RESULT} onStartNewBatch={onStartNewBatch} onChooseGrade={onChooseGrade} />);

    await user.click(screen.getByTestId('practice-again-button'));
    await user.click(screen.getByTestId('back-to-grades'));

    expect(onStartNewBatch).toHaveBeenCalledOnce();
    expect(onChooseGrade).toHaveBeenCalledOnce();
  });
});
