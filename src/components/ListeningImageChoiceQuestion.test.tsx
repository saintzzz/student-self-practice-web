import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListeningImageChoiceQuestion from './ListeningImageChoiceQuestion';
import type { ListeningImageChoiceQuestion as ListeningImageChoiceQuestionType } from '../types';
import { getWordVisual } from '../lib/emoji/wordVisual';

vi.mock('../lib/emoji/wordVisual', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/emoji/wordVisual')>();
  return { ...mod, getWordVisual: vi.fn(mod.getWordVisual) };
});

const QUESTION: ListeningImageChoiceQuestionType = {
  id: 'q1',
  topicId: 't1',
  kind: 'listening-image-choice',
  word: 'cat',
  options: ['🐱', '🐶', '🐟', '🐦'],
  optionWordIds: ['fixture-cat', 'fixture-dog', 'fixture-fish', 'fixture-bird'],
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

  it('CR-02: option buttons announce their picture content (emoji) as accessible names, never the answer word', () => {
    render(<ListeningImageChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    // Same information a sighted user gets: which picture is on the button.
    expect(screen.getByRole('button', { name: '🐱' })).toBe(screen.getByTestId('option-0'));
    expect(screen.getByRole('button', { name: '🐶' })).toBe(screen.getByTestId('option-1'));
    expect(screen.getByRole('button', { name: '🐟' })).toBe(screen.getByTestId('option-2'));
    expect(screen.getByRole('button', { name: '🐦' })).toBe(screen.getByTestId('option-3'));
    // The spoken word must not appear in any accessible name.
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`option-${i}`)).not.toHaveAccessibleName(expect.stringContaining('cat'));
    }
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

  it('drops ALL four options to the svg fallback when any one photo fails (AC-5.3 all-or-nothing)', () => {
    const mockedGetWordVisual = vi.mocked(getWordVisual);
    const urls = new Map(
      QUESTION.optionWordIds.map((id, i) => [
        id,
        { emoji: QUESTION.options[i]!, imageUrl: `/images/vocab/${id}.webp` },
      ]),
    );
    mockedGetWordVisual.mockImplementation((wordId) => urls.get(wordId));

    render(<ListeningImageChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    // All four options start in photo mode.
    for (let i = 0; i < 4; i++) {
      const visual = screen.getByTestId(`option-${i}`).querySelector('[data-emoji-visual]')!;
      expect(visual).toHaveAttribute('data-emoji-mode', 'image');
    }

    // One photo fails -> the whole group remounts into svg mode; no option
    // is ever left showing an empty box.
    const failingImg = screen.getByTestId('option-1').querySelector('[data-emoji-visual] img')!;
    fireEvent.error(failingImg);

    for (let i = 0; i < 4; i++) {
      const visual = screen.getByTestId(`option-${i}`).querySelector('[data-emoji-visual]')!;
      expect(visual, `option-${i} must fall back to svg, not blank`).toHaveAttribute('data-emoji-mode', 'svg');
      expect(visual.querySelector('img')!.getAttribute('src')).toMatch(/^\/emoji\/svg\//);
    }
  });
});
