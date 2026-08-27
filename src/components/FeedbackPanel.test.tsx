import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeedbackPanel from './FeedbackPanel';

describe('FeedbackPanel', () => {
  it('shows the correct-word testid for listening-fill-blank regardless of correctness (AC5)', () => {
    render(
      <FeedbackPanel
        kind="listening-fill-blank"
        isCorrect={false}
        correctWord="rabbit"
        explanation='Con thỏ tiếng Anh là "rabbit".'
      />,
    );

    const feedback = screen.getByTestId('answer-feedback');
    expect(feedback).toHaveTextContent('rabbit');
    expect(feedback).toHaveTextContent('Chưa đúng rồi');
  });

  it('shows correct word and explanation when the listening answer was correct', () => {
    render(
      <FeedbackPanel
        kind="listening-fill-blank"
        isCorrect={true}
        correctWord="rabbit"
        explanation='Con thỏ tiếng Anh là "rabbit".'
      />,
    );

    const feedback = screen.getByTestId('answer-feedback');
    expect(feedback).toHaveTextContent('rabbit');
    expect(feedback).toHaveTextContent('Chính xác');
  });

  it('does not set the answer-feedback testid for image-choice questions', () => {
    render(
      <FeedbackPanel kind="image-choice" isCorrect={true} correctWord="cat" explanation="Explanation." />,
    );

    expect(screen.queryByTestId('answer-feedback')).not.toBeInTheDocument();
    expect(screen.getByText('cat')).toBeVisible();
  });

  it('does not set the answer-feedback testid for counting-image questions (AC12/AC13 reuse the image-choice pattern)', () => {
    render(
      <FeedbackPanel kind="counting-image" isCorrect={true} correctWord="3 cats" explanation="Explanation." />,
    );

    expect(screen.queryByTestId('answer-feedback')).not.toBeInTheDocument();
  });

  it('sets the answer-feedback testid and reveals the correct word for extra-letter questions (AC14)', () => {
    render(
      <FeedbackPanel
        kind="extra-letter"
        isCorrect={false}
        correctWord="bird"
        explanation='Con chim tiếng Anh là "bird". Chữ cái thừa là "s".'
      />,
    );

    const feedback = screen.getByTestId('answer-feedback');
    expect(feedback).toHaveTextContent('bird');
    expect(feedback).toHaveTextContent('Chữ cái thừa là "s"');
  });
});
