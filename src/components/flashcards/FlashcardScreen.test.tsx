import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FlashcardScreen from './FlashcardScreen';
import { ViewerProvider } from '../../lib/viewer/ViewerContext';
import { __resetFlashReviewSession } from '../../lib/flashcards/reviewStore';

/**
 * CR-82 (spec s14): the flashcard screen end-to-end in jsdom - deck
 * counter, flip/speaker controls, decisions -> summary panels, end-early
 * resume, rating persistence, and the empty/error branches.
 */

const GRADE = { id: 'grade-2', name: 'Lớp 2' };
const GRADE_4 = { id: 'grade-4', name: 'Lớp 4' };

/** Hoisted control: empty -> getWordsByGrade returns [] (empty deck
 *  path), throw -> it throws (load-error path). */
const control = vi.hoisted(() => ({ empty: false, throw: false }));

vi.mock('../../data/vocabulary', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../data/vocabulary')>();
  return {
    ...mod,
    getWordsByGrade: (gradeId: string) => {
      if (control.throw) throw new Error('vocab boom');
      if (control.empty) return [];
      return mod.getWordsByGrade(gradeId);
    },
  };
});

function renderScreen(onExit = vi.fn(), grade = GRADE) {
  return render(
    <ViewerProvider gradeId={grade.id}>
      <FlashcardScreen grade={grade} onExit={onExit} />
    </ViewerProvider>,
  );
}

/** Reads the "Thẻ k/N" counter index, or null when not on a card. */
function counterIndex(): number | null {
  const text = screen.queryByTestId('flashcard-counter')?.textContent ?? '';
  const m = text.match(/Thẻ (\d+)\//);
  return m ? Number(m[1]) : null;
}

/** Waits out the 250ms card exit animation + reducer advance: after each
 *  decision the counter must increment or the summary must mount. */
async function rateAll(kind: 'known' | 'again' = 'known') {
  const testid = kind === 'known' ? 'flashcard-known' : 'flashcard-again';
  for (let guard = 0; guard < 30; guard += 1) {
    const btn = screen.queryByTestId(testid);
    if (!btn || screen.queryByTestId('flashcard-summary')) break;
    const before = counterIndex();
    fireEvent.click(btn);
    // eslint-disable-next-line no-await-in-loop
    await waitFor(() => {
      expect(
        screen.queryByTestId('flashcard-summary') ||
          (before !== null && counterIndex() === before + 1),
      ).toBeTruthy();
    });
  }
}

beforeEach(() => {
  window.localStorage.clear();
  __resetFlashReviewSession();
  control.empty = false;
  control.throw = false;
});

describe('FlashcardScreen', () => {
  it('renders the chrome strip and the first card', async () => {
    renderScreen();
    expect(await screen.findByTestId('flashcard-card')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-counter')).toHaveTextContent('Thẻ 1/');
    expect(screen.getByTestId('flashcard-end')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-known')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-again')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-flip')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-speaker')).toBeInTheDocument();
  });

  it('G3-5 also renders the deck (band-independent anatomy)', async () => {
    renderScreen(vi.fn(), GRADE_4);
    expect(await screen.findByTestId('flashcard-card')).toBeInTheDocument();
  });

  it('flip toggles the card face; the speaker button does not flip', async () => {
    renderScreen();
    await screen.findByTestId('flashcard-card');
    const card = screen.getByTestId('flashcard-card');
    expect(card).toHaveAttribute('data-face', 'front');

    fireEvent.click(screen.getByTestId('flashcard-flip'));
    expect(card).toHaveAttribute('data-face', 'back');

    fireEvent.click(screen.getByTestId('flashcard-speaker'));
    expect(card).toHaveAttribute('data-face', 'back'); // unchanged
  });

  it('rating every card lands on the full summary with rating chips', async () => {
    renderScreen();
    await screen.findByTestId('flashcard-card');
    // Rate the first card "Ôn lại" so the retry-again affordance exists.
    fireEvent.click(screen.getByTestId('flashcard-again'));
    await waitFor(() =>
      expect(screen.getByTestId('flashcard-counter')).toHaveTextContent('Thẻ 2/'),
    );
    await rateAll('known');

    const summary = await screen.findByTestId('flashcard-summary');
    expect(summary).toHaveTextContent('Em đã xem hết');
    expect(screen.getByTestId('flashcard-chip-again')).toHaveTextContent('Ôn lại: 1');
    expect(screen.getByTestId('flashcard-retry-again')).toHaveTextContent('Ôn lại 1 thẻ');
  });

  it('a saved "again" rating persists to the review store', async () => {
    renderScreen();
    await screen.findByTestId('flashcard-card');
    fireEvent.click(screen.getByTestId('flashcard-again'));
    await waitFor(() => {
      expect(window.localStorage.getItem('ea-flash-review:grade-2')).toContain('"r":"a"');
    });
  });

  it('KẾT THÚC asks, then shows the partial summary with Xem tiếp resume', async () => {
    const onExit = vi.fn();
    renderScreen(onExit);
    await screen.findByTestId('flashcard-card');

    fireEvent.click(screen.getByTestId('flashcard-known'));
    await waitFor(() =>
      expect(screen.getByTestId('flashcard-counter')).toHaveTextContent('Thẻ 2/'),
    );

    fireEvent.click(screen.getByTestId('flashcard-end'));
    fireEvent.click(await screen.findByTestId('end-confirm-ok'));

    const summary = await screen.findByTestId('flashcard-summary');
    expect(summary).toHaveTextContent('Em đã xem 1/');
    fireEvent.click(screen.getByTestId('flashcard-summary-primary'));
    expect(await screen.findByTestId('flashcard-card')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-counter')).toHaveTextContent('Thẻ 2/');
  });

  it('ArrowRight/ArrowLeft rate the card (keyboard path = buttons)', async () => {
    renderScreen();
    const card = await screen.findByTestId('flashcard-card');
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(screen.getByTestId('flashcard-counter')).toHaveTextContent('Thẻ 2/'),
    );
  });

  it('the live region announces flips and saved ratings', async () => {
    renderScreen();
    await screen.findByTestId('flashcard-card');
    const live = screen.getByTestId('flashcard-live');
    fireEvent.click(screen.getByTestId('flashcard-flip'));
    expect(live).toHaveTextContent('Mặt sau:');
    fireEvent.click(screen.getByTestId('flashcard-known'));
    await waitFor(() => expect(live).toHaveTextContent('Đã lưu: nhớ rồi'));
  });

  it('zero eligible words -> honest empty panel, never a fake deck', async () => {
    control.empty = true;
    const onExit = vi.fn();
    renderScreen(onExit);
    expect(await screen.findByTestId('flashcard-empty')).toHaveTextContent(
      'Chưa có thẻ cho lớp này',
    );
    fireEvent.click(screen.getByTestId('flashcard-empty-exit'));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('deck build failure -> load-error panel; Thử lại rebuilds', async () => {
    control.throw = true;
    renderScreen();
    expect(await screen.findByTestId('flashcard-error')).toHaveTextContent(
      'Chưa mở được bộ thẻ',
    );
    control.throw = false;
    fireEvent.click(screen.getByTestId('flashcard-error-retry'));
    expect(await screen.findByTestId('flashcard-card')).toBeInTheDocument();
  });
});
