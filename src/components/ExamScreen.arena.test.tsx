import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExamScreen from './ExamScreen';
import { getDailyQuests, getDueReviewItems, getReportSnapshot, resetForTests } from '../lib/engagement/store';
import { saveExamResult } from '../lib/practiceResults';
import { botGhost } from '../lib/arena';
import type { GrammarMcqQuestion } from '../types/exam';

// CR-34 review: an arena duel is NOT practice - it must not feed quests,
// skill stats, the review queue, or the weekly leaderboard.

vi.mock('../lib/practiceResults', () => ({ saveExamResult: vi.fn() }));

vi.mock('../lib/arena', async () => {
  const actual = await vi.importActual('../lib/arena');
  return { ...actual, botGhost: vi.fn(), arenaCreate: vi.fn(), arenaAccept: vi.fn() };
});

const Q = (id: string): GrammarMcqQuestion => ({
  id,
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: `Pick ${id}`,
  options: ['right', 'w1', 'w2', 'w3'],
  correctIndex: 0,
  explanation: `${id} explanation`,
});

// Deterministic 2-question set so the whole duel fits in one test.
vi.mock('../lib/exam/examSession', async () => {
  const actual = await vi.importActual<typeof import('../lib/exam/examSession')>('../lib/exam/examSession');
  return {
    ...actual,
    createExam: vi.fn(
      (
        programId: string,
        gradeId: string,
        _seed: string,
        now: number,
        _count: number,
      ): import('../lib/exam/examSession').ExamState => ({
        programId: programId as import('../types/exam').ExamProgramId,
        gradeId,
        questions: [Q('a1'), Q('a2')],
        answers: [null, null],
        currentIndex: 0,
        startedAtMs: now,
        timeLimitSec: 0,
        finishedAtMs: null,
      }),
    ),
  };
});

beforeEach(() => {
  resetForTests();
  vi.mocked(saveExamResult).mockReset();
  vi.mocked(botGhost).mockReset();
  vi.mocked(botGhost).mockReturnValue({ name: 'Test Bot', score: 999, timeMs: 1 });
});

function playBoth(correct: boolean) {
  fireEvent.click(screen.getByTestId('exam-begin'));
  fireEvent.click(screen.getByTestId(correct ? 'exam-option-0' : 'exam-option-1'));
  fireEvent.click(screen.getByTestId('practice-next'));
  fireEvent.click(screen.getByTestId(correct ? 'exam-option-0' : 'exam-option-1'));
  fireEvent.click(screen.getByTestId('practice-next'));
}

describe('ExamScreen arena mode - engagement isolation', () => {
  it('a bot duel writes no quests, no stats, no review items, no leaderboard row', () => {
    render(
      <ExamScreen
        programId="english"
        gradeId="grade-4"
        gradeLabel="Lớp 4"
        mode="arena"
        arena={{ kind: 'bot', seed: 'arena-test' }}
        onExit={vi.fn()}
      />,
    );
    playBoth(false);
    expect(screen.getByTestId('arena-result')).toBeInTheDocument();

    const quests = getDailyQuests();
    expect(quests.quests.find((q) => q.id === 'drill')!.done).toBe(false);
    expect(quests.quests.find((q) => q.id === 'correct')!.progress).toBe(0);
    expect(getReportSnapshot().skills['grade-4'] ?? []).toHaveLength(0);
    expect(getDueReviewItems('grade-4', new Date(Date.now() + 86_400_000))).toHaveLength(0);
    expect(saveExamResult).not.toHaveBeenCalled();
  });

  it('exact score+time tie renders a draw verdict, not a loss', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    // Both questions right: myScore = maxScore = ghost score, myTimeMs = 0
    // (Date.now frozen) = ghost timeMs - a true draw.
    vi.mocked(botGhost).mockImplementation((_seed: string, maxScore: number) => ({
      name: 'Test Bot',
      score: maxScore,
      timeMs: 0,
    }));
    render(
      <ExamScreen
        programId="english"
        gradeId="grade-4"
        gradeLabel="Lớp 4"
        mode="arena"
        arena={{ kind: 'bot', seed: 'arena-draw' }}
        onExit={vi.fn()}
      />,
    );
    playBoth(true);
    expect(screen.getByTestId('arena-verdict').textContent).toContain('Hòa nhau');
    vi.restoreAllMocks();
  });

  it('a losing duel renders the loss verdict', () => {
    render(
      <ExamScreen
        programId="english"
        gradeId="grade-4"
        gradeLabel="Lớp 4"
        mode="arena"
        arena={{ kind: 'bot', seed: 'arena-lose' }}
        onExit={vi.fn()}
      />,
    );
    playBoth(false);
    expect(screen.getByTestId('arena-verdict').textContent).toContain('Đối thủ thắng');
  });
});
