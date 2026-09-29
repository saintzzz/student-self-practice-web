import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PicturePairMatchingQuestion from './PicturePairMatchingQuestion';
import type { PicturePairMatchingQuestion as PicturePairMatchingQuestionType } from '../types';

const QUESTION: PicturePairMatchingQuestionType = {
  id: 'q-ppm-1',
  topicId: 't1',
  kind: 'picture-pair-matching',
  pairs: [
    { word: 'cat', emoji: '🐱', wordId: 'fixture-cat' },
    { word: 'dog', emoji: '🐶', wordId: 'fixture-dog' },
    { word: 'fish', emoji: '🐟', wordId: 'fixture-fish' },
    { word: 'bird', emoji: '🐦', wordId: 'fixture-bird' },
  ],
  tiles: [
    { pairIndex: 0, tileType: 'word', label: 'cat' },
    { pairIndex: 0, tileType: 'picture', label: '🐱' },
    { pairIndex: 1, tileType: 'word', label: 'dog' },
    { pairIndex: 1, tileType: 'picture', label: '🐶' },
    { pairIndex: 2, tileType: 'word', label: 'fish' },
    { pairIndex: 2, tileType: 'picture', label: '🐟' },
    { pairIndex: 3, tileType: 'word', label: 'bird' },
    { pairIndex: 3, tileType: 'picture', label: '🐦' },
  ],
  explanation: 'Các cặp đúng trong bảng này là: cat - 🐱, dog - 🐶, fish - 🐟, bird - 🐦.',
};

describe('PicturePairMatchingQuestion', () => {
  it('renders exactly 8 pair-tile-{index} elements and the mistake counter at 0/3', () => {
    render(<PicturePairMatchingQuestion question={QUESTION} hasAnswered={false} onSubmit={vi.fn()} />);

    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`pair-tile-${i}`)).toBeVisible();
    }
    expect(screen.getByTestId('pair-matching-mistake-count')).toHaveTextContent('Sai: 0/3');
  });

  it('CR-02: picture tiles announce their emoji as accessible name; word tiles keep their text label', () => {
    render(<PicturePairMatchingQuestion question={QUESTION} hasAnswered={false} onSubmit={vi.fn()} />);

    // Tiles 1,3,5,7 are picture tiles (see QUESTION.tiles order).
    for (const i of [1, 3, 5, 7]) {
      const emoji = QUESTION.tiles[i]!.label;
      expect(screen.getByRole('button', { name: emoji })).toBe(screen.getByTestId(`pair-tile-${i}`));
    }
    for (const i of [0, 2, 4, 6]) {
      const word = QUESTION.tiles[i]!.label;
      expect(screen.getByRole('button', { name: word })).toBe(screen.getByTestId(`pair-tile-${i}`));
    }
  });

  it('a full correct playthrough matches all 4 pairs and calls onSubmit(true) exactly once', { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PicturePairMatchingQuestion question={QUESTION} hasAnswered={false} onSubmit={onSubmit} />);

    await user.click(screen.getByTestId('pair-tile-0')); // cat
    await user.click(screen.getByTestId('pair-tile-1')); // 🐱
    await user.click(screen.getByTestId('pair-tile-2')); // dog
    await user.click(screen.getByTestId('pair-tile-3')); // 🐶
    await user.click(screen.getByTestId('pair-tile-4')); // fish
    await user.click(screen.getByTestId('pair-tile-5')); // 🐟
    await user.click(screen.getByTestId('pair-tile-6')); // bird
    await user.click(screen.getByTestId('pair-tile-7')); // 🐦

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('pair-matching-mistake-count')).toHaveTextContent('Sai: 0/3');
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`pair-tile-${i}`)).toHaveAttribute('data-correct', 'true');
      expect(screen.getByTestId(`pair-tile-${i}`)).toBeDisabled();
    }
  });

  it('exceeding the 3-mistake budget calls onSubmit(false) exactly once and reveals every tile as correct', { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PicturePairMatchingQuestion question={QUESTION} hasAnswered={false} onSubmit={onSubmit} />);

    // 4 guaranteed-wrong word-vs-word attempts (cat vs dog, repeated).
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByTestId('pair-tile-0')); // cat
      await user.click(screen.getByTestId('pair-tile-2')); // dog
    }

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(false);
    expect(screen.getByTestId('pair-matching-mistake-count')).toHaveTextContent('Sai: 4/3');
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`pair-tile-${i}`)).toHaveAttribute('data-correct', 'true');
      expect(screen.getByTestId(`pair-tile-${i}`)).toBeDisabled();
    }
  });

  it('ignores clicks once hasAnswered is true', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PicturePairMatchingQuestion question={QUESTION} hasAnswered onSubmit={onSubmit} />);

    await user.click(screen.getByTestId('pair-tile-0'));
    await user.click(screen.getByTestId('pair-tile-1'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('pair-matching-mistake-count')).toHaveTextContent('Sai: 0/3');
  });
});
