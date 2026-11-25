import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CountingImageQuestion from './CountingImageQuestion';
import type { CountingImageQuestion as CountingImageQuestionType } from '../types';

const IMAGE_TO_COUNT_QUESTION: CountingImageQuestionType = {
  id: 'q1',
  topicId: 't1',
  kind: 'counting-image',
  direction: 'image-to-count',
  prompt: { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
  promptWordId: 'fixture-cat',
  options: [
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 2 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 3 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 4 },
  ],
  correctIndex: 0,
  explanation: 'Đếm số lượng trong hình rồi chọn "3 cats".',
};

const COUNT_TO_IMAGE_QUESTION: CountingImageQuestionType = {
  ...IMAGE_TO_COUNT_QUESTION,
  id: 'q2',
  direction: 'count-to-image',
};

describe('CountingImageQuestion', () => {
  it('renders a repeated-emoji prompt and 4 text options for image-to-count (AC13)', () => {
    render(
      <CountingImageQuestion
        question={IMAGE_TO_COUNT_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByText('🐱🐱🐱')).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('3 cats');
    expect(screen.getByTestId('option-1')).toHaveTextContent('2 cats');
    expect(screen.getByTestId('option-2')).toHaveTextContent('3 dogs');
    expect(screen.getByTestId('option-3')).toHaveTextContent('4 dogs');
  });

  it('renders a text prompt and 4 emoji options for count-to-image (AC12)', () => {
    render(
      <CountingImageQuestion
        question={COUNT_TO_IMAGE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByText('3 cats')).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('🐱🐱🐱');
    expect(screen.getByTestId('option-1')).toHaveTextContent('🐱🐱');
  });

  it('calls onSelectOption with the clicked index', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(
      <CountingImageQuestion
        question={IMAGE_TO_COUNT_QUESTION}
        selectedIndex={null}
        onSelectOption={onSelectOption}
      />,
    );

    await user.click(screen.getByTestId('option-2'));

    expect(onSelectOption).toHaveBeenCalledWith(2);
  });

  it('disables every option once answered', () => {
    render(
      <CountingImageQuestion
        question={IMAGE_TO_COUNT_QUESTION}
        selectedIndex={1}
        onSelectOption={vi.fn()}
      />,
    );

    expect(screen.getByTestId('option-0')).toBeDisabled();
    expect(screen.getByTestId('option-1')).toBeDisabled();
    expect(screen.getByTestId('option-2')).toBeDisabled();
    expect(screen.getByTestId('option-3')).toBeDisabled();
  });

  it('CR-145: prompt shows bespoke counting art when the asset exists (cat|4)', () => {
    render(
      <CountingImageQuestion
        question={{
          ...IMAGE_TO_COUNT_QUESTION,
          prompt: { word: 'cat', plural: 'cats', emoji: '🐱', count: 4 },
        }}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    const visual = document.querySelector('[data-emoji-mode="image"]');
    expect(visual).not.toBeNull();
    expect(visual?.querySelector('img')?.getAttribute('src')).toContain('/images/counting/');
  });

  it('CR-145: options stay emoji when any option resolves no art (all-or-nothing)', () => {
    render(
      <CountingImageQuestion
        question={{
          ...COUNT_TO_IMAGE_QUESTION,
          options: [
            { word: 'cat', plural: 'cats', emoji: '🐱', count: 4 }, // art resolves (repeat tier)
            { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 }, // art resolves
            { word: 'zzflargle', plural: 'zzflargles', emoji: '❓', count: 2 }, // no bank word, no art
            { word: 'dog', plural: 'dogs', emoji: '🐶', count: 3 }, // art resolves
          ],
        }}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    // 1 of 4 options has no art at either tier - the whole set falls back.
    expect(document.querySelector('[data-emoji-mode="image"]')).toBeNull();
  });

  it('CR-145 r225: options render repeated concept art when every option resolves it', () => {
    render(
      <CountingImageQuestion
        question={COUNT_TO_IMAGE_QUESTION}
        selectedIndex={null}
        onSelectOption={vi.fn()}
      />,
    );

    // cat/dog resolve concept art by word text - count copies per option.
    const visuals = document.querySelectorAll('[data-emoji-mode="image"]');
    expect(visuals.length).toBe(4);
    expect(visuals[0]?.querySelectorAll('img').length).toBe(3);
    expect(visuals[0]?.querySelector('img')?.getAttribute('src')).toContain('/images/');
  });
});
