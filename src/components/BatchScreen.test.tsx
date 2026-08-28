import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BatchScreen from './BatchScreen';
import {
  advanceRoundQuestion,
  createBatch,
  goToNextRound,
  updateRoundSession,
  type BatchState,
} from '../lib/batch/batchSession';
import { getCurrentQuestion, submitExtraLetterAnswer, submitListeningAnswer } from '../lib/practiceSession';

const noopHandlers = {
  onSubmitOption: vi.fn(),
  onSubmitListening: vi.fn(),
  onSubmitExtraLetter: vi.fn(),
  onNextQuestion: vi.fn(),
  onNextRound: vi.fn(),
  onStartNewBatch: vi.fn(),
  onChooseGrade: vi.fn(),
};

function answerCurrentQuestion(state: BatchState): BatchState {
  const question = state.roundSession ? getCurrentQuestion(state.roundSession) : null;
  if (!question) return state;
  if (question.kind === 'extra-letter') {
    return updateRoundSession(state, (session) => submitExtraLetterAnswer(session, 0));
  }
  return updateRoundSession(state, (session) => submitListeningAnswer(session, '0000'));
}

function completeActiveRound(state: BatchState): BatchState {
  let current = state;
  while (current.phase === 'active') {
    current = answerCurrentQuestion(current);
    current = advanceRoundQuestion(current);
  }
  return current;
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

  it('renders the stub placeholder (with next-round-button) for Round 3, not a question card', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // -> Round 2 active
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // -> Round 3 stub

    render(<BatchScreen batch={batch} {...noopHandlers} />);

    expect(screen.getByTestId('round-progress')).toHaveTextContent('3/4');
    expect(screen.getByTestId('next-round-button')).toBeVisible();
    expect(screen.queryByTestId('question-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('round-score-summary')).not.toBeInTheDocument();
  });

  it('renders batch-score-summary after Round 4, with no round-progress', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch);
    batch = completeActiveRound(batch);
    batch = goToNextRound(batch); // Round 3 stub
    batch = goToNextRound(batch); // Round 4 stub
    batch = goToNextRound(batch); // batch summary

    render(<BatchScreen batch={batch} {...noopHandlers} />);

    expect(screen.getByTestId('batch-score-summary')).toBeVisible();
    expect(screen.queryByTestId('round-progress')).not.toBeInTheDocument();
  });
});
