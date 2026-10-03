import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ReviewCard from './ReviewCard';
import { recordWrongExamQuestion, resetForTests } from '../lib/engagement/store';
import type { GrammarMcqQuestion } from '../types/exam';

const Q: GrammarMcqQuestion = {
  id: 'q1',
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: 'Pick one',
  options: ['a', 'b', 'c', 'd'],
  correctIndex: 0,
  explanation: 'e',
};

const YESTERDAY = new Date(Date.now() - 86_400_000);

beforeEach(() => resetForTests());

describe('ReviewCard', () => {
  it('renders nothing when no review items are due', () => {
    render(<ReviewCard gradeId="grade-4" onStartReview={vi.fn()} />);
    expect(screen.queryByTestId('review-card')).not.toBeInTheDocument();
  });

  it('shows the due count and starts the review session', () => {
    recordWrongExamQuestion('grade-4', Q, YESTERDAY); // due today
    const onStartReview = vi.fn();
    render(<ReviewCard gradeId="grade-4" onStartReview={onStartReview} />);
    expect(screen.getByTestId('review-card')).toHaveTextContent('1 câu');
    fireEvent.click(screen.getByTestId('start-review'));
    expect(onStartReview).toHaveBeenCalledTimes(1);
  });

  it('does not render items due in the future', () => {
    recordWrongExamQuestion('grade-4', Q); // due tomorrow
    render(<ReviewCard gradeId="grade-4" onStartReview={vi.fn()} />);
    expect(screen.queryByTestId('review-card')).not.toBeInTheDocument();
  });
});
