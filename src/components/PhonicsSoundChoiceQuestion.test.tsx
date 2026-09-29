import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhonicsSoundChoiceQuestion from './PhonicsSoundChoiceQuestion';
import type { PhonicsSoundChoiceQuestion as PhonicsSoundChoiceQuestionType } from '../types';

const QUESTION: PhonicsSoundChoiceQuestionType = {
  id: 'q-psc-cat-a',
  topicId: 't1',
  kind: 'phonics-sound-choice',
  word: 'cat',
  wordId: 'fixture-cat',
  emoji: '🐱',
  sound: 'c',
  options: ['c', 's', 'p', 'th'],
  correctIndex: 0,
  explanation: 'Từ "cat" bắt đầu bằng âm "c".',
};

describe('PhonicsSoundChoiceQuestion', () => {
  it('renders the prompt, the word with its picture, a listen button, and 4 sound options', () => {
    render(<PhonicsSoundChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(screen.getByText(/bắt đầu bằng âm nào/)).toBeVisible();
    expect(screen.getByText('cat')).toBeVisible();
    expect(screen.getByTestId('play-audio-button')).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('c');
    expect(screen.getByTestId('option-3')).toHaveTextContent('th');
  });

  it('sound option buttons carry an accessible name naming the sound', () => {
    render(<PhonicsSoundChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'âm c' })).toBe(screen.getByTestId('option-0'));
    expect(screen.getByRole('button', { name: 'âm th' })).toBe(screen.getByTestId('option-3'));
  });

  it('calls onSelectOption with the clicked index', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(<PhonicsSoundChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={onSelectOption} />);

    await user.click(screen.getByTestId('option-2'));
    expect(onSelectOption).toHaveBeenCalledWith(2);
  });

  it('calls speechSynthesis.speak with the word via the listen button', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<PhonicsSoundChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    await user.click(screen.getByTestId('play-audio-button'));
    expect(speakSpy).toHaveBeenCalledOnce();
  });

  it('disables every option once answered', () => {
    render(<PhonicsSoundChoiceQuestion question={QUESTION} selectedIndex={1} onSelectOption={vi.fn()} />);

    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`option-${i}`)).toBeDisabled();
    }
  });
});
