import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExamScreen from './ExamScreen';
import { resetForTests } from '../lib/engagement/store';
import type { GrammarMcqQuestion } from '../types/exam';

// CR-40: IOE <u>underline</u> markup must render as real underlines, not
// literal tags - otherwise "the underlined part" is invisible and the
// pronunciation question is unanswerable.

vi.mock('../lib/practiceResults', () => ({ saveExamResult: vi.fn() }));

const Q: GrammarMcqQuestion = {
  id: 'u1',
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: 'Which word has the underlined part pronounced like the letter E in EXCITING?',
  options: ['h<u>i</u>gh', 'centr<u>e</u>', 'chick<u>e</u>n', '<u>e</u>lbow'],
  correctIndex: 2,
  explanation: 'Đáp án đúng: "chick<u>e</u>n".',
};

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
        timeLimitSec: 0,
        finishedAtMs: null,
      }),
    ),
  };
});

beforeEach(() => resetForTests());

describe('ExamScreen - IOE underline markup (CR-40)', () => {
  it('renders <u> markup in options as real underlined letters', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="practice" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    const optionA = screen.getByTestId('exam-option-0');
    expect(optionA.querySelector('u')?.textContent).toBe('i');
    expect(optionA.textContent).toContain('high');
    expect(optionA.textContent).not.toContain('<u>');
    expect(screen.getByTestId('exam-option-2').querySelector('u')?.textContent).toBe('e');
  });

  it('renders markup in the explanation after answering', () => {
    render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="practice" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    fireEvent.click(screen.getByTestId('exam-option-2'));
    expect(document.body.textContent).toContain('Đáp án đúng');
    // The explanation's markup renders as a real <u> element somewhere.
    expect([...document.querySelectorAll('u')].some((u) => u.textContent === 'e')).toBe(true);
    expect(document.body.textContent).not.toContain('<u>');
  });
});
