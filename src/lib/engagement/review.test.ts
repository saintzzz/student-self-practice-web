import { beforeEach, describe, expect, it } from 'vitest';
import {
  getDueReviewItems,
  recordReviewOutcome,
  recordWrongExamQuestion,
  resetForTests,
} from './store';
import type { GrammarMcqQuestion } from '../../types/exam';

const DAY0 = new Date('2026-10-01T09:00:00');
const DAY1 = new Date('2026-10-02T09:00:00');
const DAY4 = new Date('2026-10-05T09:00:00');
const DAY9 = new Date('2026-10-09T09:00:00');
const DAY11 = new Date('2026-10-12T09:00:00');

const Q = (id: string): GrammarMcqQuestion => ({
  id,
  topicId: 't',
  kind: 'grammar-mcq',
  prompt: `Pick ${id}`,
  options: ['a', 'b', 'c', 'd'],
  correctIndex: 0,
  explanation: `${id} explanation`,
});

beforeEach(() => resetForTests());

describe('spaced-repetition review queue', () => {
  it('AC-28.1: a wrong drill answer lands due tomorrow at stage 0', () => {
    recordWrongExamQuestion('grade-4', Q('q1'), DAY0);
    const due = getDueReviewItems('grade-4', DAY1);
    expect(due).toHaveLength(1);
    expect(due[0].question.id).toBe('q1');
    expect(due[0].stage).toBe(0);
    expect(getDueReviewItems('grade-4', DAY0)).toHaveLength(0); // not due same day
  });

  it('re-recording the same wrong question does not duplicate it', () => {
    recordWrongExamQuestion('grade-4', Q('q1'), DAY0);
    recordWrongExamQuestion('grade-4', Q('q1'), DAY0);
    expect(getDueReviewItems('grade-4', DAY1)).toHaveLength(1);
  });

  it('AC-28.3: correct answers advance stage -> +3d -> +7d -> mastered', () => {
    recordWrongExamQuestion('grade-4', Q('q1'), DAY0);
    // stage 0 -> stage 1, due +3 days
    recordReviewOutcome('grade-4', 'q1', true, DAY1);
    expect(getDueReviewItems('grade-4', DAY1)).toHaveLength(0);
    expect(getDueReviewItems('grade-4', DAY4)).toHaveLength(1);
    // stage 1 -> stage 2, due +7 days
    recordReviewOutcome('grade-4', 'q1', true, DAY4);
    expect(getDueReviewItems('grade-4', DAY4)).toHaveLength(0);
    expect(getDueReviewItems('grade-4', DAY9)).toHaveLength(0);
    expect(getDueReviewItems('grade-4', DAY11)).toHaveLength(1);
    // stage 2 -> mastered: removed from queue
    recordReviewOutcome('grade-4', 'q1', true, DAY11);
    expect(getDueReviewItems('grade-4', DAY11)).toHaveLength(0);
  });

  it('AC-28.4: a wrong review answer resets to stage 0, due tomorrow', () => {
    recordWrongExamQuestion('grade-4', Q('q1'), DAY0);
    recordReviewOutcome('grade-4', 'q1', true, DAY1); // stage 1
    recordReviewOutcome('grade-4', 'q1', false, DAY4); // reset
    const due = getDueReviewItems('grade-4', new Date('2026-10-06T09:00:00'));
    expect(due).toHaveLength(1);
    expect(due[0].stage).toBe(0);
  });

  it('AC-28.5: the queue caps at 60 items per grade, evicting oldest', () => {
    for (let i = 0; i < 62; i += 1) {
      recordWrongExamQuestion('grade-4', Q(`q${i}`), DAY0);
    }
    const due = getDueReviewItems('grade-4', DAY1);
    expect(due).toHaveLength(60);
    expect(due.some((item) => item.question.id === 'q0')).toBe(false);
    expect(due.some((item) => item.question.id === 'q1')).toBe(false);
  });

  it('re-recording an old wrong makes it freshest - eviction skips it', () => {
    for (let i = 0; i < 60; i += 1) {
      recordWrongExamQuestion('grade-4', Q(`q${i}`), DAY0);
    }
    // q0 is wrong again a week later - it becomes the newest entry
    recordWrongExamQuestion('grade-4', Q('q0'), new Date('2026-10-08T09:00:00'));
    recordWrongExamQuestion('grade-4', Q('q60'), DAY0);
    const ids = getDueReviewItems('grade-4', DAY9).map((item) => item.id);
    expect(ids).toHaveLength(60);
    expect(ids).toContain('q0');
    expect(ids).not.toContain('q1'); // truly oldest evicted
  });

  it('due dates use calendar days across a month boundary', () => {
    recordWrongExamQuestion('grade-4', Q('q1'), new Date('2026-10-31T09:00:00'));
    expect(getDueReviewItems('grade-4', new Date('2026-11-01T09:00:00'))).toHaveLength(1);
  });

  it('items are scoped per grade', () => {
    recordWrongExamQuestion('grade-4', Q('q1'), DAY0);
    expect(getDueReviewItems('grade-3', DAY1)).toHaveLength(0);
    expect(getDueReviewItems('grade-4', DAY1)).toHaveLength(1);
  });
});
