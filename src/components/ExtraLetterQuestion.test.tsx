import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExtraLetterQuestion from './ExtraLetterQuestion';
import type { ExtraLetterQuestion as ExtraLetterQuestionType } from '../types';

const QUESTION: ExtraLetterQuestionType = {
  id: 'q1',
  topicId: 't1',
  kind: 'extra-letter',
  correctWord: 'bird',
  displayLetters: ['b', 'i', 'r', 's', 'd'],
  extraIndex: 3,
  explanation: 'Con chim tiếng Anh là "bird". Chữ cái thừa là "s".',
};

describe('ExtraLetterQuestion', () => {
  it('renders one clickable tile per display letter (AC14)', () => {
    render(<ExtraLetterQuestion question={QUESTION} selectedLetterIndex={null} onSelectLetter={vi.fn()} />);

    expect(screen.getByTestId('letter-tile-0')).toHaveTextContent('b');
    expect(screen.getByTestId('letter-tile-1')).toHaveTextContent('i');
    expect(screen.getByTestId('letter-tile-2')).toHaveTextContent('r');
    expect(screen.getByTestId('letter-tile-3')).toHaveTextContent('s');
    expect(screen.getByTestId('letter-tile-4')).toHaveTextContent('d');
  });

  it('calls onSelectLetter with the clicked tile index', async () => {
    const user = userEvent.setup();
    const onSelectLetter = vi.fn();
    render(
      <ExtraLetterQuestion question={QUESTION} selectedLetterIndex={null} onSelectLetter={onSelectLetter} />,
    );

    await user.click(screen.getByTestId('letter-tile-3'));

    expect(onSelectLetter).toHaveBeenCalledWith(3);
  });

  it('disables every tile once answered', () => {
    render(<ExtraLetterQuestion question={QUESTION} selectedLetterIndex={3} onSelectLetter={vi.fn()} />);

    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`letter-tile-${i}`)).toBeDisabled();
    }
  });

  it('shows the dart flourish only on the correct tile when clicked correctly (AC14)', () => {
    render(<ExtraLetterQuestion question={QUESTION} selectedLetterIndex={3} onSelectLetter={vi.fn()} />);

    expect(screen.getByTestId('letter-tile-3').querySelector('.dart-arrow')).not.toBeNull();
    expect(screen.getByTestId('letter-tile-0').querySelector('.dart-arrow')).toBeNull();
  });

  it('does not show the dart flourish when the wrong tile was clicked', () => {
    render(<ExtraLetterQuestion question={QUESTION} selectedLetterIndex={0} onSelectLetter={vi.fn()} />);

    expect(screen.getByTestId('letter-tile-0').querySelector('.dart-arrow')).toBeNull();
    expect(screen.getByTestId('letter-tile-3').querySelector('.dart-arrow')).toBeNull();
  });
});
