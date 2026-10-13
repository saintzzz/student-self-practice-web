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
const GRADE_4 = { id: 'grade-4', name: 'Lớp 4' };

async function openSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('explore-toggle'));
  await screen.findByRole('dialog');
}

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

  it('kids-UX §3.1.a: G1-2 first paint shows only back, speaker, Chơi and Khám phá', () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    // Relocated cards and exam buttons are inside the closed sheet.
    expect(screen.queryByTestId('daily-quest-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coach-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pet-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('drill-english')).not.toBeInTheDocument();
    // The four launchpad decisions.
    expect(screen.getByTestId('back-to-grades')).toBeVisible();
    // CR-72: headless instruction speaker - autoplays, renders no button.
    expect(screen.queryByTestId('instruction-speaker')).not.toBeInTheDocument();
    expect(screen.getByTestId('start-batch-button')).toBeVisible();
    expect(screen.getByTestId('explore-toggle')).toBeVisible();
  });

  it('kids-UX: the primary CTA is the single gold action labelled Chơi', () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    const cta = screen.getByTestId('start-batch-button');
    expect(cta).toHaveTextContent('Chơi');
    expect(cta.className).toContain('bg-amber-400');
  });

  it('kids-UX: Khám phá toggle opens the sheet with relocated content', async () => {
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    await openSheet(user);

    expect(screen.getByTestId('daily-quest-card')).toBeInTheDocument();
    expect(screen.getByTestId('pet-card')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-card')).toBeInTheDocument();
    expect(screen.getByTestId('drill-english')).toBeInTheDocument();
    expect(screen.getByTestId('exam-program-english')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-english')).toBeInTheDocument();
  });

  it('kids-UX §3.1.b: G3-5 keeps quest/review cards visible and moves the rest into the sheet', () => {
    render(<StartBatchScreen grade={GRADE_4} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    // Progress cards stay on the launchpad for the reader band.
    expect(screen.getByTestId('daily-quest-card')).toBeInTheDocument();
    // Collection/competition/exam surfaces stay inside the closed sheet.
    expect(screen.queryByTestId('pet-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('drill-english')).not.toBeInTheDocument();
  });

  it('kids-UX: exam drill buttons still call onStartExam from inside the sheet', async () => {
    const onStartExam = vi.fn();
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={onStartExam} onBack={vi.fn()} />);

    await openSheet(user);
    await user.click(screen.getByTestId('drill-math'));

    expect(onStartExam).toHaveBeenCalledWith('math', 'practice');
  });

  it('CR-50: assessment forms picker is hidden from students and guests', async () => {
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);
    // IA change (kids-UX): the forms picker lives inside the Khám phá sheet.
    await openSheet(user);
    await waitFor(() => {
      expect(screen.queryByTestId('forms-toggle-english')).not.toBeInTheDocument();
    });
  });

  it('CR-50: admin (teacher preview) sees the forms picker', async () => {
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} isAdmin />);
    // IA change (kids-UX): open the sheet to reach the forms picker.
    await openSheet(user);
    await waitFor(() => {
      expect(screen.getByTestId('forms-toggle-english')).toBeInTheDocument();
    });
  });
});
