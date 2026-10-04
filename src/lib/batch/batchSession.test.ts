import { describe, expect, it } from 'vitest';
import {
  advanceRoundQuestion,
  computeBatchResult,
  createBatch,
  currentRoundDefinition,
  endBatchEarly,
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
import { POINTS_PER_CORRECT_ANSWER } from './points';

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
  if (
    question.kind === 'describe-and-choose-image' ||
    question.kind === 'listening-image-choice' ||
    question.kind === 'image-choice' ||
    question.kind === 'phonics-sound-choice' ||
    question.kind === 'phonics-word-choice' ||
    question.kind === 'phonics-final-choice' ||
    question.kind === 'phonics-blend-choice' ||
    question.kind === 'phonics-rhyme-choice'
  ) {
    return updateRoundSession(state, (session) => submitOptionAnswer(session, 0));
  }
  if (question.kind === 'picture-pair-matching') {
    return updateRoundSession(state, (session) => submitPairMatchingAnswer(session, true));
  }
  throw new Error(`Unexpected question kind for Round 1-4 in this build: ${question.kind}`);
}

function completeActiveRound(state: BatchState): BatchState {
  let current = state;
  // Guard bound: a round is <= 10 questions; exceeding it means a new kind
  // slipped past answerCurrentQuestion - fail loudly instead of hanging.
  for (let guard = 0; guard < 20; guard++) {
    if (current.phase !== 'active') return current;
    current = answerCurrentQuestion(current);
    current = advanceRoundQuestion(current);
  }
  throw new Error('completeActiveRound did not finish within 20 questions');
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

  it('CR-52: carries startedAtMs through every round and reports elapsed time', () => {
    const T0 = 1_700_000_000_000;
    let batch = createBatch('fixed-seed', 'grade-2', T0);
    expect(batch.startedAtMs).toBe(T0);
    for (let round = 0; round < 4; round++) {
      batch = completeActiveRound(batch);
      batch = goToNextRound(batch);
      expect(batch.startedAtMs).toBe(T0); // survives every transition
    }
    const result = computeBatchResult(batch, T0 + 754_000);
    expect(result.timeUsedSec).toBe(754);
    // Negative skew (clock edge case) clamps to 0.
    expect(computeBatchResult(batch, T0 - 5_000).timeUsedSec).toBe(0);
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

describe('endBatchEarly (CR-55 "Kết thúc giữa chừng")', () => {
  it('is a no-op once the Batch is already on its summary', () => {
    let batch = createBatch('fixed-seed');
    for (let round = 0; round < 4; round++) {
      batch = completeActiveRound(batch);
      batch = goToNextRound(batch);
    }
    expect(batch.phase).toBe('batch-summary');

    expect(endBatchEarly(batch)).toBe(batch);
  });

  it('scores the partial active Round on answered questions only, then lands on batch-summary', () => {
    let batch = createBatch('fixed-seed');
    for (let i = 0; i < 3; i += 1) {
      batch = answerCurrentQuestion(batch);
      batch = advanceRoundQuestion(batch);
    }
    expect(batch.phase).toBe('active');

    const ended = endBatchEarly(batch);

    expect(ended.phase).toBe('batch-summary');
    expect(ended.roundSession).toBeNull();
    expect(ended.completedRounds).toHaveLength(1);
    expect(ended.completedRounds[0]?.totalCount).toBe(3);
    const result = computeBatchResult(ended);
    expect(result.rounds).toHaveLength(1);
    expect(result.totalQuestions).toBe(3);
  });

  it('ends with an empty outcome when tapped before any answer', () => {
    const ended = endBatchEarly(createBatch('fixed-seed'));

    expect(ended.phase).toBe('batch-summary');
    expect(ended.completedRounds).toHaveLength(1);
    expect(ended.completedRounds[0]?.totalCount).toBe(0);
    expect(computeBatchResult(ended).totalQuestions).toBe(0);
  });

  it('keeps already-completed Rounds when tapped from a round-summary (no double record)', () => {
    let batch = createBatch('fixed-seed');
    batch = completeActiveRound(batch); // -> round-summary with Round 1 recorded

    const ended = endBatchEarly(batch);

    expect(ended.phase).toBe('batch-summary');
    expect(ended.completedRounds).toHaveLength(1);
    expect(ended.completedRounds[0]?.roundNumber).toBe(1);
    const result = computeBatchResult(ended);
    expect(result.rounds).toHaveLength(1);
    expect(result.totalQuestions).toBe(ROUND_1_QUESTION_COUNT);
  });

  it('keeps the batch elapsed-time source so a partial batch still reports real timeUsedSec', () => {
    const T0 = 1_700_000_000_000;
    let batch = createBatch('fixed-seed', 'grade-2', T0);
    batch = answerCurrentQuestion(batch);
    batch = advanceRoundQuestion(batch);

    const ended = endBatchEarly(batch);

    expect(ended.startedAtMs).toBe(T0);
    expect(computeBatchResult(ended, T0 + 95_000).timeUsedSec).toBe(95);
  });
});

/**
 * Points scoring (plan.md v10 "Points Scoring", AC34, AC36): flat
 * POINTS_PER_CORRECT_ANSWER (10) per correct answer, 0 for wrong/unanswered,
 * derived purely from correctCount/totalCount - no speed bonus anywhere.
 * Round 1 is used throughout; since PRD r3 (D-10) it mixes extra-letter
 * with image-choice, so the helper answers each kind deterministically
 * correct/wrong regardless of seed.
 */
describe('points scoring (plan.md v10, AC34, AC36)', () => {
  function answerRound1Question(state: BatchState, correct: boolean): BatchState {
    const question = state.roundSession ? getCurrentQuestion(state.roundSession) : null;
    if (!question) {
      throw new Error('expected a Round 1 question, got none');
    }
    if (question.kind === 'extra-letter') {
      const wrongIndex = (question.extraIndex + 1) % question.displayLetters.length;
      const selectedIndex = correct ? question.extraIndex : wrongIndex;
      return updateRoundSession(state, (session) => submitExtraLetterAnswer(session, selectedIndex));
    }
    if (question.kind === 'image-choice') {
      const wrongIndex = (question.correctIndex + 1) % question.options.length;
      return updateRoundSession(state, (session) =>
        submitOptionAnswer(session, correct ? question.correctIndex : wrongIndex),
      );
    }
    throw new Error(`expected a Round 1 kind, got ${question.kind}`);
  }

  function completeRound1WithPattern(state: BatchState, correctPattern: boolean[]): BatchState {
    let current = state;
    let i = 0;
    while (current.phase === 'active' && i < 20) {
      current = answerRound1Question(current, correctPattern[i % correctPattern.length]);
      current = advanceRoundQuestion(current);
      i += 1;
    }
    if (current.phase === 'active') {
      throw new Error('completeRound1WithPattern did not finish within 20 questions');
    }
    return current;
  }

  it('all correct: points equals the full maxPoints', () => {
    const batch = completeRound1WithPattern(createBatch('fixed-seed'), [true]);
    const outcome = batch.completedRounds[0];

    expect(outcome?.correctCount).toBe(ROUND_1_QUESTION_COUNT);
    expect(outcome?.points).toBe(ROUND_1_QUESTION_COUNT * POINTS_PER_CORRECT_ANSWER);
    expect(outcome?.maxPoints).toBe(ROUND_1_QUESTION_COUNT * POINTS_PER_CORRECT_ANSWER);
  });

  it('all wrong: points is 0 while maxPoints still reflects the full Round', () => {
    const batch = completeRound1WithPattern(createBatch('fixed-seed'), [false]);
    const outcome = batch.completedRounds[0];

    expect(outcome?.correctCount).toBe(0);
    expect(outcome?.points).toBe(0);
    expect(outcome?.maxPoints).toBe(ROUND_1_QUESTION_COUNT * POINTS_PER_CORRECT_ANSWER);
  });

  it('mixed correct/wrong: points reflects only the correct answers', () => {
    const batch = completeRound1WithPattern(createBatch('fixed-seed'), [true, false]);
    const outcome = batch.completedRounds[0];

    expect(outcome?.points).toBe((outcome?.correctCount ?? 0) * POINTS_PER_CORRECT_ANSWER);
    expect(outcome?.points).toBeGreaterThan(0);
    expect(outcome?.points).toBeLessThan(outcome?.maxPoints ?? 0);
    expect(outcome?.maxPoints).toBe(ROUND_1_QUESTION_COUNT * POINTS_PER_CORRECT_ANSWER);
  });

  it('a Round ended early via the timer scores points only on the fewer questions actually answered', () => {
    let batch = createBatch('fixed-seed');
    // Answer exactly 3 questions (2 correct, 1 wrong), then the timer fires.
    batch = answerRound1Question(batch, true);
    batch = advanceRoundQuestion(batch);
    batch = answerRound1Question(batch, false);
    batch = advanceRoundQuestion(batch);
    batch = answerRound1Question(batch, true);
    batch = advanceRoundQuestion(batch);
    expect(batch.phase).toBe('active'); // still mid-round

    const ended = endRoundEarly(batch);
    const outcome = ended.completedRounds[0];

    expect(outcome?.totalCount).toBe(3);
    expect(outcome?.totalCount).toBeLessThan(ROUND_1_QUESTION_COUNT);
    expect(outcome?.correctCount).toBe(2);
    expect(outcome?.points).toBe(2 * POINTS_PER_CORRECT_ANSWER);
    expect(outcome?.maxPoints).toBe(3 * POINTS_PER_CORRECT_ANSWER);
  });

  it('computeBatchResult sums points/maxPoints across every completed Round', () => {
    let batch = completeRound1WithPattern(createBatch('fixed-seed'), [true]); // full Round 1, all correct
    batch = goToNextRound(batch);
    batch = endRoundEarly(batch); // Round 2 times out with 0 answered

    const result = computeBatchResult(batch);

    expect(result.points).toBe(ROUND_1_QUESTION_COUNT * POINTS_PER_CORRECT_ANSWER + 0);
    expect(result.maxPoints).toBe(ROUND_1_QUESTION_COUNT * POINTS_PER_CORRECT_ANSWER + 0);
  });
});
