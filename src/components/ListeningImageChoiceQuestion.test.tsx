import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListeningImageChoiceQuestion from './ListeningImageChoiceQuestion';
import type { ListeningImageChoiceQuestion as ListeningImageChoiceQuestionType } from '../types';

const QUESTION: ListeningImageChoiceQuestionType = {
  id: 'q1',
  topicId: 't1',
  kind: 'listening-image-choice',
  word: 'cat',
  options: ['🐱', '🐶', '🐟', '🐦'],
  correctIndex: 0,
  explanation: 'Con mèo tiếng Anh là "cat".',
};

describe('ListeningImageChoiceQuestion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the play-audio-button and 4 emoji options, without revealing the word as text', () => {
    render(<ListeningImageChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(screen.getByTestId('play-audio-button')).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('🐱');
    expect(screen.getByTestId('option-1')).toHaveTextContent('🐶');
    expect(screen.getByTestId('option-2')).toHaveTextContent('🐟');
    expect(screen.getByTestId('option-3')).toHaveTextContent('🐦');
    expect(screen.queryByText('cat')).not.toBeInTheDocument();
  });

  it('calls speechSynthesis.speak with the target word via the play-audio-button, without throwing', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ListeningImageChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    await user.click(screen.getByTestId('play-audio-button'));

    expect(speakSpy).toHaveBeenCalledOnce();
    expect(screen.getByTestId('play-audio-button')).toHaveTextContent('Nghe lại');
  });

  it('calls onSelectOption with the clicked index', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(<ListeningImageChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={onSelectOption} />);

    await user.click(screen.getByTestId('option-2'));

    expect(onSelectOption).toHaveBeenCalledWith(2);
  });

  it('disables every option once answered', () => {
    render(<ListeningImageChoiceQuestion question={QUESTION} selectedIndex={1} onSelectOption={vi.fn()} />);

    expect(screen.getByTestId('option-0')).toBeDisabled();
    expect(screen.getByTestId('option-1')).toBeDisabled();
    expect(screen.getByTestId('option-2')).toBeDisabled();
    expect(screen.getByTestId('option-3')).toBeDisabled();
  });
});
