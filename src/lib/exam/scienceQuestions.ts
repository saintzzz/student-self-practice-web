import type { ExamQuestion, GrammarMcqQuestion, TextAnswerQuestion, TrueFalseQuestion } from '../../types/exam';
import { seededShuffleIndices } from '../prng';
import { scienceBankForGrade } from '../../data/scienceBank';

/**
 * CR-24 - Science program pool. Each authored fact yields 3 question
 * variants (MCQ / True-False x2 / fill-in), so the pool stays ~3-4x the
 * bank size with real factual content, never generated filler.
 */
export function generateScienceQuestions(gradeId: string): ExamQuestion[] {
  const facts = scienceBankForGrade(gradeId);
  const questions: ExamQuestion[] = [];
  const T = 'science';
  let n = 0;
  const id = () => `q-sci-${gradeId}-${n++}`;

  for (const fact of facts) {
    // MCQ variant
    const texts = [fact.answer, ...fact.distractors] as [string, string, string, string];
    const order = seededShuffleIndices(4, `${fact.question}-o`);
    const options = order.map((i) => texts[i]!) as [string, string, string, string];
    const correctIndex = order.indexOf(0) as 0 | 1 | 2 | 3;
    questions.push({
      id: id(),
      topicId: T,
      kind: 'grammar-mcq',
      prompt: fact.question,
      options,
      correctIndex,
      explanation: `${fact.answer} - ${fact.explanationVi}`,
    } satisfies GrammarMcqQuestion);

    // True/False variants
    for (const [_variant, statement, answer] of [
      ['t', fact.trueStatement, true],
      ['f', fact.falseStatement, false],
    ] as const) {
      questions.push({
        id: id(),
        topicId: T,
        kind: 'true-false-reading',
        passage: fact.question,
        statement,
        answer,
        explanation: fact.explanationVi,
      } satisfies TrueFalseQuestion);
    }

    // Fill-in variant: "How many legs does a cat have?" -> "four"
    questions.push({
      id: id(),
      topicId: T,
      kind: 'text-answer',
      sentence: `${fact.question} - ${fact.answer}.`,
      displaySentence: `${fact.question} - ___.`,
      accept: [fact.answer, fact.answer.toLowerCase()],
      explanation: fact.explanationVi,
    } satisfies TextAnswerQuestion);
  }

  return questions;
}
