import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhonicsRhymeChoiceQuestion from './PhonicsRhymeChoiceQuestion';
import { PHONICS_RHYME_CHOICE_QUESTION } from './questionCardFixtures';

describe('PhonicsRhymeChoiceQuestion', () => {
  it('renders the rhyme prompt, the prompt word with its picture, a listen button, and 4 word options', () => {
    render(
      <PhonicsRhymeChoiceQuestion
        question={PHONICS_RHYME_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByText(/có vần giống từ này/)).toBeVisible();
    expect(screen.getByText('cat')).toBeVisible();
    expect(screen.getByTestId('play-audio-button')).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('hat');
    expect(screen.getByTestId('option-3')).toHaveTextContent('bird');
  });

  it('option buttons carry their word text as the accessible name', () => {
    render(
      <PhonicsRhymeChoiceQuestion
        question={PHONICS_RHYME_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'hat' })).toBe(screen.getByTestId('option-0'));
    expect(screen.getByRole('button', { name: 'bird' })).toBe(screen.getByTestId('option-3'));
  });

  it('calls onSelectOption with the clicked index', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(
      <PhonicsRhymeChoiceQuestion
        question={PHONICS_RHYME_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={onSelectOption}
      />,
    );

    await user.click(screen.getByTestId('option-1'));
    expect(onSelectOption).toHaveBeenCalledWith(1);
  });

  it('disables every option once answered', () => {
    render(
      <PhonicsRhymeChoiceQuestion
        question={PHONICS_RHYME_CHOICE_QUESTION}
        selectedIndex={2}
        onSelectOption={vi.fn()}
      />,
    );

    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`option-${i}`)).toBeDisabled();
    }
  });
});
