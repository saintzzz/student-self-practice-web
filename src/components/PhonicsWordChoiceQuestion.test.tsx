import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhonicsWordChoiceQuestion from './PhonicsWordChoiceQuestion';
import type { PhonicsWordChoiceQuestion as PhonicsWordChoiceQuestionType } from '../types';
import { getWordVisual } from '../lib/emoji/wordVisual';

vi.mock('../lib/emoji/wordVisual', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/emoji/wordVisual')>();
  return { ...mod, getWordVisual: vi.fn(mod.getWordVisual) };
});

const QUESTION: PhonicsWordChoiceQuestionType = {
  id: 'q-pwc-cat-a',
  topicId: 't1',
  kind: 'phonics-word-choice',
  sound: 'c',
  word: 'cat',
  wordId: 'fixture-cat',
  options: ['🐱', '🐶', '🐟', '🐦'],
  optionWordIds: ['fixture-cat', 'fixture-dog', 'fixture-fish', 'fixture-bird'],
  correctIndex: 0,
  explanation: '"cat" bắt đầu bằng âm "c".',
};

describe('PhonicsWordChoiceQuestion', () => {
  it('renders the sound prompt, a listen button, and 4 picture options without revealing the word', () => {
    render(<PhonicsWordChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(screen.getByText(/Nghe âm rồi chọn đúng hình/)).toBeVisible();
    expect(screen.getByText('c')).toBeVisible();
    expect(screen.getByTestId('play-audio-button')).toBeVisible();
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`option-${i}`)).toBeVisible();
    }
    expect(screen.queryByText('cat')).not.toBeInTheDocument();
  });

  it('picture options announce their emoji as accessible names (CR-02 pattern)', () => {
    render(<PhonicsWordChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(screen.getByRole('button', { name: '🐱' })).toBe(screen.getByTestId('option-0'));
    expect(screen.getByRole('button', { name: '🐶' })).toBe(screen.getByTestId('option-1'));
    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`option-${i}`)).not.toHaveAccessibleName(expect.stringContaining('cat'));
    }
  });

  it('speaks "sound, as in example" (not the bare letter name) via the listen button', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<PhonicsWordChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    await user.click(screen.getByTestId('play-audio-button'));
    expect(speakSpy).toHaveBeenCalledOnce();
    const utterance = speakSpy.mock.calls[0]![0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('c, as in cat');
  });

  it('calls onSelectOption with the clicked index', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(<PhonicsWordChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={onSelectOption} />);

    await user.click(screen.getByTestId('option-3'));
    expect(onSelectOption).toHaveBeenCalledWith(3);
  });

  it('drops ALL four options to the svg fallback when any one photo fails (all-or-nothing group)', () => {
    const mockedGetWordVisual = vi.mocked(getWordVisual);
    const urls = new Map(
      QUESTION.optionWordIds.map((id, i) => [
        id,
        { emoji: QUESTION.options[i]!, imageUrl: `/images/vocab/${id}.webp` },
      ]),
    );
    mockedGetWordVisual.mockImplementation((wordId) => urls.get(wordId));

    render(<PhonicsWordChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    for (let i = 0; i < 4; i++) {
      const visual = screen.getByTestId(`option-${i}`).querySelector('[data-emoji-visual]')!;
      expect(visual).toHaveAttribute('data-emoji-mode', 'image');
    }

    const failingImg = screen.getByTestId('option-2').querySelector('[data-emoji-visual] img')!;
    fireEvent.error(failingImg);

    for (let i = 0; i < 4; i++) {
      const visual = screen.getByTestId(`option-${i}`).querySelector('[data-emoji-visual]')!;
      expect(visual, `option-${i} must fall back to svg, not blank`).toHaveAttribute('data-emoji-mode', 'svg');
    }
  });
});
