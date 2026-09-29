import { describe, expect, it } from 'vitest';
import {
  ALL_WORDS,
  GRADES,
  TOPICS,
  getTopicsByGrade,
  getWordsByGrade,
  getWordsByTopic,
} from './index';
import {
  advanceRoundQuestion,
  createBatch,
  goToNextRound,
  updateRoundSession,
  type BatchState,
} from '../../lib/batch/batchSession';
import {
  getCurrentQuestion,
  submitExtraLetterAnswer,
  submitListeningAnswer,
  submitOptionAnswer,
  submitPairMatchingAnswer,
  submitPronunciationAnswer,
} from '../../lib/practiceSession';
import type { Question } from '../../types';

/**
 * CR-07 (PRD s17, AC-G1..AC-G7): five-grade coverage. Grade pools must be
 * self-contained for every round generator, deterministic per seed+grade,
 * and must not leak words outside the selected grade's topic set.
 */

const GRADE_IDS = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'] as const;
const GRADE_POOL_WORD_IDS: Readonly<Record<string, ReadonlySet<string>>> = Object.fromEntries(
  GRADE_IDS.map((id) => [id, new Set(getWordsByGrade(id).map((w) => w.id))]),
);

/** Every vocabulary word id a question can reference (answer + options + pairs). */
function questionWordIds(q: Question): string[] {
  const ids: string[] = [];
  if ('wordId' in q && q.wordId) ids.push(q.wordId);
  if ('promptWordId' in q && q.promptWordId) ids.push(q.promptWordId);
  if ('optionWordIds' in q && q.optionWordIds) ids.push(...q.optionWordIds);
  if (q.kind === 'picture-pair-matching') ids.push(...q.pairs.map((p) => p.wordId));
  return ids;
}

/** Same guaranteed-answer technique as batchSession.test.ts: option 0 / a never-matching guess. */
function answerCurrentQuestion(state: BatchState): BatchState {
  const question = state.roundSession ? getCurrentQuestion(state.roundSession) : null;
  if (!question) return state;
  switch (question.kind) {
    case 'extra-letter':
      return updateRoundSession(state, (s) => submitExtraLetterAnswer(s, 0));
    case 'listening-sentence-fill-blank':
    case 'listening-fill-blank':
      return updateRoundSession(state, (s) => submitListeningAnswer(s, '0000'));
    case 'pronunciation-recording':
      return updateRoundSession(state, (s) => submitPronunciationAnswer(s, '0000'));
    case 'picture-pair-matching':
      return updateRoundSession(state, (s) => submitPairMatchingAnswer(s, true));
    default:
      return updateRoundSession(state, (s) => submitOptionAnswer(s, 0));
  }
}

function completeActiveRound(state: BatchState): BatchState {
  let current = state;
  for (let guard = 0; guard < 20; guard += 1) {
    if (current.phase !== 'active') return current;
    current = advanceRoundQuestion(answerCurrentQuestion(current));
  }
  throw new Error('completeActiveRound did not finish within 20 questions');
}

describe('GRADES registry (AC-G1)', () => {
  it('lists all five primary grades in order with Vietnamese names', () => {
    expect(GRADES.map((g) => g.id)).toEqual(GRADE_IDS);
    expect(GRADES.map((g) => g.name)).toEqual(['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5']);
  });
});

describe('topic to grade assignment (AC-G2)', () => {
  it('every topic is registered under exactly one grade and present in TOPICS', () => {
    const registered = new Set(TOPICS.map((t) => t.id));
    for (const gradeId of GRADE_IDS) {
      const topics = getTopicsByGrade(gradeId);
      expect(topics.length).toBeGreaterThanOrEqual(8);
      for (const topic of topics) {
        expect(topic.gradeId).toBe(gradeId);
        expect(registered.has(topic.id)).toBe(true);
      }
    }
    const totalAssigned = GRADE_IDS.reduce((sum, id) => sum + getTopicsByGrade(id).length, 0);
    expect(totalAssigned).toBe(TOPICS.length);
  });

  it('every topic has at least 4 words and all its words are in ALL_WORDS', () => {
    const bankIds = new Set(ALL_WORDS.map((w) => w.id));
    // 'g2-places' thin-3 exception documented in index.test.ts.
    const MIN_WORDS_EXCEPTIONS = new Set(['g2-places']);
    for (const topic of TOPICS) {
      const words = getWordsByTopic(topic.id);
      if (!MIN_WORDS_EXCEPTIONS.has(topic.id)) {
        expect(words.length, `topic ${topic.id}`).toBeGreaterThanOrEqual(4);
      }
      for (const w of words) {
        expect(bankIds.has(w.id), `word ${w.id} missing from ALL_WORDS`).toBe(true);
      }
    }
  });
});

describe('grade vocabulary pools (AC-G3)', () => {
  const EXPECTED_MIN: Record<string, number> = {
    'grade-1': 60,
    'grade-2': 300,
    'grade-3': 130,
    'grade-4': 120,
    'grade-5': 110,
  };

  it.each(GRADE_IDS)('pool %s is deduped, bank-resident and large enough', (gradeId) => {
    const pool = getWordsByGrade(gradeId);
    expect(pool.length).toBeGreaterThanOrEqual(EXPECTED_MIN[gradeId]);
    const ids = pool.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    const bankIds = new Set(ALL_WORDS.map((w) => w.id));
    for (const w of pool) expect(bankIds.has(w.id)).toBe(true);
  });

  it("pool equals the union of the grade's own topic words", () => {
    for (const gradeId of GRADE_IDS) {
      const union = getTopicsByGrade(gradeId).flatMap((t) => getWordsByTopic(t.id));
      const unionIds = new Set(union.map((w) => w.id));
      expect(new Set(getWordsByGrade(gradeId).map((w) => w.id))).toEqual(unionIds);
    }
  });

  it('shared review words keep one canonical id across grades (R-G2)', () => {
    // 'cat' is taught in G1 pets and reviewed in G3 pets - same object.
    const g1 = getWordsByGrade('grade-1').find((w) => w.id === 'cat');
    const g3 = getWordsByGrade('grade-3').find((w) => w.id === 'cat');
    expect(g1).toBeDefined();
    expect(g3).toBe(g1);
  });
});

describe('batch generation per grade (AC-G4, AC-G5)', () => {
  it.each(GRADE_IDS)('createBatch with grade %s yields a full first round', (gradeId) => {
    const batch = createBatch('fixed-seed', gradeId);
    expect(batch.gradeId).toBe(gradeId);
    expect(batch.roundSession?.questions.length).toBeGreaterThan(0);
  });

  it.each(GRADE_IDS)('same seed + grade %s is deterministic', (gradeId) => {
    const a = createBatch('fixed-seed', gradeId).roundSession?.questions.map((q) => q.id);
    const b = createBatch('fixed-seed', gradeId).roundSession?.questions.map((q) => q.id);
    expect(a).toEqual(b);
  });

  it('different grades produce different first-round word sets (AC-G5)', () => {
    const seen = GRADE_IDS.map(
      (gradeId) =>
        new Set(
          (createBatch('grade-diff-seed', gradeId).roundSession?.questions ?? []).flatMap(
            questionWordIds,
          ),
        ),
    );
    // Word sets may overlap via shared review words, but identical sets
    // across all five grades would prove grade-blind draws.
    expect(new Set(seen.map((s) => [...s].sort().join(','))).size).toBeGreaterThan(1);
  });
});

describe('no cross-grade leakage (AC-G6)', () => {
  it.each(GRADE_IDS)(
    'every question wordId in a full batch stays inside the %s pool',
    (gradeId) => {
      const pool = GRADE_POOL_WORD_IDS[gradeId];
      let batch = createBatch('leak-check', gradeId);
      for (let round = 0; round < 4 && batch.phase !== 'batch-summary'; round += 1) {
        const questions = batch.roundSession?.questions ?? [];
        expect(questions.length).toBeGreaterThan(0);
        for (const q of questions) {
          for (const id of questionWordIds(q)) {
            expect(pool.has(id), `${q.id} references ${id} outside ${gradeId}`).toBe(true);
          }
        }
        batch = goToNextRound(completeActiveRound(batch));
      }
      expect(batch.phase).toBe('batch-summary');
    },
  );
});
