import { describe, expect, it } from 'vitest';
import {
  advanceRoundQuestion,
  computeBatchResult,
  createBatch,
  currentRoundDefinition,
  goToNextRound,
  updateRoundSession,
  type BatchState,
} from './batchSession';
import {
  getCurrentQuestion,
  submitExtraLetterAnswer,
  submitListeningAnswer,
  submitPronunciationAnswer,
} from '../practiceSession';
import { ROUND_1_QUESTION_COUNT } from '../rounds/round1ExtraLetter';
import { ROUND_2_QUESTION_COUNT } from '../rounds/round2ListeningSentence';
import { ROUND_3_QUESTION_COUNT } from '../rounds/round3Pronunciation';

/**
 * Answers whichever question is current using the same "guaranteed
 * discoverable, never hardcoded vocabulary" technique the E2E suite uses:
 * tile 0 for extra-letter, a guess that can never accidentally match any
 * real word for listening/pronunciation kinds.
 */
function answerCurrentQuestion(state: BatchState): BatchState {
  const question = state.roundSession ? getCurrentQuestion(state.roundSession) : null;
  if (!question) return state;

  if (question.kind === 'extra-letter') {
    return updateRoundSession(state, (session) => submitExtraLetterAnswer(session, 0));
  }
  if (question.kind === 'listening-sentence-fill-blank' || question.kind === 'listening-fill-blank') {
    return updateRoundSession(state, (session) => submitListeningAnswer(session, '0000'));
  }
  if (question.kind === 'pronunciation-recording') {
    return updateRoundSession(state, (session) => submitPronunciationAnswer(session, '0000'));
  }
  throw new Error(`Unexpected question kind for Round 1/2/3 in this build: ${question.kind}`);
}

function completeActiveRound(state: BatchState): BatchState {
  let current = state;
  while (current.phase === 'active') {
    current = answerCurrentQuestion(current);
    current = advanceRoundQuestion(current);
  }
  return current;
}

describe('createBatch', () => {
  it('starts at Round 1 (extra-letter), active, with the expected question count', () => {
    const batch = createBatch('fixed-seed');

    expect(batch.roundIndex).toBe(0);
    expect(batch.phase).toBe('active');
    expect(batch.roundSession?.questions).toHaveLength(ROUND_1_QUESTION_COUNT);
    expect(currentRoundDefinition(batch)?.roundType).toBe('extra-letter');
  });

  it('is deterministic for the same seed', () => {
    const a = createBatch('fixed-seed').roundSession?.questions.map((q) => q.id);
    const b = createBatch('fixed-seed').roundSession?.questions.map((q) => q.id);

    expect(a).toEqual(b);
  });
});

describe('full Batch flow (AC17, AC21, AC24)', () => {
  it('moves through Round 1 -> Round 2 -> Round 3 -> Round 4 stub -> Batch summary', () => {
    let batch = createBatch('fixed-seed');

    expect(currentRoundDefinition(batch)?.roundType).toBe('extra-letter');
    batch = completeActiveRound(batch);
    expect(batch.phase).toBe('round-summary');
    expect(batch.completedRounds).toHaveLength(1);
    expect(batch.completedRounds[0]?.totalCount).toBe(ROUND_1_QUESTION_COUNT);
    expect(batch.completedRounds[0]?.implemented).toBe(true);

    batch = goToNextRound(batch);
    expect(batch.phase).toBe('active');
    expect(currentRoundDefinition(batch)?.roundType).toBe('listening-sentence-fill-blank');
    expect(batch.roundSession?.questions).toHaveLength(ROUND_2_QUESTION_COUNT);

    batch = completeActiveRound(batch);
    expect(batch.phase).toBe('round-summary');
    expect(batch.completedRounds).toHaveLength(2);
    expect(batch.completedRounds[1]?.totalCount).toBe(ROUND_2_QUESTION_COUNT);

    batch = goToNextRound(batch);
    expect(batch.phase).toBe('active');
    expect(currentRoundDefinition(batch)?.roundType).toBe('pronunciation-recording');
    expect(batch.roundSession?.questions).toHaveLength(ROUND_3_QUESTION_COUNT);

    batch = completeActiveRound(batch);
    expect(batch.phase).toBe('round-summary');
    expect(batch.completedRounds).toHaveLength(3);
    expect(batch.completedRounds[2]?.totalCount).toBe(ROUND_3_QUESTION_COUNT);
    expect(batch.completedRounds[2]?.implemented).toBe(true);

    batch = goToNextRound(batch);
    expect(batch.phase).toBe('stub');
    expect(currentRoundDefinition(batch)?.roundType).toBe('describe-and-choose-image');
    expect(batch.completedRounds).toHaveLength(4);
    expect(batch.completedRounds[3]?.implemented).toBe(false);

    batch = goToNextRound(batch);
    expect(batch.phase).toBe('batch-summary');
    expect(currentRoundDefinition(batch)).toBeNull();

    const result = computeBatchResult(batch);
    expect(result.rounds).toHaveLength(4);
    expect(result.totalQuestions).toBe(ROUND_1_QUESTION_COUNT + ROUND_2_QUESTION_COUNT + ROUND_3_QUESTION_COUNT);
    expect(result.totalCorrect).toBeGreaterThanOrEqual(0);
    expect(result.totalCorrect).toBeLessThanOrEqual(result.totalQuestions);
  });
});

describe('updateRoundSession / advanceRoundQuestion guards', () => {
  it('updateRoundSession is a no-op outside the active phase', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);

    const after = updateRoundSession(batch, (session) => submitExtraLetterAnswer(session, 0));

    expect(after).toBe(batch);
  });

  it('advanceRoundQuestion is a no-op outside the active phase', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);

    const after = advanceRoundQuestion(batch);

    expect(after).toBe(batch);
  });
});
