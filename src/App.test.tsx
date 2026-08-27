import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

/**
 * Answers whichever question kind is currently on screen so tests can drive
 * a full session without hardcoding which kinds land in which slot (the
 * pool selection is seeded but topics differ in eligible kinds - see
 * plan.md v3 AC15).
 */
async function answerCurrentQuestion(user: ReturnType<typeof userEvent.setup>): Promise<string> {
  const card = screen.getByTestId('question-card');
  const kind = card.getAttribute('data-question-kind') ?? '';

  if (kind === 'image-choice' || kind === 'counting-image') {
    await user.click(screen.getByTestId('option-0'));
  } else if (kind === 'listening-fill-blank') {
    await user.click(screen.getByTestId('submit-answer-button'));
  } else if (kind === 'extra-letter') {
    await user.click(screen.getByTestId('letter-tile-0'));
  }

  return kind;
}

async function completeSession(user: ReturnType<typeof userEvent.setup>): Promise<Set<string>> {
  const seenKinds = new Set<string>();

  while (screen.queryByTestId('question-card')) {
    const kind = await answerCurrentQuestion(user);
    seenKinds.add(kind);
    await user.click(screen.getByTestId('next-button'));
  }

  return seenKinds;
}

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
    expect(screen.getAllByTestId(/^topic-card-/).length).toBeGreaterThanOrEqual(10);

    await user.click(screen.getByTestId('back-to-grades'));
    expect(screen.getByTestId('grade-card-grade-2')).toBeVisible();

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-animals'));

    const questionCard = screen.getByTestId('question-card');
    expect(questionCard).toHaveAttribute('data-question-kind');
    expect(screen.getByTestId('question-progress')).toHaveTextContent('1');
  });

  it('a non-countable topic session mixes image-choice, listening-fill-blank and extra-letter (AC3, AC15)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-colors'));

    const seenKinds = await completeSession(user);

    expect(seenKinds.has('image-choice')).toBe(true);
    expect(seenKinds.has('listening-fill-blank')).toBe(true);
    expect(seenKinds.has('extra-letter')).toBe(true);
    expect(seenKinds.has('counting-image')).toBe(false);
    expect(screen.getByTestId('score-summary')).toBeVisible();
  });

  it('a countable topic session includes all 4 kinds including both counting-image directions (AC3, AC15)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-animals'));

    const seenDirections = new Set<string>();
    const seenKinds = new Set<string>();

    while (screen.queryByTestId('question-card')) {
      const card = screen.getByTestId('question-card');
      const kind = card.getAttribute('data-question-kind') ?? '';
      const direction = card.getAttribute('data-count-direction');
      seenKinds.add(kind);
      if (direction) seenDirections.add(direction);

      await answerCurrentQuestion(user);
      await user.click(screen.getByTestId('next-button'));
    }

    expect(seenKinds).toEqual(
      new Set(['image-choice', 'listening-fill-blank', 'counting-image', 'extra-letter']),
    );
    expect(seenDirections).toEqual(new Set(['count-to-image', 'image-to-count']));
  });

  it('Practice Again resets the session to question 1 (AC8)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-colors'));

    await completeSession(user);
    await user.click(screen.getByTestId('practice-again-button'));

    expect(screen.getByTestId('question-progress')).toHaveTextContent('1');
  });

  it('Choose another topic returns to the topic list (AC9)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('grade-card-grade-2'));
    await user.click(screen.getByTestId('topic-card-g2-colors'));

    await completeSession(user);
    await user.click(screen.getByTestId('choose-topic-button'));

    expect(screen.getByTestId('topic-card-g2-animals')).toBeVisible();
    expect(screen.getByTestId('topic-card-g2-colors')).toBeVisible();
  });
});
