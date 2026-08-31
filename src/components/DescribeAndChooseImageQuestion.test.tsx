import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DescribeAndChooseImageQuestion from './DescribeAndChooseImageQuestion';
import type { DescribeAndChooseImageQuestion as DescribeAndChooseImageQuestionType } from '../types';

const COUNT_QUESTION: DescribeAndChooseImageQuestionType = {
  id: 'q1',
  topicId: 't1',
  kind: 'describe-and-choose-image',
  descriptionType: 'count',
  sentence: 'There are 3 cats.',
  options: [
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 2 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 3 },
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 4 },
  ],
  correctIndex: 0,
  explanation: 'Chọn hình có 3 cats.',
};

const NEGATION_QUESTION: DescribeAndChooseImageQuestionType = {
  ...COUNT_QUESTION,
  id: 'q2',
  descriptionType: 'negation',
  sentence: "There isn't a cat here.",
  options: [
    { word: 'dog', plural: 'dogs', emoji: '🐶', count: 2 },
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 1 },
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 3 },
    { word: 'cat', plural: 'cats', emoji: '🐱', count: 4 },
  ],
  correctIndex: 0,
};

describe('DescribeAndChooseImageQuestion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the sentence and 4 repeated-emoji image options for a count item', () => {
    render(<DescribeAndChooseImageQuestion question={COUNT_QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(screen.getByText('There are 3 cats.')).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('🐱🐱🐱');
    expect(screen.getByTestId('option-1')).toHaveTextContent('🐱🐱');
    expect(screen.getByTestId('option-2')).toHaveTextContent('🐶🐶🐶');
    expect(screen.getByTestId('option-3')).toHaveTextContent('🐶🐶🐶🐶');
  });

  it('renders the negation sentence and its 4 image options', () => {
    render(<DescribeAndChooseImageQuestion question={NEGATION_QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    expect(screen.getByText("There isn't a cat here.")).toBeVisible();
    expect(screen.getByTestId('option-0')).toHaveTextContent('🐶🐶');
    expect(screen.getByTestId('option-1')).toHaveTextContent('🐱');
  });

  it('calls onSelectOption with the clicked index', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(<DescribeAndChooseImageQuestion question={COUNT_QUESTION} selectedIndex={null} onSelectOption={onSelectOption} />);

    await user.click(screen.getByTestId('option-2'));

    expect(onSelectOption).toHaveBeenCalledWith(2);
  });

  it('disables every option once answered', () => {
    render(<DescribeAndChooseImageQuestion question={COUNT_QUESTION} selectedIndex={1} onSelectOption={vi.fn()} />);

    expect(screen.getByTestId('option-0')).toBeDisabled();
    expect(screen.getByTestId('option-1')).toBeDisabled();
    expect(screen.getByTestId('option-2')).toBeDisabled();
    expect(screen.getByTestId('option-3')).toBeDisabled();
  });

  it('calls speechSynthesis.speak via the play-audio-button without throwing', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DescribeAndChooseImageQuestion question={COUNT_QUESTION} selectedIndex={null} onSelectOption={vi.fn()} />);

    await user.click(screen.getByTestId('play-audio-button'));

    expect(speakSpy).toHaveBeenCalledOnce();
    expect(screen.getByTestId('play-audio-button')).toHaveTextContent('Nghe lại');
  });
});
