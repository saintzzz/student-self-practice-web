import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExamScreen from './ExamScreen';
import { resetForTests } from '../lib/engagement/store';
import type { GrammarMcqQuestion } from '../types/exam';

/**
 * CR-82 M5 regression fixture (a) - the exact defects Design-Lead r1
 * flagged on the exam surface:
 *  (a) G1-2 prompt inside EXAM_SHEET must render slate-900 ink, never
 *      text-white (TYPE_PROMPT_PAPER_G12, not a *_NAVY composite);
 *      the practice-wrong verdict must not use rose-* (D2 fix -
 *      EXAM_VERDICT_WRONG is slate, not red-status);
 *      the urgent timer must not animate-pulse (calm register);
 *      the header carries no mascot during the sitting (R-v5-06).
 * Plus the M5 additions the fixture can observe: strip flagging,
 * navigator entry point, and shortcut bindings.
 */

vi.mock('../lib/practiceResults', () => ({
  saveExamResult: vi.fn(),
  bindActivityOwner: vi.fn(),
  activityOwnerMatches: vi.fn(async () => true),
}));

const Q: GrammarMcqQuestion = {
  id: 'u1',
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: 'Which word means "mèo"?',
  options: ['cat', 'dog', 'bird', 'fish'],
  correctIndex: 0,
  explanation: '"Cat" nghĩa là con mèo.',
};

/** Mutated per test - exam-mode countdown control. */
let mockTimeLimitSec = 600;

vi.mock('../lib/exam/examSession', async () => {
  const actual = await vi.importActual<typeof import('../lib/exam/examSession')>('../lib/exam/examSession');
  return {
    ...actual,
    createExam: vi.fn(
      (programId: string, gradeId: string, _s: string, now: number): import('../lib/exam/examSession').ExamState => ({
        programId: programId as import('../types/exam').ExamProgramId,
        gradeId,
        questions: [Q, { ...Q, id: 'u2' }],
        answers: [null, null],
        currentIndex: 0,
        startedAtMs: now,
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

function sheet() {
  return screen.getByTestId('exam-screen').querySelector('main')!;
}

describe('ExamScreen paper register (CR-82 M5, regression fixture a)', () => {
  it('G1-2 prompt inside EXAM_SHEET renders slate-900 ink - never text-white', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-1" gradeLabel="Lớp 1" mode="practice" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));

    const paper = sheet();
    expect(paper.className).toContain('bg-slate-50');
    // The prompt composite carries INK_PAPER = text-slate-900.
    const prompt = paper.querySelector('[class*="text-slate-900"]');
    expect(prompt, 'expected a text-slate-900 prompt inside the paper sheet').not.toBeNull();
    // Rule: no *_NAVY composite may render inside EXAM_SHEET (s5.3 r2) -
    // text-white inside the sheet is the rev-1 failure signature. The
    // only allowed exceptions are the dark CHIPS that sit ON the paper:
    // EXAM_QNUM (navy-800) and the selected key (sky-700).
    const strayWhite = [...paper.querySelectorAll('[class*="text-white"]')].filter(
      (el) => !el.className.includes('bg-navy-800') && !el.className.includes('bg-sky-700'),
    );
    expect(strayWhite, 'only dark chip tokens may carry text-white inside EXAM_SHEET').toEqual([]);
  });

  it('practice-wrong verdict is slate (EXAM_VERDICT_WRONG) - zero rose-* classes (D2)', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="practice" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    fireEvent.click(screen.getByTestId('exam-option-3')); // wrong answer

    const verdict = screen.getByTestId('practice-verdict');
    expect(verdict.className).toContain('bg-slate-100');
    expect(verdict.className).not.toContain('rose');
    expect(verdict.innerHTML).not.toMatch(/rose-/);
  });

  it('urgent timer (<=60s) keeps EXAM_TIMER_URGENT but drops animate-pulse', () => {
    mockTimeLimitSec = 45;
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));

    const timer = screen.getByTestId('exam-timer');
    expect(timer.className).toContain('bg-rose-600');
    expect(timer.className).not.toContain('animate-pulse');
  });

  it('the header carries no mascot during the sitting (R-v5-06)', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));

    const screenEl = screen.getByTestId('exam-screen');
    expect(screenEl.querySelectorAll('[data-mascot-mood]')).toHaveLength(0);
    expect(screen.getByTestId('exam-brand')).not.toHaveTextContent('🐷');
  });

  it('exam screen exposes ring + flag + navigator + shortcuts (D-18)', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));

    // Progress ring in the header.
    expect(screen.getByTestId('exam-progress-ring')).toHaveAttribute('role', 'progressbar');

    // F flags the current question - button and strip cell both reflect it.
    fireEvent.keyDown(document, { key: 'f' });
    expect(screen.getByTestId('exam-flag')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('exam-nav-0').className).toContain('amber');

    // N opens the navigator; a cell jump closes it.
    fireEvent.keyDown(document, { key: 'n' });
    expect(screen.getByTestId('exam-navigator')).toBeVisible();
    fireEvent.click(screen.getByTestId('exam-navigator-close'));
    expect(screen.queryByTestId('exam-navigator')).toBeNull();

    // exam-nav-open reaches the same navigator from the strip.
    fireEvent.click(screen.getByTestId('exam-nav-open'));
    expect(screen.getByTestId('exam-navigator')).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('exam-navigator')).toBeNull();

    // "2" answers option B.
    fireEvent.keyDown(document, { key: '2' });
    expect(screen.getByTestId('exam-nav-0').className).toContain('emerald');
  });

  it('flags and dialogs are reset when a new run begins (stale-flag lesson)', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    fireEvent.click(screen.getByTestId('exam-flag'));
    expect(screen.getByTestId('exam-flag')).toHaveAttribute('aria-pressed', 'true');

    // Submit -> result -> play again starts the new sitting directly:
    // the flag must not leak into it.
    fireEvent.click(screen.getByTestId('exam-submit'));
    fireEvent.click(screen.getByTestId('exam-review-submit'));
    fireEvent.click(screen.getByTestId('exam-play-again'));
    expect(screen.getByTestId('exam-flag')).toHaveAttribute('aria-pressed', 'false');
  });
});
