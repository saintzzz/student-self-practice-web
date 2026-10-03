import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExamScreen from './ExamScreen';
import {
  getDailyQuests,
  getDueReviewItems,
  getReportSnapshot,
  recordWrongExamQuestion,
  resetForTests,
} from '../lib/engagement/store';
import { captureExamWrongAnswers } from '../lib/exam/examSession';
import type { ExamReviewItem } from '../lib/exam/examSession';
import type { GrammarMcqQuestion } from '../types/exam';

const Q = (id: string): GrammarMcqQuestion => ({
  id,
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: `Pick ${id}`,
  options: ['right', 'w1', 'w2', 'w3'],
  correctIndex: 0,
  explanation: `${id} explanation`,
});

const YESTERDAY = new Date(Date.now() - 86_400_000);

beforeEach(() => resetForTests());

describe('captureExamWrongAnswers (AC-28.6)', () => {
  it('captures answered-and-wrong questions, skips unanswered', () => {
    const review: ExamReviewItem[] = [
      { index: 0, question: Q('q1'), answer: { type: 'option', index: 1 }, isCorrect: false },
      { index: 1, question: Q('q2'), answer: null, isCorrect: false },
      { index: 2, question: Q('q3'), answer: { type: 'option', index: 0 }, isCorrect: true },
    ];
    captureExamWrongAnswers('grade-4', review);
    const due = getDueReviewItems('grade-4', new Date(Date.now() + 86_400_000));
    expect(due.map((item) => item.question.id)).toEqual(['q1']);
  });
});

describe('ExamScreen review mode', () => {
  it('AC-28.3/28.7: answering a due item correctly advances its stage and completes the drill quest', () => {
    recordWrongExamQuestion('grade-4', Q('q1'), YESTERDAY); // due today
    render(
      <ExamScreen
        programId="english"
        gradeId="grade-4"
        gradeLabel="Lớp 4"
        mode="review"
        onExit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    fireEvent.click(screen.getByTestId('exam-option-0')); // correct
    fireEvent.click(screen.getByTestId('practice-next'));
    expect(screen.getByTestId('exam-result')).toBeInTheDocument();
    // CR-29: the answer landed in skill stats exactly once
    expect(getReportSnapshot().skills['grade-4']).toEqual([
      { key: 'grammar', correct: 1, total: 1, accuracy: 1 },
    ]);
    // Stage advanced - nothing due today any more
    expect(getDueReviewItems('grade-4')).toHaveLength(0);
    // CR-27 integration: a review session counts as the drill quest
    expect(getDailyQuests().quests.find((q) => q.id === 'drill')!.done).toBe(true);
    // Queue drained - no retry button
    expect(screen.queryByTestId('exam-retry')).not.toBeInTheDocument();
  });

  it('AC-28.4: a wrong review answer resets the item instead of draining it', () => {
    recordWrongExamQuestion('grade-4', Q('q1'), YESTERDAY);
    render(
      <ExamScreen
        programId="english"
        gradeId="grade-4"
        gradeLabel="Lớp 4"
        mode="review"
        onExit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    fireEvent.click(screen.getByTestId('exam-option-1')); // wrong
    fireEvent.click(screen.getByTestId('practice-next'));
    const tomorrow = getDueReviewItems('grade-4', new Date(Date.now() + 86_400_000));
    expect(tomorrow).toHaveLength(1);
    expect(tomorrow[0].stage).toBe(0);
  });

  it('shows the empty-state intro when the queue is already drained', () => {
    render(
      <ExamScreen
        programId="english"
        gradeId="grade-4"
        gradeLabel="Lớp 4"
        mode="review"
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Không còn câu nào cần ôn/)).toBeInTheDocument();
    expect(screen.queryByTestId('exam-begin')).not.toBeInTheDocument();
  });
});
