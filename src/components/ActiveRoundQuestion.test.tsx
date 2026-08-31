import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActiveRoundQuestion from './ActiveRoundQuestion';
import { createSession } from '../lib/practiceSession';
import { EXTRA_LETTER_QUESTION } from './questionCardFixtures';

describe('ActiveRoundQuestion', () => {
  it('renders the session current question through QuestionCard with 1-based numbering', () => {
    const session = createSession([EXTRA_LETTER_QUESTION]);

    render(
      <ActiveRoundQuestion
        session={session}
        onSubmitOption={vi.fn()}
        onSubmitListening={vi.fn()}
        onSubmitExtraLetter={vi.fn()}
        onSubmitPronunciation={vi.fn()}
        onNextQuestion={vi.fn()}
      />,
    );

    expect(screen.getByTestId('question-progress')).toHaveTextContent('1');
    expect(screen.getByTestId('question-card')).toHaveAttribute('data-question-kind', 'extra-letter');
  });

  it('routes an extra-letter tile click to onSubmitExtraLetter', async () => {
    const session = createSession([EXTRA_LETTER_QUESTION]);
    const onSubmitExtraLetter = vi.fn();
    const user = userEvent.setup();

    render(
      <ActiveRoundQuestion
        session={session}
        onSubmitOption={vi.fn()}
        onSubmitListening={vi.fn()}
        onSubmitExtraLetter={onSubmitExtraLetter}
        onSubmitPronunciation={vi.fn()}
        onNextQuestion={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('letter-tile-3'));

    expect(onSubmitExtraLetter).toHaveBeenCalledWith(3);
  });

  it('renders nothing once the session has no current question', () => {
    const session = { ...createSession([EXTRA_LETTER_QUESTION]), currentIndex: 1 };

    const { container } = render(
      <ActiveRoundQuestion
        session={session}
        onSubmitOption={vi.fn()}
        onSubmitListening={vi.fn()}
        onSubmitExtraLetter={vi.fn()}
        onSubmitPronunciation={vi.fn()}
        onNextQuestion={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
