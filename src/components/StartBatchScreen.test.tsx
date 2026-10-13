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

  it('CR-73: G1-2 first paint shows 4 launchpad elements (back, Chơi, Luyện thêm, Phần thưởng)', () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    // Hub content stays inside collapsed sections (unmounted children).
    expect(screen.queryByTestId('daily-quest-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coach-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pet-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('drill-english')).not.toBeInTheDocument();
    // The four launchpad decisions.
    expect(screen.getByTestId('back-to-grades')).toBeVisible();
    expect(screen.queryByTestId('instruction-speaker')).not.toBeInTheDocument();
    expect(screen.getByTestId('start-batch-button')).toBeVisible();
    expect(screen.getByTestId('hub-tile-more')).toBeVisible();
    expect(screen.getByTestId('hub-tile-reward')).toBeVisible();
  });

  it('kids-UX: the primary CTA is the single gold action labelled Chơi', () => {
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    const cta = screen.getByTestId('start-batch-button');
    expect(cta).toHaveTextContent('Chơi');
    expect(cta.className).toContain('bg-amber-400');
  });

  it('CR-73: G1-2 hub tiles expand inline - reward holds quest/pet/shelf, more holds subtiles', async () => {
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByTestId('hub-tile-reward'));
    expect(screen.getByTestId('daily-quest-card')).toBeInTheDocument();
    expect(screen.getByTestId('pet-card')).toBeInTheDocument();

    await user.click(screen.getByTestId('hub-tile-more'));
    expect(screen.getByTestId('hub-subtile-english')).toBeInTheDocument();
    expect(screen.getByTestId('hub-subtile-math')).toBeInTheDocument();
    expect(screen.getByTestId('hub-subtile-science')).toBeInTheDocument();
    expect(screen.getByTestId('hub-subtile-arena')).toBeInTheDocument();
  });

  it('CR-73: G1-2 drill path = more -> program subtile -> drill button', async () => {
    const onStartExam = vi.fn();
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={onStartExam} onBack={vi.fn()} />);

    await user.click(screen.getByTestId('hub-tile-more'));
    await user.click(screen.getByTestId('hub-subtile-math'));
    await user.click(screen.getByTestId('drill-math'));

    expect(onStartExam).toHaveBeenCalledWith('math', 'practice');
  });

  it('CR-73: G3-5 keeps DailyQuest on-screen and shows 3 section tiles collapsed', () => {
    render(<StartBatchScreen grade={GRADE_4} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByTestId('daily-quest-card')).toBeInTheDocument();
    expect(screen.getByTestId('hub-tile-learn')).toBeVisible();
    expect(screen.getByTestId('hub-tile-arena')).toBeVisible();
    expect(screen.getByTestId('hub-tile-reward')).toBeVisible();
    // Collapsed sections unmount their children.
    expect(screen.queryByTestId('pet-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('drill-english')).not.toBeInTheDocument();
  });

  it('CR-73: G3-5 learn tile reveals all programs and drill still launches', async () => {
    const onStartExam = vi.fn();
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE_4} onStartBatch={vi.fn()} onStartExam={onStartExam} onBack={vi.fn()} />);

    await user.click(screen.getByTestId('hub-tile-learn'));
    expect(screen.getByTestId('drill-english')).toBeInTheDocument();
    expect(screen.getByTestId('exam-program-english')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-english')).toBeInTheDocument();

    await user.click(screen.getByTestId('drill-math'));
    expect(onStartExam).toHaveBeenCalledWith('math', 'practice');
  });

  it('CR-50: assessment forms picker is hidden from students and guests', async () => {
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />);

    await user.click(screen.getByTestId('hub-tile-more'));
    await user.click(screen.getByTestId('hub-subtile-english'));
    await waitFor(() => {
      expect(screen.queryByTestId('forms-toggle-english')).not.toBeInTheDocument();
    });
  });

  it('CR-50: admin (teacher preview) sees the forms picker', async () => {
    const user = userEvent.setup();
    render(<StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} isAdmin />);

    await user.click(screen.getByTestId('hub-tile-more'));
    await user.click(screen.getByTestId('hub-subtile-english'));
    await waitFor(() => {
      expect(screen.getByTestId('forms-toggle-english')).toBeInTheDocument();
    });
  });
});
