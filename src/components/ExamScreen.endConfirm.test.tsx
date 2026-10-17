import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ExamScreen from './ExamScreen';
import { resetForTests } from '../lib/engagement/store';
import type { GrammarMcqQuestion } from '../types/exam';

/**
 * CR-69: the manual NỘP BÀI / KẾT THÚC button must ask before ending the
 * session - one mis-tap used to discard the whole exam. The centered
 * dialog gates submission; auto paths (timer expiry, last question)
 * are unaffected because they never touch the button.
 */

vi.mock('../lib/practiceResults', () => ({ saveExamResult: vi.fn(), bindActivityOwner: vi.fn(), activityOwnerMatches: vi.fn(async () => true) }));

const Q: GrammarMcqQuestion = {
  id: 'u1',
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: 'Which word means "mèo"?',
  options: ['cat', 'dog', 'bird', 'fish'],
  correctIndex: 0,
  explanation: '"Cat" nghĩa là con mèo.',
};

/** Mutated per test - lets the exam-mode countdown actually expire. */
let mockTimeLimitSec = 600;

vi.mock('../lib/exam/examSession', async () => {
  const actual = await vi.importActual<typeof import('../lib/exam/examSession')>('../lib/exam/examSession');
  return {
    ...actual,
    createExam: vi.fn(
      (programId: string, gradeId: string, _s: string, now: number): import('../lib/exam/examSession').ExamState => ({
        programId: programId as import('../types/exam').ExamProgramId,
        gradeId,
        questions: [Q],
        answers: [null],
        currentIndex: 0,
        startedAtMs: now,
        // A 0 limit makes exam mode auto-submit on the first heartbeat,
        // before the dialog under test can open - default to 10 minutes.
        timeLimitSec: mockTimeLimitSec,
        finishedAtMs: null,
      }),
    ),
  };
});

beforeEach(() => {
  resetForTests();
  mockTimeLimitSec = 600;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ExamScreen - end confirmation (CR-69) + review-before-submit (CR-82 D-13)', () => {
  it('practice mode: exam-submit opens ConfirmEndDialog; "Làm tiếp" cancels and keeps the drill running', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="practice" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));

    fireEvent.click(screen.getByTestId('exam-submit'));
    expect(screen.getByRole('dialog')).toBeVisible();
    // Still on the drill - no result screen yet.
    expect(screen.queryByTestId('exam-result')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('end-confirm-cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('exam-option-0')).toBeVisible();
  });

  it('exam mode: exam-submit opens the review sheet; "Quay lại làm tiếp" cancels', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));

    fireEvent.click(screen.getByTestId('exam-submit'));
    expect(screen.getByTestId('exam-review-sheet')).toBeVisible();
    expect(screen.queryByTestId('exam-result')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('exam-review-back'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('exam-option-0')).toBeVisible();
  });

  it('exam-review-submit submits the exam and lands on the result screen', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));

    fireEvent.click(screen.getByTestId('exam-submit'));
    fireEvent.click(screen.getByTestId('exam-review-submit'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('exam-result')).toBeVisible();
  });

  it('timer expiry while the dialog is open still auto-submits and clears the stale flag (CR-69 r1)', () => {
    vi.useFakeTimers();
    mockTimeLimitSec = 5;
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    fireEvent.click(screen.getByTestId('exam-submit'));
    expect(screen.getByRole('dialog')).toBeVisible();

    // The 1s heartbeat reaches 0:00 while the dialog is open - the exam
    // must still auto-submit (confirmation never gates auto paths).
    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(screen.getByTestId('exam-result')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
