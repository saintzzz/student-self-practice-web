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

  it('drops optionImages MCQs - image grids do not stage on one screen', () => {
    const s = normalizeShowQuestion({
      ...mcq, optionImages: ['/a.png', '/b.png', '/c.png', '/d.png'],
    } as ExamQuestion);
    expect(s).toBeNull();
  });

  it('drops non-displayable kinds', () => {
    const s = normalizeShowQuestion({ id: 'q5', topicId: 't', kind: 'letter-tracing' } as unknown as ExamQuestion);
    expect(s).toBeNull();
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
});

describe('podiumOrder', () => {
  it('sorts by score desc, name asc on ties', () => {
    const order = podiumOrder([
      { name: 'B', score: 10 }, { name: 'A', score: 10 }, { name: 'C', score: 30 },
    ]);
    expect(order.map((p) => p.name)).toEqual(['C', 'A', 'B']);
  });
});
