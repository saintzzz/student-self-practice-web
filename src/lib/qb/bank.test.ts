import { describe, expect, it } from 'vitest';
import { gradeNumber, toExamQuestion, type QbRow } from './bank';
import { isExamAnswerCorrect } from '../exam/examSession';

function row(partial: Partial<QbRow>): QbRow {
  return {
    id: 'q1',
    grade: 3,
    subject: 'english',
    domain: 'vocabulary',
    skill: 'vocabulary-recognition',
    question_type: 'mcq',
    difficulty: 2,
    topic_key: 'school-objects',
    prompt_text: 'Choose the correct word.',
    transcript: null,
    choices: null,
    answer: {},
    explanation_vi: 'Giai thich.',
    variant_group_id: null,
    asset_paths: [],
    audio_transcripts: [],
    ...partial,
  };
}

describe('gradeNumber', () => {
  it('parses grade-N ids', () => {
    expect(gradeNumber('grade-1')).toBe(1);
    expect(gradeNumber('grade-5')).toBe(5);
  });
  it('falls back to 5 on unknown ids', () => {
    expect(gradeNumber('unknown')).toBe(5);
  });
});

describe('toExamQuestion', () => {
  it('maps mcq to grammar-mcq with correctIndex', () => {
    const q = toExamQuestion(row({
      choices: ['a', 'b', 'c', 'd'],
      answer: { index: 2 },
    }));
    expect(q).toMatchObject({ kind: 'grammar-mcq', correctIndex: 2, options: ['a', 'b', 'c', 'd'] });
    expect(isExamAnswerCorrect(q!, { type: 'option', index: 2 })).toBe(true);
    expect(isExamAnswerCorrect(q!, { type: 'option', index: 0 })).toBe(false);
  });

  it('maps image-to-word-mcq with imageUrl', () => {
    const q = toExamQuestion(row({
      question_type: 'image-to-word-mcq',
      choices: ['scissors', 'ruler', 'bag', 'pencil'],
      answer: { index: 3 },
      asset_paths: ['images/concepts/concept-pencil.webp'],
    }));
    expect(q).toMatchObject({ kind: 'grammar-mcq', imageUrl: '/images/concepts/concept-pencil.webp' });
  });

  it('maps word-to-image-mcq with optionImages', () => {
    const q = toExamQuestion(row({
      question_type: 'word-to-image-mcq',
      choices: ['scissors', 'ruler', 'bag', 'pencil'],
      answer: { index: 0 },
      asset_paths: ['images/a.webp', 'images/b.webp', 'images/c.webp', 'images/d.webp'],
    }));
    expect(q).toMatchObject({
      kind: 'grammar-mcq',
      optionImages: ['/images/a.webp', '/images/b.webp', '/images/c.webp', '/images/d.webp'],
    });
  });

  it('maps listening mcq: transcript attached, prompt replaced', () => {
    const q = toExamQuestion(row({
      question_type: 'mcq',
      skill: 'listening',
      choices: ['cat', 'dog', 'bird', 'fish'],
      answer: { index: 1 },
      audio_transcripts: ['It is a dog.'],
    }));
    expect(q).toMatchObject({ kind: 'grammar-mcq', transcript: 'It is a dog.', prompt: 'Nghe và chọn đáp án đúng.' });
  });

  it('maps true-false', () => {
    const q = toExamQuestion(row({ question_type: 'true-false', answer: { boolean: true } }));
    expect(q).toMatchObject({ kind: 'true-false-reading', answer: true });
    expect(isExamAnswerCorrect(q!, { type: 'bool', value: true })).toBe(true);
    expect(isExamAnswerCorrect(q!, { type: 'bool', value: false })).toBe(false);
  });

  it('maps text-answer', () => {
    const q = toExamQuestion(row({ question_type: 'text-answer', answer: { text: '11' } }));
    expect(q).toMatchObject({ kind: 'text-answer', accept: ['11'] });
    expect(isExamAnswerCorrect(q!, { type: 'text', text: ' 11 ' })).toBe(true);
  });

  it('maps reorder with scrambled tiles (never the sorted order)', () => {
    const q = toExamQuestion(row({ question_type: 'reorder', answer: { text: 'I like my ruler.' } }));
    expect(q).toMatchObject({ kind: 'word-order', sentence: 'I like my ruler.' });
    if (q?.kind !== 'word-order') throw new Error('expected word-order');
    expect(q.tiles.length).toBe(4);
    expect([...q.tiles].sort()).toEqual(['I', 'like', 'my', 'ruler.'].sort());
    expect(q.tiles.join(' ')).not.toBe('I like my ruler.');
    const correct = [q.tiles.indexOf('I'), q.tiles.indexOf('like'), q.tiles.indexOf('my'), q.tiles.indexOf('ruler.')];
    expect(isExamAnswerCorrect(q, { type: 'order', indices: correct })).toBe(true);
  });

  it('coerces numeric choices/answers to strings (math banks)', () => {
    const q = toExamQuestion(row({
      subject: 'math',
      choices: ['7', '8', '9', '10'],
      answer: { index: 1 },
    }));
    expect(q).toMatchObject({ kind: 'grammar-mcq', options: ['7', '8', '9', '10'] });
    const ta = toExamQuestion(row({ question_type: 'text-answer', answer: { text: 11 as unknown as string } }));
    expect(ta).toMatchObject({ kind: 'text-answer', accept: ['11'] });
  });

  it('returns null when choices are not exactly 4', () => {
    expect(toExamQuestion(row({ choices: ['a', 'b', 'c'], answer: { index: 0 } }))).toBeNull();
  });

  it('returns null for unmappable types', () => {
    expect(toExamQuestion(row({ question_type: 'constructed-response' }))).toBeNull();
    expect(toExamQuestion(row({ question_type: 'speaking-prompt' }))).toBeNull();
  });
});
