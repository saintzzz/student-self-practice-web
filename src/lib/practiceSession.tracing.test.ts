import { describe, expect, it } from 'vitest';
import type { LetterTracingQuestion } from '../types';
import {
  advanceToNextQuestion,
  createSession,
  getCorrectWord,
  isSessionComplete,
  submitExtraLetterAnswer,
  submitListeningAnswer,
  submitOptionAnswer,
  submitTracingAnswer,
} from './practiceSession';
import {
  computeBatchResult,
  createBatch,
  endBatchEarly,
  updateRoundSession,
} from './batch/batchSession';
import { getWordsByGrade } from '../data/vocabulary';

const TRACING: LetterTracingQuestion = {
  id: 't1',
  topicId: 'topic-a',
  kind: 'letter-tracing',
  letter: 'a',
  exampleWordId: 'apple',
  grade: 1,
  explanation: 'Chữ "a" như trong từ "apple".',
};

describe('submitTracingAnswer (CR-82 D-10)', () => {
  it('records isCorrect + TracingMeta and flags AnswerRecord.assisted', () => {
    let s = createSession([TRACING]);
    s = submitTracingAnswer(s, true, { assisted: true, attempts: [0, 2] });

    expect(s.currentAnswer?.isCorrect).toBe(true);
    expect(s.currentAnswer?.tracing).toEqual({ assisted: true, attempts: [0, 2] });
    expect(s.answers).toHaveLength(1);
    expect(s.answers[0]!.assisted).toBe(true);
  });

  it('an unassisted completion records assisted=false', () => {
    let s = createSession([TRACING]);
    s = submitTracingAnswer(s, true, { assisted: false, attempts: [0, 0] });
    expect(s.answers[0]!.assisted).toBe(false);
  });

  it('is a no-op once answered and on a non-tracing kind', () => {
    let s = createSession([TRACING]);
    s = submitTracingAnswer(s, false, { assisted: false, attempts: [1, 3] });
    const again = submitTracingAnswer(s, true, { assisted: false, attempts: [0, 0] });
    expect(again).toBe(s);

    const wrong = createSession([
      {
        id: 'x',
        topicId: 't',
        kind: 'image-choice',
        emoji: '🐱',
        wordId: 'w1',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 0,
        explanation: '',
      },
    ]);
    expect(submitTracingAnswer(wrong, true, { assisted: false, attempts: [] }).answers).toHaveLength(0);
  });

  it('getCorrectWord returns the traced letter (spec s12.5)', () => {
    expect(getCorrectWord(TRACING)).toBe('a');
  });
});

describe('D-10 assisted exclusion in RoundOutcome skill counts', () => {
  it('skillCorrect/skillTotal drop assisted answers; correctCount keeps them', () => {
    const batch = createBatch('tracing-seed-1', 'grade-1', 0);
    expect(batch.phase).toBe('active');
    const session = batch.roundSession!;
    /* G1-2 Round 1 guarantees 2 tracing items at indices 3 and 7. */
    const tracingIndexes = session.questions
      .map((q, i) => (q.kind === 'letter-tracing' ? i : -1))
      .filter((i) => i >= 0);
    expect(tracingIndexes).toEqual([3, 7]);

    /* Answer the whole round; tracing items go through the assisted path
       (auto-step), everything else answers structurally. */
    let b = batch;
    for (const q of session.questions) {
      b = updateRoundSession(b, (s) => {
        switch (q.kind) {
          case 'letter-tracing':
            return submitTracingAnswer(s, true, { assisted: true, attempts: [] });
          case 'extra-letter':
            return submitExtraLetterAnswer(s, 0);
          case 'image-choice':
          case 'listening-image-choice':
            return submitOptionAnswer(s, 0);
          default:
            return submitListeningAnswer(s, '0000');
        }
      });
      b = updateRoundSession(b, (s) => advanceToNextQuestion(s));
    }
    expect(b.roundSession && isSessionComplete(b.roundSession)).toBe(true);

    const ended = endBatchEarly(b);
    const result = computeBatchResult(ended);
    const round1 = result.rounds[0]!;
    expect(round1.totalCount).toBe(10);
    /* The 2 assisted tracing answers are excluded from the skill slice. */
    expect(round1.skillTotal).toBe(8);
    const cleanCorrect = round1.correctCount - 2; // the 2 assisted submits were correct
    expect(round1.skillCorrect).toBe(cleanCorrect);
  });

  it('a grade-3 batch produces no tracing and skillTotal equals totalCount', () => {
    const batch = createBatch('tracing-seed-2', 'grade-3', 0);
    const tracing = batch.roundSession!.questions.filter((q) => q.kind === 'letter-tracing');
    expect(tracing).toHaveLength(0);
    expect(getWordsByGrade('grade-3').length).toBeGreaterThan(0);
  });
});
