import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BatchScreen from './BatchScreen';
import {
  advanceRoundQuestion,
  createBatch,
  goToNextRound,
  updateRoundSession,
  type BatchState,
} from '../lib/batch/batchSession';
import {
  getCurrentQuestion,
  submitExtraLetterAnswer,
  submitListeningAnswer,
  submitOptionAnswer,
  submitPairMatchingAnswer,
  submitPronunciationAnswer,
} from '../lib/practiceSession';
import { ROUND_DURATION_SECONDS } from '../hooks/useRoundTimer';

function buildNoopHandlers() {
  return {
    onSubmitOption: vi.fn(),
    onSubmitListening: vi.fn(),
    onSubmitExtraLetter: vi.fn(),
    onSubmitPronunciation: vi.fn(),
    onSubmitPairMatching: vi.fn(),
    onNextQuestion: vi.fn(),
    onNextRound: vi.fn(),
    onStartNewBatch: vi.fn(),
    onChooseGrade: vi.fn(),
    onEndBatch: vi.fn(),
    onRoundTimeExpired: vi.fn(),
  };
}

const noopHandlers = buildNoopHandlers();

function answerCurrentQuestion(state: BatchState): BatchState {
  const question = state.roundSession ? getCurrentQuestion(state.roundSession) : null;
  if (!question) return state;
  if (question.kind === 'extra-letter') {
    return updateRoundSession(state, (session) => submitExtraLetterAnswer(session, 0));
  }
  if (question.kind === 'pronunciation-recording') {
    return updateRoundSession(state, (session) => submitPronunciationAnswer(session, '0000'));
  }
  if (
    question.kind === 'describe-and-choose-image' ||
    question.kind === 'image-choice' ||
    question.kind === 'listening-image-choice' ||
    question.kind === 'counting-image' ||
    question.kind === 'phonics-sound-choice' ||
    question.kind === 'phonics-word-choice' ||
    question.kind === 'phonics-final-choice' ||
    question.kind === 'phonics-blend-choice' ||
    question.kind === 'phonics-rhyme-choice'
  ) {
    return updateRoundSession(state, (session) => submitOptionAnswer(session, 0));
  }
  if (question.kind === 'picture-pair-matching') {
    return updateRoundSession(state, (session) => submitPairMatchingAnswer(session, true));
  }
  return updateRoundSession(state, (session) => submitListeningAnswer(session, '0000'));
}

function completeActiveRound(state: BatchState): BatchState {
  let current = state;
  // A round is <= 10 questions; a larger bound means a new question kind
  // slipped past answerCurrentQuestion and the loop would hang the suite
  // instead of failing - make it fail loudly instead.
  for (let guard = 0; guard < 20; guard++) {
    if (current.phase !== 'active') return current;
    current = answerCurrentQuestion(current);
    current = advanceRoundQuestion(current);
  }
  throw new Error('completeActiveRound did not finish within 20 questions');
}

describe('BatchScreen', () => {
  it('renders round-progress and the current question during the active phase', () => {
    const batch = createBatch('fixed-seed');

    render(<BatchScreen batch={batch} {...noopHandlers} />);

    expect(screen.getByTestId('round-progress')).toHaveTextContent('1/4');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'extra-letter');
  });

  it('renders round-score-summary once a Round completes', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);

    render(<BatchScreen batch={batch} {...noopHandlers} />);

    expect(screen.getByTestId('round-progress')).toBeVisible();
    expect(screen.getByTestId('round-score-summary')).toBeVisible();
  });

  it('renders a real question card (not a stub) for Round 3, per AC24', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // -> Round 2 active
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // -> Round 3 active

    render(<BatchScreen batch={batch} {...noopHandlers} />);

    expect(screen.getByTestId('round-progress')).toHaveTextContent('3/4');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'pronunciation-recording');
    expect(screen.queryByTestId('next-round-button')).not.toBeInTheDocument();
  });

  it('renders a real question card (not a stub) for Round 4, per AC25', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // -> Round 2 active
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // -> Round 3 active
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // -> Round 4 active

    render(<BatchScreen batch={batch} {...noopHandlers} />);

    expect(screen.getByTestId('round-progress')).toHaveTextContent('4/4');
    expect(screen.getByTestId('question-card')).toHaveAttribute(
      'data-question-kind',
      'describe-and-choose-image',
    );
    expect(screen.queryByTestId('next-round-button')).not.toBeInTheDocument();
  });

  it('CR-55: shows a KẾT THÚC control during the active Round that calls onEndBatch', () => {
    const handlers = buildNoopHandlers();
    const batch = createBatch('fixed-seed');

    render(<BatchScreen batch={batch} {...handlers} />);

    const endButton = screen.getByTestId('batch-end-early');
    expect(endButton).toHaveTextContent('KẾT THÚC');
    fireEvent.click(endButton);
    expect(handlers.onEndBatch).toHaveBeenCalledTimes(1);
  });

  it('CR-55: keeps the KẾT THÚC control on the round-summary screen', () => {
    const handlers = buildNoopHandlers();
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);

    render(<BatchScreen batch={batch} {...handlers} />);

    expect(screen.getByTestId('round-score-summary')).toBeVisible();
    fireEvent.click(screen.getByTestId('batch-end-early'));
    expect(handlers.onEndBatch).toHaveBeenCalledTimes(1);
  });

  it('renders batch-score-summary after Round 4, with no round-progress', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch);
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // Round 3 active
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // Round 4 active
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // batch summary

    render(<BatchScreen batch={batch} {...noopHandlers} />);

    expect(screen.getByTestId('batch-score-summary')).toBeVisible();
    expect(screen.queryByTestId('round-progress')).not.toBeInTheDocument();
    expect(screen.queryByTestId('batch-end-early')).not.toBeInTheDocument();
  });
});

describe('BatchScreen live score + round timer (plan.md v7, AC26-AC29)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows live-score and round-timer from the start of an active Round', () => {
    const batch = createBatch('fixed-seed');

    render(<BatchScreen batch={batch} {...buildNoopHandlers()} />);

    expect(screen.getByTestId('live-score')).toHaveTextContent('0/0');
    expect(screen.getByTestId('round-timer')).toHaveTextContent('5:00');
  });

  it('updates live-score the instant an answer is recorded, before Next is clicked', () => {
    const batch = createBatch('fixed-seed');
    const answered = answerCurrentQuestion(batch);

    const { rerender } = render(<BatchScreen batch={batch} {...buildNoopHandlers()} />);
    expect(screen.getByTestId('live-score')).toHaveTextContent('0/0');

    rerender(<BatchScreen batch={answered} {...buildNoopHandlers()} />);

    expect(screen.getByTestId('live-score')).toHaveTextContent('/1');
  });

  it('counts the round-timer down once per second while the Round is active', () => {
    const batch = createBatch('fixed-seed');
    render(<BatchScreen batch={batch} {...buildNoopHandlers()} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId('round-timer')).toHaveTextContent('4:57');
  });

  it('does not end the Round before the full 5:00 has elapsed', () => {
    const handlers = buildNoopHandlers();
    const batch = createBatch('fixed-seed');
    render(<BatchScreen batch={batch} {...handlers} />);

    act(() => {
      vi.advanceTimersByTime(ROUND_DURATION_SECONDS * 1000 - 1000);
    });

    expect(handlers.onRoundTimeExpired).not.toHaveBeenCalled();
    expect(screen.getByTestId('round-timer')).toHaveTextContent('0:01');
  });

  it('calls onRoundTimeExpired exactly once when the countdown reaches 0:00 (AC28)', () => {
    const handlers = buildNoopHandlers();
    const batch = createBatch('fixed-seed');
    render(<BatchScreen batch={batch} {...handlers} />);

    act(() => {
      vi.advanceTimersByTime(ROUND_DURATION_SECONDS * 1000);
    });

    expect(handlers.onRoundTimeExpired).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('round-timer')).toHaveTextContent('0:00');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(handlers.onRoundTimeExpired).toHaveBeenCalledTimes(1);
  });

  it('resets to a fresh 5:00 when the next Round starts (AC29)', () => {
    let batch = createBatch('fixed-seed');
    const { rerender } = render(<BatchScreen batch={batch} {...buildNoopHandlers()} />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByTestId('round-timer')).toHaveTextContent('4:00');

    batch = completeActiveRound(batch);
    rerender(<BatchScreen batch={batch} {...buildNoopHandlers()} />);
    batch = goToNextRound(batch);
    rerender(<BatchScreen batch={batch} {...buildNoopHandlers()} />);

    expect(screen.getByTestId('round-timer')).toHaveTextContent('5:00');
  });

  it('resets to a fresh 5:00 for Round 1 of a brand-new Batch ("Luyện tập bài mới")', () => {
    let batch = createBatch('fixed-seed');
    const { rerender } = render(<BatchScreen batch={batch} {...buildNoopHandlers()} />);

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(screen.getByTestId('round-timer')).toHaveTextContent('3:00');

    const freshBatch = createBatch('a-different-seed');
    rerender(<BatchScreen batch={freshBatch} {...buildNoopHandlers()} />);

    expect(screen.getByTestId('round-timer')).toHaveTextContent('5:00');
  });

  it('stops ticking once the Round is no longer active (no leaked interval)', () => {
    const handlers = buildNoopHandlers();
    let batch = createBatch('fixed-seed');
    const { rerender } = render(<BatchScreen batch={batch} {...handlers} />);

    batch = completeActiveRound(batch);
    rerender(<BatchScreen batch={batch} {...handlers} />);
    expect(screen.getByTestId('round-score-summary')).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(ROUND_DURATION_SECONDS * 1000);
    });

    expect(handlers.onRoundTimeExpired).not.toHaveBeenCalled();
  });
});
