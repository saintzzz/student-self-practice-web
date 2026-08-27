import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows exactly one grade card on load (AC1)', () => {
    render(<App />);

    expect(screen.getByTestId('grade-card-grade-2')).toBeVisible();
    expect(screen.getAllByTestId(/^grade-card-/)).toHaveLength(1);
  });

  it('navigates grade -> topic -> practice session and back to grades (AC1, AC2, AC3)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    expect(screen.getByTestId('topic-card-g2-animals')).toBeVisible();
    expect(screen.getByTestId('topic-card-g2-colors')).toBeVisible();

    await user.click(screen.getByTestId('back-to-grades'));
    expect(screen.getByTestId('grade-card-grade-2')).toBeVisible();

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-animals'));

    const questionCard = screen.getByTestId('question-card');
    expect(questionCard).toHaveAttribute('data-question-kind');
    expect(screen.getByTestId('question-progress')).toHaveTextContent('1');
    expect(screen.getByTestId('question-progress')).toHaveTextContent('6');
  });

  it('completes a 6-question session mixing both kinds and shows the score summary (AC3, AC6, AC7)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-animals'));

    const seenKinds = new Set<string>();

    for (let i = 0; i < 6; i++) {
      const card = screen.getByTestId('question-card');
      const kind = card.getAttribute('data-question-kind');
      seenKinds.add(kind ?? '');

      if (kind === 'image-choice') {
        await user.click(screen.getByTestId('option-0'));
      } else {
        await user.type(screen.getByTestId('answer-input'), 'anything');
        await user.click(screen.getByTestId('submit-answer-button'));
      }

      await user.click(screen.getByTestId('next-button'));
    }

    expect(seenKinds.has('image-choice')).toBe(true);
    expect(seenKinds.has('listening-fill-blank')).toBe(true);
    expect(screen.getByTestId('score-summary')).toBeVisible();
  });

  it('Practice Again resets the session to question 1 (AC8)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-animals'));

    for (let i = 0; i < 6; i++) {
      const card = screen.getByTestId('question-card');
      const kind = card.getAttribute('data-question-kind');

      if (kind === 'image-choice') {
        await user.click(screen.getByTestId('option-0'));
      } else {
        await user.click(screen.getByTestId('submit-answer-button'));
      }

      await user.click(screen.getByTestId('next-button'));
    }

    await user.click(screen.getByTestId('practice-again-button'));

    expect(screen.getByTestId('question-progress')).toHaveTextContent('1');
  });

  it('Choose another topic returns to the topic list (AC9)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-animals'));

    for (let i = 0; i < 6; i++) {
      const card = screen.getByTestId('question-card');
      const kind = card.getAttribute('data-question-kind');

      if (kind === 'image-choice') {
        await user.click(screen.getByTestId('option-0'));
      } else {
        await user.click(screen.getByTestId('submit-answer-button'));
      }

      await user.click(screen.getByTestId('next-button'));
    }

    await user.click(screen.getByTestId('choose-topic-button'));

    expect(screen.getByTestId('topic-card-g2-animals')).toBeVisible();
    expect(screen.getByTestId('topic-card-g2-colors')).toBeVisible();
  });
});
