import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StartBatchScreen from './StartBatchScreen';

vi.mock('../lib/qb/bank', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/qb/bank')>();
  return {
    ...mod,
    listBankForms: vi.fn(async () => [
      { id: 'g2-english-unit-01-form-01', kind: 'unit-test', grade: 2, subject: 'english', title: 'Unit 1', total_questions: 20 },
    ]),
  };
});
vi.mock('../lib/supabase/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/supabase/client')>();
  return { ...mod, isSupabaseConfigured: () => true };
});

const GRADE = { id: 'grade-2', name: 'Lớp 2' };

describe('StartBatchScreen', () => {
  it('shows the grade name and the start-batch-button', () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByText(/Lớp 2/)).toBeVisible();
    expect(screen.getByTestId('start-batch-button')).toBeVisible();
  });

  it('shows the app-wide pig mascot in greeting mood (plan.md v10, AC38)', () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'greeting');
  });

  it('calls onStartBatch when start-batch-button is clicked', async () => {
    const onStartBatch = vi.fn();
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={onStartBatch} onStartExam={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByTestId('start-batch-button'));

    expect(onStartBatch).toHaveBeenCalledOnce();
  });

  it('calls onBack when back-to-grades is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={onBack} />);

    await user.click(screen.getByTestId('back-to-grades'));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it('CR-50: assessment forms picker is hidden from students and guests', async () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByTestId('forms-toggle-english')).not.toBeInTheDocument();
    });
  });

  it('CR-50: admin (teacher preview) sees the forms picker', async () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} isAdmin />);
    await waitFor(() => {
      expect(screen.getByTestId('forms-toggle-english')).toBeInTheDocument();
    });
  });
});
