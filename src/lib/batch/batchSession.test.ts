import { describe, expect, it } from 'vitest';
import {
  advanceRoundQuestion,
  computeBatchResult,
  createBatch,
  currentRoundDefinition,
  endRoundEarly,
  goToNextRound,
  updateRoundSession,
  type BatchState,
} from './batchSession';
import {
  getCurrentQuestion,
  submitExtraLetterAnswer,
  submitListeningAnswer,
  submitOptionAnswer,
  submitPairMatchingAnswer,
  submitPronunciationAnswer,
} from '../practiceSession';
import { ROUND_1_QUESTION_COUNT } from '../rounds/round1ExtraLetter';
import { ROUND_2_QUESTION_COUNT } from '../rounds/round2ListeningSentence';
import { ROUND_3_QUESTION_COUNT } from '../rounds/round3Pronunciation';
import { ROUND_4_QUESTION_COUNT } from '../rounds/round4DescribeAndChooseImage';

/**
 * Answers whichever question is current using the same "guaranteed
 * discoverable, never hardcoded vocabulary" technique the E2E suite uses:
 * tile/option 0 for tile/option-shaped kinds, a guess that can never
 * accidentally match any real word for listening/pronunciation kinds.
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
  if (question.kind === 'describe-and-choose-image' || question.kind === 'listening-image-choice') {
    return updateRoundSession(state, (session) => submitOptionAnswer(session, 0));
  }
  if (question.kind === 'picture-pair-matching') {
    return updateRoundSession(state, (session) => submitPairMatchingAnswer(session, true));
  }
  throw new Error(`Unexpected question kind for Round 1-4 in this build: ${question.kind}`);
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

describe('full Batch flow (AC17, AC21, AC24, AC25)', () => {
  it('moves through Round 1 -> Round 2 -> Round 3 -> Round 4 -> Batch summary, all real (no stub)', () => {
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
    expect(batch.phase).toBe('active');
    expect(currentRoundDefinition(batch)?.roundType).toBe('describe-and-choose-image');
    expect(batch.roundSession?.questions).toHaveLength(ROUND_4_QUESTION_COUNT);

    batch = completeActiveRound(batch);
    expect(batch.phase).toBe('round-summary');
    expect(batch.completedRounds).toHaveLength(4);
    expect(batch.completedRounds[3]?.totalCount).toBe(ROUND_4_QUESTION_COUNT);
    expect(batch.completedRounds[3]?.implemented).toBe(true);

    batch = goToNextRound(batch);
    expect(batch.phase).toBe('batch-summary');
    expect(currentRoundDefinition(batch)).toBeNull();

    const result = computeBatchResult(batch);
    expect(result.rounds).toHaveLength(4);
    expect(result.totalQuestions).toBe(
      ROUND_1_QUESTION_COUNT + ROUND_2_QUESTION_COUNT + ROUND_3_QUESTION_COUNT + ROUND_4_QUESTION_COUNT,
    );
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

describe('endRoundEarly (plan.md v7 "Round Timer", AC28)', () => {
  it('is a no-op outside the active phase', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch);

    const after = endRoundEarly(batch);

    expect(after).toBe(batch);
  });

  it('ends the Round immediately when nothing has been answered yet, scoring 0/0', () => {
    const batch = createBatch('fixed-seed');

    const ended = endRoundEarly(batch);

    expect(ended.phase).toBe('round-summary');
    expect(ended.completedRounds).toHaveLength(1);
    expect(ended.completedRounds[0]?.totalCount).toBe(0);
    expect(ended.completedRounds[0]?.correctCount).toBe(0);
    expect(ended.completedRounds[0]?.implemented).toBe(true);
  });

  it('scores only the questions answered so far, excluding unanswered ones from the total (AC28)', () => {
    let batch = createBatch('fixed-seed');
    // Answer exactly 3 questions (out of ROUND_1_QUESTION_COUNT), then time out.
    for (let i = 0; i < 3; i += 1) {
      batch = answerCurrentQuestion(batch);
      batch = advanceRoundQuestion(batch);
    }
    expect(batch.phase).toBe('active'); // still mid-round - fewer than the full round count answered

    const ended = endRoundEarly(batch);

    expect(ended.phase).toBe('round-summary');
    expect(ended.completedRounds).toHaveLength(1);
    expect(ended.completedRounds[0]?.totalCount).toBe(3);
    expect(ended.completedRounds[0]?.totalCount).toBeLessThan(ROUND_1_QUESTION_COUNT);
  });

  it('never crashes or blocks the Batch - goToNextRound proceeds normally after an early-ended Round', () => {
    let batch = createBatch('fixed-seed');
    batch = answerCurrentQuestion(batch);
    batch = advanceRoundQuestion(batch);
    batch = endRoundEarly(batch);

    batch = goToNextRound(batch);

    expect(batch.phase).toBe('active');
    expect(currentRoundDefinition(batch)?.roundType).toBe('listening-sentence-fill-blank');
  });

  it('a Batch can reach batch-summary even if every Round times out with zero answers', () => {
    let batch = createBatch('fixed-seed');
    batch = endRoundEarly(batch); // Round 1
    batch = goToNextRound(batch);
    batch = endRoundEarly(batch); // Round 2
    batch = goToNextRound(batch);
    batch = endRoundEarly(batch); // Round 3
    batch = goToNextRound(batch);
    batch = endRoundEarly(batch); // Round 4
    batch = goToNextRound(batch);

    expect(batch.phase).toBe('batch-summary');
    const result = computeBatchResult(batch);
    expect(result.rounds).toHaveLength(4);
    expect(result.totalQuestions).toBe(0);
    expect(result.totalCorrect).toBe(0);
  });
});
