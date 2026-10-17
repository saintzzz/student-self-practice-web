import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GradeSelect from './GradeSelect';
import AuthScreen from './AuthScreen';
import StartBatchScreen from './StartBatchScreen';
import RoundSummary from './RoundSummary';
import BatchSummary from './BatchSummary';
import QuestionCard from './QuestionCard';
import ExamScreen from './ExamScreen';
import { ViewerProvider } from '../lib/viewer/ViewerContext';
import { GRADES } from '../data/vocabulary';
import { IMAGE_QUESTION, noopHandlers } from './questionCardFixtures';
import { resetForTests } from '../lib/engagement/store';
import type { GrammarMcqQuestion } from '../types/exam';
import type { RoundOutcome } from '../lib/batch/batchSession';
import type { BatchResult } from '../lib/batch/batchSession';
import type { CurrentAnswer } from '../lib/practiceSession';

/**
 * CR-82 (spec s9.3 + ARCHITECTURE FF-1): parametrized one-mascot matrix.
 * Exactly one `data-testid="mascot"` node may exist per screen state -
 * the mascot is a live feedback channel, and two nodes would read as
 * two different opinions. Staged per milestone:
 *   M4 -> GradeSelect, AuthScreen, StartBatch, question unanswered,
 *         answered (sheet perch), answered at max-height:420px,
 *         RoundSummary, BatchSummary
 *   M5 -> ExamIntro (1), ExamResult (1), exam sitting (0 - R-v5-06)
 *   M8 -> flashcard card (1), flashcard summary (1)
 * Complete 13-state matrix is the M10 gate evidence.
 */

vi.mock('../lib/practiceResults', () => ({
  saveExamResult: vi.fn(),
  savePracticeResult: vi.fn(),
  bindActivityOwner: vi.fn(),
  activityOwnerMatches: vi.fn(async () => true),
}));
vi.mock('../lib/qb/bank', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/qb/bank')>();
  return { ...mod, listBankForms: vi.fn(async () => []) };
});
vi.mock('../lib/supabase/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/supabase/client')>();
  return { ...mod, isSupabaseConfigured: () => false };
});

const EXAM_Q: GrammarMcqQuestion = {
  id: 'u1',
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: 'Which word means "mèo"?',
  options: ['cat', 'dog', 'bird', 'fish'],
  correctIndex: 0,
  explanation: '"Cat" nghĩa là con mèo.',
};

vi.mock('../lib/exam/examSession', async () => {
  const actual = await vi.importActual<typeof import('../lib/exam/examSession')>('../lib/exam/examSession');
  return {
    ...actual,
    createExam: vi.fn(
      (programId: string, gradeId: string, _s: string, now: number): import('../lib/exam/examSession').ExamState => ({
        programId: programId as import('../types/exam').ExamProgramId,
        gradeId,
        questions: [EXAM_Q],
        answers: [null],
        currentIndex: 0,
        startedAtMs: now,
        timeLimitSec: 600,
        finishedAtMs: null,
      }),
    ),
  };
});

const GRADE = { id: 'grade-2', name: 'Lớp 2' };

const ROUND_OUTCOME: RoundOutcome = {
  roundNumber: 1,
  roundType: 'extra-letter',
  titleVi: 'Vòng 1: Bắn chữ cái thừa',
  correctCount: 7,
  totalCount: 10,
  skillCorrect: 7,
  skillTotal: 10,
  points: 70,
  maxPoints: 100,
  implemented: true,
};

const BATCH_RESULT: BatchResult = {
  totalCorrect: 7,
  totalQuestions: 10,
  points: 70,
  maxPoints: 100,
  timeUsedSec: 300,
  rounds: [ROUND_OUTCOME],
};

function installMatchMedia(matches: Record<string, boolean>) {
  const mql = (query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: () => false,
  });
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: mql });
}

function uninstallMatchMedia() {
  // @ts-expect-error restore jsdom's absent matchMedia
  delete window.matchMedia;
}

function mascotCount(container: HTMLElement): number {
  return container.querySelectorAll('[data-testid="mascot"]').length;
}

function expectOneMascot(container: HTMLElement, context: string) {
  expect(mascotCount(container), `${context}: expected exactly ONE mascot node`).toBe(1);
}

describe('oneMascot matrix (CR-82 spec s9.3 / FF-1)', () => {
  beforeEach(() => {
    resetForTests();
    uninstallMatchMedia();
  });
  afterEach(() => {
    uninstallMatchMedia();
    vi.restoreAllMocks();
  });

  /* ---------- M4 stage ---------- */

  it('GradeSelect -> 1', () => {
    const { container } = render(<GradeSelect grades={GRADES} onSelectGrade={vi.fn()} />);
    expectOneMascot(container, 'GradeSelect');
  });

  it('AuthScreen -> 1', () => {
    const { container } = render(<AuthScreen onLoggedIn={vi.fn()} onGuest={vi.fn()} />);
    expectOneMascot(container, 'AuthScreen');
  });

  it('StartBatch -> 1', () => {
    const { container } = render(
      <ViewerProvider gradeId={GRADE.id}>
        <StartBatchScreen grade={GRADE} onStartBatch={vi.fn()} onStartExam={vi.fn()} onBack={vi.fn()} />
      </ViewerProvider>,
    );
    expectOneMascot(container, 'StartBatch');
  });

  it('question unanswered -> 1 (board perch, idle)', () => {
    const { container } = render(
      <QuestionCard question={IMAGE_QUESTION} questionNumber={1} totalQuestions={8} currentAnswer={null} {...noopHandlers} />,
    );
    expectOneMascot(container, 'question unanswered');
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-mascot-mood', 'idle');
  });

  it('question answered -> 1 (sheet perch)', () => {
    const answer: CurrentAnswer = { selectedIndex: 0, isCorrect: true };
    const { container } = render(
      <QuestionCard question={IMAGE_QUESTION} questionNumber={1} totalQuestions={8} currentAnswer={answer} {...noopHandlers} />,
    );
    expectOneMascot(container, 'question answered');
  });

  it('question answered at max-height:420px -> 1 (inline in sheet headline)', () => {
    installMatchMedia({ '(max-height: 420px)': true });
    const answer: CurrentAnswer = { selectedIndex: 0, isCorrect: true };
    const { container } = render(
      <QuestionCard question={IMAGE_QUESTION} questionNumber={1} totalQuestions={8} currentAnswer={answer} {...noopHandlers} />,
    );
    expectOneMascot(container, 'question answered @420px');
    expect(screen.queryByTestId('sheet-perch')).toBeNull();
  });

  it('RoundSummary -> 1', () => {
    const { container } = render(<RoundSummary outcome={ROUND_OUTCOME} gradeId="grade-2" onNextRound={vi.fn()} />);
    expectOneMascot(container, 'RoundSummary');
  });

  it('BatchSummary -> 1', () => {
    const { container } = render(
      <BatchSummary result={BATCH_RESULT} gradeId="grade-2" onStartNewBatch={vi.fn()} onChooseGrade={vi.fn()} />,
    );
    expectOneMascot(container, 'BatchSummary');
  });

  /* ---------- M5 stage (exam register) ---------- */

  it('ExamIntro -> 1 (greeting on the paper card)', () => {
    const { container } = render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    expectOneMascot(container, 'ExamIntro');
  });

  it('exam sitting -> 0 (R-v5-06: no mascot inside the exam hall)', () => {
    const { container } = render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    expect(
      container.querySelectorAll('[data-testid="mascot"]').length,
      'exam sitting must render ZERO mascot nodes (R-v5-06)',
    ).toBe(0);
    expect(screen.getByTestId('exam-screen')).toBeInTheDocument();
  });

  it('ExamResult -> 1 (celebrating/encouraging on the certificate)', () => {
    const { container } = render(
      <ExamScreen programId="english" gradeId="grade-5" gradeLabel="Lớp 5" mode="exam" onExit={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('exam-begin'));
    fireEvent.click(screen.getByTestId('exam-submit'));
    fireEvent.click(screen.getByTestId('exam-review-submit'));
    expect(screen.getByTestId('exam-result')).toBeInTheDocument();
    expectOneMascot(container, 'ExamResult');
  });
});
