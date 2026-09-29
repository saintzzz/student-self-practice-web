import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageChoiceQuestion from './ImageChoiceQuestion';
import { getWordVisual } from '../lib/emoji/wordVisual';
import type { ImageChoiceQuestion as ImageChoiceQuestionType } from '../types';

vi.mock('../lib/emoji/wordVisual', () => ({
  getWordVisual: vi.fn(() => undefined),
}));

const mockGetWordVisual = vi.mocked(getWordVisual);

const QUESTION: ImageChoiceQuestionType = {
  id: 'q1',
  topicId: 't1',
  kind: 'image-choice',
  emoji: '🐱',
  wordId: 'fixture-cat',
  options: ['cat', 'dog', 'fish', 'bird'],
  correctIndex: 0,
  explanation: 'Con mèo tiếng Anh là "cat".',
};

describe('ImageChoiceQuestion', () => {
  it('renders the emoji and four option buttons', () => {
    render(<ImageChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(screen.getByText('🐱')).toBeVisible();
    expect(screen.getByTestId('option-0')).toBeVisible();
    expect(screen.getByTestId('option-1')).toBeVisible();
    expect(screen.getByTestId('option-2')).toBeVisible();
    expect(screen.getByTestId('option-3')).toBeVisible();
  });

  it('calls onSelectOption with the clicked index (AC4)', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(
      <ImageChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={onSelectOption} />,
    );

    await user.click(screen.getByTestId('option-1'));

    expect(onSelectOption).toHaveBeenCalledWith(1);
  });

  it('disables every option and reveals the correct one after answering (AC4)', () => {
    render(<ImageChoiceQuestion question={QUESTION} selectedIndex={1} onSelectOption={vi.fn()} />);

    expect(screen.getByTestId('option-0')).toBeDisabled();
    expect(screen.getByTestId('option-1')).toBeDisabled();
    expect(screen.getByTestId('option-2')).toBeDisabled();
    expect(screen.getByTestId('option-3')).toBeDisabled();
  });

  it('looks the prompt photo up by wordId, not by emoji (AC-5.1/AC-5.6)', async () => {
    // Two different ids could share an emoji (sad/cry = 😢), so the lookup
    // MUST be keyed on question.wordId - a regression to an emoji-keyed
    // lookup would still render but silently show the wrong photo.
    mockGetWordVisual.mockImplementation((wordId: string) =>
      wordId === 'fixture-cat'
        ? { emoji: '🐱', imageUrl: '/images/vocab/fixture-cat.webp' }
        : undefined,
    );

    render(<ImageChoiceQuestion question={QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(mockGetWordVisual).toHaveBeenCalledWith('fixture-cat');
    const visual = document.querySelector('[data-emoji-visual="🐱"]')!;
    expect(visual).toHaveAttribute('data-emoji-mode', 'image');
    expect(visual.querySelector('img')).toHaveAttribute('src', '/images/vocab/fixture-cat.webp');
  });
});
