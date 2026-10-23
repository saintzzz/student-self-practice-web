import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExamScreen from './ExamScreen';
import { resetForTests } from '../lib/engagement/store';
import type { GrammarMcqQuestion } from '../types/exam';

/**
 * CR-106 "Dạy tôi" regression fixture (AC-106.4 / AC-106.5 / AC-106.6).
 * Mocks stay thin: the auth session decides button visibility, the
 * bank module supplies the teach RPC seam, and createExam hands back a
 * bank-marked question so the sheet renders exactly like production.
 */

const { rpcMock, teachMock, getSessionMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  teachMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('../lib/practiceResults', () => ({
  saveExamResult: vi.fn(),
  bindActivityOwner: vi.fn(),
  activityOwnerMatches: vi.fn(async () => true),
}));

vi.mock('../lib/supabase/client', () => ({
  getSupabase: async () => ({ rpc: rpcMock }),
  isSupabaseConfigured: () => false,
}));

vi.mock('../lib/auth/practiceAuth', () => ({ getSession: getSessionMock }));

vi.mock('../lib/qb/bank', async () => {
  const actual = await vi.importActual<typeof import('../lib/qb/bank')>('../lib/qb/bank');
  return { ...actual, teachBankQuestion: teachMock, scoreBankAttempts: rpcMock };
});

/** A bank-sourced grammar question (keyless, oracle-scored). */
const BANK_Q: GrammarMcqQuestion = {
  id: 'b1',
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: 'She ___ a student.',
  options: ['is', 'are', 'am', 'be'],
  correctIndex: 0,
  explanation: 'She di voi is.',
  bankId: 'q-g1-0001',
  bankSkill: 'grammar-use-of-english',
};

const LOCAL_Q: GrammarMcqQuestion = {
  id: 'l1',
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: 'Which word means "mèo"?',
  options: ['cat', 'dog', 'bird', 'fish'],
  correctIndex: 0,
  explanation: '"Cat" nghia la con meo.',
};

vi.mock('../lib/exam/examSession', async () => {
  const actual = await vi.importActual<typeof import('../lib/exam/examSession')>('../lib/exam/examSession');
  return {
    ...actual,
    createExam: vi.fn(
      (programId: string, gradeId: string, _s: string, now: number): import('../lib/exam/examSession').ExamState => ({
        programId: programId as import('../types/exam').ExamProgramId,
        gradeId,
        questions: [BANK_Q, LOCAL_Q],
        answers: [null, null],
        currentIndex: 0,
        startedAtMs: now,
        timeLimitSec: 600,
        finishedAtMs: null,
      }),
    ),
  };
});

function beginPractice(mode: 'practice' | 'exam' = 'practice') {
  render(
    <ExamScreen programId="english" gradeId="grade-1" gradeLabel="Lớp 1" mode={mode} onExit={vi.fn()} />,
  );
  fireEvent.click(screen.getByTestId('exam-begin'));
}

describe('CR-106 teach-me (AC-106.4/106.5/106.6)', () => {
  beforeEach(() => {
    resetForTests();
    rpcMock.mockReset();
    teachMock.mockReset();
    getSessionMock.mockReset();
  });

  it('AC-106.4: authenticated practice shows "Dạy tôi" on a bank question before answering', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    beginPractice();
    const btn = await screen.findByTestId('teach-me');
    expect(btn).toBeTruthy();
  });

  it('AC-106.6: exam mode never renders the teach button', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    beginPractice('exam');
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('teach-me')).toBeNull();
  });

  it('AC-106.4: guests never see the teach button', async () => {
    getSessionMock.mockResolvedValue(null);
    beginPractice();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('teach-me')).toBeNull();
  });

  it('AC-106.5: teach -> lesson panel -> taught answer skips the oracle and scores ungraded', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    teachMock.mockResolvedValue({
      question_id: 'q-g1-0001',
      taught: true,
      skill: 'grammar-use-of-english',
      title_vi: 'Ngữ pháp trong câu',
      body_vi: 'Nhìn chủ ngữ đứng trước chỗ trống.',
      explanation_vi: 'She di voi is.',
    });
    beginPractice();
    fireEvent.click(await screen.findByTestId('teach-me'));
    // Lesson panel shows title + body; dismiss hides it.
    const panel = await screen.findByTestId('teach-lesson');
    expect(panel.textContent).toContain('Ngữ pháp trong câu');
    fireEvent.click(screen.getByTestId('teach-dismiss'));
    expect(screen.queryByTestId('teach-lesson')).toBeNull();
    // Button is gone after teach - the row is disclosed.
    expect(screen.queryByTestId('teach-me')).toBeNull();

    // Answer the taught question - the oracle is NEVER called.
    fireEvent.click(screen.getByTestId('exam-option-0'));
    const verdict = await screen.findByTestId('practice-verdict');
    expect(verdict.textContent).toContain('không tính điểm');
    expect(teachMock).toHaveBeenCalledWith('q-g1-0001');
    expect(rpcMock).not.toHaveBeenCalled();

    // Advance: taught rows do not block progression.
    fireEvent.click(screen.getByTestId('practice-next'));
    expect(screen.queryByTestId('practice-verdict')).toBeNull();
  });

  it('AC-106.5: teach RPC failure keeps the question graded - no silent disclosure', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    teachMock.mockRejectedValue(new Error('rate_limited'));
    beginPractice();
    fireEvent.click(await screen.findByTestId('teach-me'));
    await waitFor(() => expect(screen.getByText(/thử lại nhé/)).toBeTruthy());
    // The button stays - nothing was marked.
    expect(screen.getByTestId('teach-me')).toBeTruthy();
  });
});
