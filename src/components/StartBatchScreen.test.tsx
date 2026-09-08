import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StartBatchScreen from './StartBatchScreen';

const GRADE = { id: 'grade-2', name: 'Lớp 2' };

describe('StartBatchScreen', () => {
  it('shows the grade name and the start-batch-button', () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByText(/Lớp 2/)).toBeVisible();
    expect(screen.getByTestId('start-batch-button')).toBeVisible();
  });

  it('shows the app-wide pig mascot in greeting mood (plan.md v10, AC38)', () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'greeting');
  });

  it('calls onStartBatch when start-batch-button is clicked', async () => {
    const onStartBatch = vi.fn();
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={onStartBatch} onBack={vi.fn()} />);

    await user.click(screen.getByTestId('start-batch-button'));

    expect(onStartBatch).toHaveBeenCalledOnce();
  });

  it('calls onBack when back-to-grades is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onBack={onBack} />);

    await user.click(screen.getByTestId('back-to-grades'));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
