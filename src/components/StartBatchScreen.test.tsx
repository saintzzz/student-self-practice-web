import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StartBatchScreen from './StartBatchScreen';
import { ViewerProvider } from '../lib/viewer/ViewerContext';
import type { ComponentProps, ReactElement } from 'react';

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

/** CR-73 spec s4.4: band-sensitive tests render inside ViewerProvider so
 *  density (tileMinH/primaryMinH) and band come from the real context. */
function renderSBS(ui: ReactElement, gradeId: string) {
  return render(<ViewerProvider gradeId={gradeId}>{ui}</ViewerProvider>);
}
const SBS = (props: Partial<ComponentProps<typeof StartBatchScreen>> = {}) => (
  <StartBatchScreen onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} {...props} grade={props.grade ?? GRADE} />
);

describe('StartBatchScreen', () => {
  it('shows the grade name and the start-batch-button', () => {
    renderSBS(SBS(), GRADE.id);

    expect(screen.getByText(/Lớp 2/)).toBeVisible();
    expect(screen.getByTestId('start-batch-button')).toBeVisible();
  });

  it('shows the app-wide pig mascot in greeting mood (plan.md v10, AC38)', () => {
    renderSBS(SBS(), GRADE.id);

    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'greeting');
  });

  it('calls onStartBatch when start-batch-button is clicked', async () => {
    const onStartBatch = vi.fn();
    const user = userEvent.setup();
    renderSBS(SBS({ onStartBatch }), GRADE.id);

    await user.click(screen.getByTestId('start-batch-button'));

    expect(onStartBatch).toHaveBeenCalledOnce();
  });

  it('calls onBack when back-to-grades is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderSBS(SBS({ onBack }), GRADE.id);

    await user.click(screen.getByTestId('back-to-grades'));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it('CR-73: G1-2 first paint shows 4 launchpad elements (back, Chơi, Luyện thêm, Phần thưởng)', () => {
    renderSBS(SBS(), GRADE.id);

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
    renderSBS(SBS(), GRADE.id);

    const cta = screen.getByTestId('start-batch-button');
    expect(cta).toHaveTextContent('Chơi');
    expect(cta.className).toContain('bg-amber-400');
  });

  it('CR-73: G1-2 hub tiles expand inline - reward holds quest/pet/shelf, more holds subtiles', async () => {
    const user = userEvent.setup();
    renderSBS(SBS(), GRADE.id);

    await user.click(screen.getByTestId('hub-tile-reward'));
    expect(screen.getByTestId('daily-quest-card')).toBeInTheDocument();
    expect(screen.getByTestId('pet-card')).toBeInTheDocument();

    await user.click(screen.getByTestId('hub-tile-more'));
    expect(screen.getByTestId('hub-subtile-english')).toBeInTheDocument();
    expect(screen.getByTestId('hub-subtile-math')).toBeInTheDocument();
    expect(screen.getByTestId('hub-subtile-science')).toBeInTheDocument();
    expect(screen.getByTestId('hub-subtile-arena')).toBeInTheDocument();
  });

  it('CR-73: G1-2 arena subtile controls arena+rank sections (conditional on handlers)', async () => {
    const user = userEvent.setup();
    // No arena handlers -> only hub-section-rank exists/is controlled.
    const first = renderSBS(SBS(), GRADE.id);
    await user.click(screen.getByTestId('hub-tile-more'));
    const noHandlers = screen.getByTestId('hub-subtile-arena');
    expect(noHandlers).toHaveAttribute('aria-controls', 'hub-section-rank');
    expect(document.getElementById('hub-section-arena')).not.toBeInTheDocument();
    expect(document.getElementById('hub-section-rank')).toBeInTheDocument();
    await user.click(noHandlers);
    expect(screen.queryByTestId('arena-card')).not.toBeInTheDocument();
    first.unmount();

    // With handlers -> both sections controlled, both wrappers mounted.
    renderSBS(
      SBS({ onArenaCreate: vi.fn(), onArenaAccept: vi.fn(), onArenaBot: vi.fn() }),
      GRADE.id,
    );
    await user.click(screen.getByTestId('hub-tile-more'));
    expect(screen.getByTestId('hub-subtile-arena')).toHaveAttribute(
      'aria-controls',
      'hub-section-arena hub-section-rank',
    );
    expect(document.getElementById('hub-section-arena')).toBeInTheDocument();
    expect(document.getElementById('hub-section-rank')).toBeInTheDocument();
    await user.click(screen.getByTestId('hub-subtile-arena'));
    expect(screen.getByTestId('arena-card')).toBeInTheDocument();
  });

  it('CR-73: G1-2 drill path = more -> program subtile -> drill button', async () => {
    const onStartExam = vi.fn();
    const user = userEvent.setup();
    renderSBS(SBS({ onStartExam }), GRADE.id);

    await user.click(screen.getByTestId('hub-tile-more'));
    await user.click(screen.getByTestId('hub-subtile-math'));
    await user.click(screen.getByTestId('drill-math'));

    expect(onStartExam).toHaveBeenCalledWith('math', 'practice');
  });

  it('CR-73: G3-5 keeps DailyQuest on-screen and shows 3 section tiles collapsed', () => {
    renderSBS(SBS({ grade: GRADE_4 }), GRADE_4.id);

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
    renderSBS(SBS({ grade: GRADE_4, onStartExam }), GRADE_4.id);

    await user.click(screen.getByTestId('hub-tile-learn'));
    expect(screen.getByTestId('drill-english')).toBeInTheDocument();
    expect(screen.getByTestId('exam-program-english')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-english')).toBeInTheDocument();

    await user.click(screen.getByTestId('drill-math'));
    expect(onStartExam).toHaveBeenCalledWith('math', 'practice');
  });

  it('CR-50: assessment forms picker is hidden from students and guests', async () => {
    const user = userEvent.setup();
    renderSBS(SBS(), GRADE.id);

    await user.click(screen.getByTestId('hub-tile-more'));
    await user.click(screen.getByTestId('hub-subtile-english'));
    await waitFor(() => {
      expect(screen.queryByTestId('forms-toggle-english')).not.toBeInTheDocument();
    });
  });

  it('CR-50: admin (teacher preview) sees the forms picker', async () => {
    const user = userEvent.setup();
    renderSBS(SBS({ isAdmin: true }), GRADE.id);

    await user.click(screen.getByTestId('hub-tile-more'));
    await user.click(screen.getByTestId('hub-subtile-english'));
    await waitFor(() => {
      expect(screen.getByTestId('forms-toggle-english')).toBeInTheDocument();
    });
  });
});
