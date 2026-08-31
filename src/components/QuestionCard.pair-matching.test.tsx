import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionCard from './QuestionCard';
import { PICTURE_PAIR_MATCHING_QUESTION, noopHandlers } from './questionCardFixtures';

describe('QuestionCard (picture-pair-matching)', () => {
  it('sets the picture-pair-matching kind attribute and renders 8 pair tiles', () => {
    render(
      <QuestionCard
        question={PICTURE_PAIR_MATCHING_QUESTION}
        questionNumber={7}
        totalQuestions={10}
        currentAnswer={null}
        {...noopHandlers}
      />,
    );

    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'picture-pair-matching');
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`pair-tile-${i}`)).toBeVisible();
    }
    expect(screen.getByTestId('next-button')).toBeDisabled();
  });

  it('routes a resolved board (all 4 pairs found) to onSubmitPairMatching(true)', async () => {
    const onSubmitPairMatching = vi.fn();
    const user = userEvent.setup();
    render(
      <QuestionCard
        question={PICTURE_PAIR_MATCHING_QUESTION}
        questionNumber={7}
        totalQuestions={10}
        currentAnswer={null}
        {...noopHandlers}
        onSubmitPairMatching={onSubmitPairMatching}
      />,
    );

    // Fixture tiles: [cat(w0), 🐟(p2), dog(w1), 🐱(p0), bird(w3), 🐶(p1), fish(w2), 🐦(p3)]
    await user.click(screen.getByTestId('pair-tile-0')); // cat
    await user.click(screen.getByTestId('pair-tile-3')); // 🐱
    await user.click(screen.getByTestId('pair-tile-2')); // dog
    await user.click(screen.getByTestId('pair-tile-5')); // 🐶
    await user.click(screen.getByTestId('pair-tile-6')); // fish
    await user.click(screen.getByTestId('pair-tile-1')); // 🐟
    await user.click(screen.getByTestId('pair-tile-4')); // bird
    await user.click(screen.getByTestId('pair-tile-7')); // 🐦

    await waitFor(() => expect(onSubmitPairMatching).toHaveBeenCalledWith(true));
  });

  it('shows the shared FeedbackPanel (without the answer-feedback testid) once answered', () => {
    render(
      <QuestionCard
        question={PICTURE_PAIR_MATCHING_QUESTION}
        questionNumber={7}
        totalQuestions={10}
        currentAnswer={{ isCorrect: true }}
        {...noopHandlers}
      />,
    );

    expect(screen.queryByTestId('answer-feedback')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-button')).toBeEnabled();
  });
});
