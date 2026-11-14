import { describe, expect, it } from 'vitest';
import {
  SAMPLE_ROSTER,
  normalizeShowQuestion,
  parseRoster,
  pickStudent,
  podiumOrder,
} from './classshow';
import type { ExamQuestion } from '../types/exam';

const mcq = {
  id: 'q1', topicId: 't', kind: 'grammar-mcq',
  prompt: 'Lien ___ lunch at 11:30.',
  options: ['has', 'have', 'is', 'are'],
  correctIndex: 0, explanation: '',
} as unknown as ExamQuestion;

describe('normalizeShowQuestion', () => {
  it('maps grammar-mcq to a choice question', () => {
    const s = normalizeShowQuestion(mcq);
    expect(s).toMatchObject({ kind: 'choice', options: ['has', 'have', 'is', 'are'], correctIndex: 0 });
  });

  it('maps true-false-reading to bool', () => {
    const s = normalizeShowQuestion({
      id: 'q2', topicId: 't', kind: 'true-false-reading',
      passage: 'Tom has a dog.', statement: 'Tom has a cat.', answer: false, explanation: '',
    } as unknown as ExamQuestion);
    expect(s).toMatchObject({ kind: 'bool', boolAnswer: false, subPrompt: 'Tom has a dog.' });
  });

  it('maps text-answer to reveal with the accepted answer', () => {
    const s = normalizeShowQuestion({
      id: 'q3', topicId: 't', kind: 'text-answer',
      sentence: 'Five times nine is forty-five.', displaySentence: 'Five times nine is ___.',
      accept: ['forty-five', '45'], explanation: '',
    } as unknown as ExamQuestion);
    expect(s).toMatchObject({ kind: 'reveal', revealText: 'forty-five' });
  });

  it('maps word-order to reveal with the canonical sentence', () => {
    const s = normalizeShowQuestion({
      id: 'q4', topicId: 't', kind: 'word-order',
      sentence: 'I can see a cat.', tiles: ['see', 'I', 'cat', 'can', 'a', '.'], explanation: '',
    } as unknown as ExamQuestion);
    expect(s).toMatchObject({ kind: 'reveal', revealText: 'I can see a cat.' });
  });

  it('keeps image-option MCQs - the class points at a letter cell', () => {
    const s = normalizeShowQuestion({
      ...mcq, optionImages: ['/a.png', '/b.png', '/c.png', '/d.png'],
    } as ExamQuestion);
    expect(s).toMatchObject({ kind: 'choice', optionImages: ['/a.png', '/b.png', '/c.png', '/d.png'] });
  });

  it('drops non-displayable kinds', () => {
    const s = normalizeShowQuestion({ id: 'q5', topicId: 't', kind: 'letter-tracing' } as unknown as ExamQuestion);
    expect(s).toBeNull();
  });

  /* CR-142 D1: pending/unkeyed bank rows (bankId marker) must never
     reach the projector - they render fabricated verdicts (MCQ -> A,
     true-false -> SAI, text-answer -> empty reveal). */
  it('drops pending bank rows - the bankId marker means no key exists', () => {
    expect(normalizeShowQuestion({ ...mcq, bankId: 'b1' } as unknown as ExamQuestion)).toBeNull();
    expect(normalizeShowQuestion({
      id: 'q6', topicId: 't', kind: 'true-false-reading',
      passage: 'P', statement: 'S', answer: false, bankId: 'b2',
    } as unknown as ExamQuestion)).toBeNull();
    expect(normalizeShowQuestion({
      id: 'q7', topicId: 't', kind: 'text-answer',
      displaySentence: 'D', accept: [], bankId: 'b3',
    } as unknown as ExamQuestion)).toBeNull();
  });

  it('drops MCQs whose key index is missing or out of range', () => {
    expect(normalizeShowQuestion({ ...mcq, correctIndex: undefined } as unknown as ExamQuestion)).toBeNull();
    expect(normalizeShowQuestion({ ...mcq, correctIndex: 4 } as unknown as ExamQuestion)).toBeNull();
    expect(normalizeShowQuestion({ ...mcq, correctIndex: -1 } as unknown as ExamQuestion)).toBeNull();
  });

  /* r198: NaN and fractional indexes pass `typeof number` but can never
     match a rendered cell - the stage would light nothing up. */
  it('drops MCQs with NaN or fractional key indexes', () => {
    expect(normalizeShowQuestion({ ...mcq, correctIndex: NaN } as unknown as ExamQuestion)).toBeNull();
    expect(normalizeShowQuestion({ ...mcq, correctIndex: 1.5 } as unknown as ExamQuestion)).toBeNull();
    expect(normalizeShowQuestion({
      id: 'q12', topicId: 't', kind: 'odd-pronunciation',
      options: ['a', 'b', 'c'], correctIndex: NaN,
    } as unknown as ExamQuestion)).toBeNull();
    expect(normalizeShowQuestion({
      id: 'q13', topicId: 't', kind: 'listening-mcq',
      prompt: 'Nghe.', options: ['a', 'b'], correctIndex: 0.5,
    } as unknown as ExamQuestion)).toBeNull();
  });

  it('drops true-false rows without a boolean key', () => {
    expect(normalizeShowQuestion({
      id: 'q8', topicId: 't', kind: 'true-false-reading',
      passage: 'P', statement: 'S', answer: undefined,
    } as unknown as ExamQuestion)).toBeNull();
  });

  it('drops reveal rows with nothing to reveal', () => {
    expect(normalizeShowQuestion({
      id: 'q9', topicId: 't', kind: 'text-answer',
      displaySentence: 'Five times nine is ___.', accept: [],
    } as unknown as ExamQuestion)).toBeNull();
    expect(normalizeShowQuestion({
      id: 'q10', topicId: 't', kind: 'word-order',
      sentence: '', tiles: ['a', 'b'],
    } as unknown as ExamQuestion)).toBeNull();
  });

  it('drops default-branch MCQ shapes that are pending', () => {
    expect(normalizeShowQuestion({
      id: 'q11', topicId: 't', kind: 'listening-mcq',
      prompt: 'Nghe và chọn.', options: ['a', 'b'], correctIndex: 1, bankId: 'b4',
    } as unknown as ExamQuestion)).toBeNull();
  });
});

describe('parseRoster', () => {
  it('splits commas and newlines, trims, dedupes', () => {
    expect(parseRoster('Minh Anh, Bảo Nam\nMinh Anh,,Khánh Linh ; Gia Huy'))
      .toEqual(['Minh Anh', 'Bảo Nam', 'Khánh Linh', 'Gia Huy']);
  });
  it('drops names that are too short', () => {
    expect(parseRoster('A, Bo')).toEqual(['Bo']);
  });
  it('caps at 60', () => {
    expect(parseRoster(Array.from({ length: 70 }, (_, i) => `Em ${i + 1}`).join(',')).length).toBe(60);
  });
  it('sample roster is a playable class', () => {
    expect(parseRoster(SAMPLE_ROSTER.join(', ')).length).toBe(8);
  });
});

describe('pickStudent', () => {
  it('never repeats the same student twice in a 2+ roster', () => {
    const idx = pickStudent(['A', 'B', 'C'], 1, () => (1 + 0.1) / 3); // rand -> index 1
    expect(idx).not.toBe(1);
  });
  it('single-name roster always picks 0', () => {
    expect(pickStudent(['Solo'], 0, () => 0.9)).toBe(0);
  });
  it('steal: exclude skips students who already missed', () => {
    const idx = pickStudent(['A', 'B', 'C'], -1, () => 0.9, new Set([0, 2]));
    expect(idx).toBe(1);
  });
  it('returns -1 when everyone already missed', () => {
    expect(pickStudent(['A', 'B'], 0, () => 0.5, new Set([0, 1]))).toBe(-1);
  });
});

describe('podiumOrder', () => {
  it('sorts by score desc; ties keep roster order (no name bias)', () => {
    const order = podiumOrder([
      { name: 'B', score: 10 }, { name: 'A', score: 10 }, { name: 'C', score: 30 },
    ]);
    expect(order.map((p) => p.name)).toEqual(['C', 'B', 'A']);
  });
});
