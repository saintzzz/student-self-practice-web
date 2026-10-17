import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuestionCard from './QuestionCard';
import { IMAGE_QUESTION, noopHandlers } from './questionCardFixtures';
import type { CurrentAnswer } from '../lib/practiceSession';

/**
 * CR-82 (spec s9.3 one-mascot matrix, D-20 FF-19): the board owns both
 * perches and the whole-screen Lottie budget.
 *
 * jsdom has no `window.matchMedia`, so `useMediaQuery('(max-height:
 * 420px)')` reads false (tall viewport) and `MascotRig` reads static -
 * the perch structure and mascot count are assertable DOM facts, while
 * the Lottie mounts are covered by the allocator unit test +
 * data-mascot-renderer.
 */

const CORRECT_ANSWER: CurrentAnswer = { selectedIndex: 0, isCorrect: true };

function installMatchMedia(matches: Record<string, boolean>) {
  const mql = (query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: () => false,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: mql,
  });
}

function uninstallMatchMedia() {
  // @ts-expect-error restore jsdom's absent matchMedia
  delete window.matchMedia;
}

describe('QuestionCard mascot perches + Lottie budget (CR-82 s9.3, D-20)', () => {
  beforeEach(() => {
    uninstallMatchMedia();
  });
  afterEach(() => {
    uninstallMatchMedia();
    vi.restoreAllMocks();
  });

  it('unanswered: the board perch shows the idle mascot - the only mascot on screen', () => {
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );

    const mascots = screen.getAllByTestId('mascot');
    expect(mascots).toHaveLength(1);
    expect(mascots[0]).toHaveAttribute('data-mascot-mood', 'idle');
    expect(mascots[0]).toHaveAttribute('data-mascot-renderer', 'static');
    expect(screen.queryByTestId('sheet-perch')).toBeNull();
    expect(screen.queryByTestId('feedback-sheet')).toBeNull();
  });

  it('answered (tall viewport): the sheet perch owns the verdict mascot inside feedback-sheet', () => {
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={CORRECT_ANSWER}
        {...noopHandlers}
      />,
    );

    const sheet = screen.getByTestId('feedback-sheet');
    expect(sheet).toBeInTheDocument();
    const perch = screen.getByTestId('sheet-perch');
    expect(sheet.contains(perch)).toBe(true);

    // Exactly one mascot - the panel's inline mascot is suppressed while
    // the perch owns the spot (mascotPlacement='none').
    const mascots = screen.getAllByTestId('mascot');
    expect(mascots).toHaveLength(1);
    expect(mascots[0]).toHaveAttribute('data-mascot-mood', 'happy');
  });

  it('answered + streak>=3 upgrades the sheet-perch mascot to celebrating', () => {
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={4}
        totalQuestions={8}
        currentAnswer={CORRECT_ANSWER}
        correctStreak={3}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'celebrating');
  });

  it('answered + wrong verdict shows the encouraging sheet-perch mascot', () => {
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={{ selectedIndex: 1, isCorrect: false }}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'encouraging');
  });

  it('answered at max-height:420px: no sheet perch, the inline mascot renders in the panel (exactly one)', () => {
    installMatchMedia({ '(max-height: 420px)': true });
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={CORRECT_ANSWER}
        {...noopHandlers}
      />,
    );

    expect(screen.queryByTestId('sheet-perch')).toBeNull();
    const mascots = screen.getAllByTestId('mascot');
    expect(mascots).toHaveLength(1);
    expect(mascots[0]).toHaveAttribute('data-mascot-mood', 'happy');
    expect(mascots[0]).toHaveAttribute('data-mascot-renderer', 'static');
  });

  it('reserves the 2.75rem perch overhang under the sheet, not for the inline variant', () => {
    const { unmount } = render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={CORRECT_ANSWER}
        {...noopHandlers}
      />,
    );
    expect(screen.getByTestId('question-card').style.paddingBottom).toContain('8.25rem');
    unmount();

    installMatchMedia({ '(max-height: 420px)': true });
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={CORRECT_ANSWER}
        {...noopHandlers}
      />,
    );
    expect(screen.getByTestId('question-card').style.paddingBottom).toContain('5.5rem');
  });

  it('unanswered: no mascot Lottie mounts under jsdom (no matchMedia -> static per D-09)', () => {
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );
    expect(screen.queryByTestId('mascot-lottie-idle')).toBeNull();
  });

  it('mounts the mascot Lottie for the idle slot when matchMedia exists and the prompt is ineligible', async () => {
    /* D-20 row 2: 🐱 has no Noto animation, so the unanswered board gives
       the single player slot to the mascot. With matchMedia stubbed the
       jsdom rig mounts the mocked player (lazy chunk - await it). */
    installMatchMedia({ '(max-height: 420px)': false });
    render(
      <QuestionCard
        question={IMAGE_QUESTION}
        questionNumber={1}
        totalQuestions={8}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );
    expect(await screen.findByTestId('mascot-lottie-idle')).toBeInTheDocument();
    // The poster stays mounted underneath the player in the same box.
    expect(screen.getByTestId('mascot').querySelector('svg')).not.toBeNull();
  });
});
