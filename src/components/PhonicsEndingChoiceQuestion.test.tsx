import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhonicsEndingChoiceQuestion from './PhonicsEndingChoiceQuestion';
import { PHONICS_BLEND_CHOICE_QUESTION, PHONICS_FINAL_CHOICE_QUESTION } from './questionCardFixtures';

describe('PhonicsEndingChoiceQuestion - phonics-final-choice', () => {
  it('renders the final-sound prompt, the word with its picture, a listen button, and 4 sound options', () => {
    render(
      <PhonicsEndingChoiceQuestion
        question={PHONICS_FINAL_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByText(/kết thúc bằng âm nào/)).toBeVisible();
    expect(screen.getByText('cat')).toBeVisible();
    expect(screen.getByTestId('play-audio-button')).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('t');
    expect(screen.getByTestId('option-3')).toHaveTextContent('s');
  });

  it('options carry an accessible name naming the sound (âm X)', () => {
    render(
      <PhonicsEndingChoiceQuestion
        question={PHONICS_FINAL_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'âm t' })).toBe(screen.getByTestId('option-0'));
    expect(screen.getByRole('button', { name: 'âm s' })).toBe(screen.getByTestId('option-3'));
  });

  it('calls onSelectOption with the clicked index and disables every option once answered', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    const { unmount } = render(
      <PhonicsEndingChoiceQuestion
        question={PHONICS_FINAL_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={onSelectOption}
      />,
    );
    await user.click(screen.getByTestId('option-2'));
    expect(onSelectOption).toHaveBeenCalledWith(2);
    unmount();

    render(
      <PhonicsEndingChoiceQuestion
        question={PHONICS_FINAL_CHOICE_QUESTION}
        selectedIndex={1}
        onSelectOption={vi.fn()}
      />,
    );
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`option-${i}`)).toBeDisabled();
    }
  });
});

describe('PhonicsEndingChoiceQuestion - phonics-blend-choice', () => {
  it('renders the blend prompt and 4 cluster options', () => {
    render(
      <PhonicsEndingChoiceQuestion
        question={PHONICS_BLEND_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByText(/bắt đầu bằng cụm âm nào/)).toBeVisible();
    expect(screen.getByText('frog')).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('fr');
    expect(screen.getByTestId('option-3')).toHaveTextContent('tr');
  });

  it('options carry an accessible name naming the cluster (cụm X)', () => {
    render(
      <PhonicsEndingChoiceQuestion
        question={PHONICS_BLEND_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'cụm fr' })).toBe(screen.getByTestId('option-0'));
    expect(screen.getByRole('button', { name: 'cụm st' })).toBe(screen.getByTestId('option-2'));
  });

  it('calls speechSynthesis.speak with the word via the listen button', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <PhonicsEndingChoiceQuestion
        question={PHONICS_BLEND_CHOICE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('play-audio-button'));
    expect(speakSpy).toHaveBeenCalledOnce();
  });
});
