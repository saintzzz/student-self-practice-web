import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ExamQuestionView } from './ExamScreen';
import { createExam } from '../lib/exam/examSession';
import type { ExamQuestion } from '../types/exam';

/**
 * CR-42 real-bank render contract.
 *
 * Why this exists: every pre-CR-42 component test fed the UI synthetic
 * fixtures ('right', 'w1'...), so defects in the REAL data passed all
 * gates - empty passages (CR-38), raw <u> markup (CR-40). This test
 * generates actual questions from the shipped banks and renders them
 * through the production component, asserting the rendered output is
 * complete and clean. Any future content bug of the same class fails
 * here instead of on ea.vieschool.com.
 */

const GRADES = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'] as const;
const QUESTIONS_PER_GRADE = 80;

function renderQuestion(q: ExamQuestion): HTMLElement {
  const { container, unmount } = render(
    <ExamQuestionView question={q} answer={null} onAnswer={() => undefined} />,
  );
  const el = container.cloneNode(true) as HTMLElement;
  unmount();
  return el;
}

const RAW_TAG = /<\/?[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/;
const JUNK = /\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]/;

describe('real-bank questions render cleanly through the production UI (CR-42)', () => {
  it.each(GRADES)('%s: every question renders without raw markup or junk text', (gradeId) => {
    const exam = createExam('english', gradeId, 'cr42-contract', 1_700_000_000_000, QUESTIONS_PER_GRADE);
    expect(exam.questions.length).toBeGreaterThan(0);
    const kinds = new Set<string>();
    for (const q of exam.questions) {
      kinds.add(q.kind);
      const el = renderQuestion(q);
      const text = el.textContent ?? '';
      expect(RAW_TAG.test(text), `${gradeId} ${q.kind} leaks raw markup: ${text.slice(0, 120)}`).toBe(false);
      expect(JUNK.test(text), `${gradeId} ${q.kind} shows junk: ${text.slice(0, 120)}`).toBe(false);
      // Every question must offer at least one interactive element or an
      // input - a question rendering dead markup is a bug.
      const interactive = el.querySelector('button, input, textarea, [role="button"]');
      expect(interactive, `${gradeId} ${q.kind} rendered no interactive element`).not.toBeNull();
    }
    // Sanity: the exam pool still exercises the IOE kinds the UI ships.
    expect(kinds.has('grammar-mcq')).toBe(true);
    expect(kinds.size, `${gradeId} kind variety collapsed`).toBeGreaterThanOrEqual(4);
  });

  it.each(GRADES)('%s: true-false questions always render a visible passage (CR-38)', (gradeId) => {
    const exam = createExam('english', gradeId, 'cr42-tf', 1_700_000_000_000, QUESTIONS_PER_GRADE);
    const tfs = exam.questions.filter((q) => q.kind === 'true-false-reading');
    for (const q of tfs) {
      const el = renderQuestion(q);
      const paragraphs = [...el.querySelectorAll('p')].map((p) => (p.textContent ?? '').trim());
      expect(
        paragraphs.some((p) => p.length >= 20),
        `${gradeId} tf question rendered no visible passage`,
      ).toBe(true);
    }
  });
});

describe('V6 row -> ExamQuestion -> rendered UI (CR-51)', () => {
  const base: import('../lib/qb/bank').QbRow = {
    id: 'q1', grade: 4, subject: 'english', domain: 'reading', skill: 'reading',
    question_type: 'mcq', difficulty: 2, topic_key: 'reading', prompt_text: '',
    transcript: null, passage: null, choices: null, answer: {},
    explanation_vi: 'e', variant_group_id: null, asset_paths: [], audio_transcripts: [],
  };

  it('reading mcq shows the passage above the prompt', async () => {
    const { toExamQuestion } = await import('../lib/qb/bank');
    const q = toExamQuestion({
      ...base,
      prompt_text: 'Read the passage. Where does Lan go on Sunday?',
      passage: 'On Sunday, Lan goes to the sports centre with a friend.',
      choices: ['library', 'sports centre', 'school', 'park'],
      answer: { index: 1 },
    });
    const el = renderQuestion(q!);
    const passage = el.querySelector('[data-testid="exam-passage"]');
    expect(passage?.textContent).toContain('sports centre');
    expect(el.textContent).toContain('Where does Lan go on Sunday?');
  });

  it('true-false reading shows the passage', async () => {
    const { toExamQuestion } = await import('../lib/qb/bank');
    const q = toExamQuestion({
      ...base,
      question_type: 'true-false',
      prompt_text: 'Read the passage and decide: True or False?',
      passage: 'I say hello to my friend.',
      answer: { boolean: true },
    });
    const el = renderQuestion(q!);
    expect(el.textContent).toContain('I say hello to my friend.');
    expect(JUNK.test(el.textContent ?? '')).toBe(false);
  });

  it('word-to-image-mcq renders image options with text labels, never junk', async () => {
    const { toExamQuestion } = await import('../lib/qb/bank');
    const q = toExamQuestion({
      ...base,
      question_type: 'word-to-image-mcq',
      prompt_text: 'Which picture shows: architect?',
      choices: [
        { assetId: 'concept-dentist-fed1df' },
        { assetId: 'concept-engineer-616954' },
        { assetId: 'concept-architect-cadcfc' },
        { assetId: 'concept-banker-9cc826' },
      ],
      answer: { index: 2 },
      asset_paths: [
        'images/concepts/concept-dentist-fed1df.webp',
        'images/concepts/concept-engineer-616954.webp',
        'images/concepts/concept-architect-cadcfc.webp',
        'images/concepts/concept-banker-9cc826.webp',
      ],
    });
    const el = renderQuestion(q!);
    const text = el.textContent ?? '';
    expect(JUNK.test(text)).toBe(false);
    expect(el.querySelectorAll('[data-testid^="exam-option-image-"]')).toHaveLength(4);
    expect(el.querySelector('[data-testid="exam-option-image-2"]')?.getAttribute('src'))
      .toBe('/images/concepts/concept-architect-cadcfc.webp');
  });
});
