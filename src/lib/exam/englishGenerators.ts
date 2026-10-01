import type { GrammarMcqQuestion, TrueFalseQuestion } from '../../types/exam';
import { seededShuffleIndices } from '../prng';
import { grammarBankForGrade } from '../../data/grammarBank';
import { readingBankForGrade } from '../../data/readingBank';

/**
 * CR-24 - wraps the authored grammar bank into ExamQuestion objects.
 * Option order is shuffled deterministically per item so the stored
 * `answer` index never leaks position.
 */
export function generateGrammarMcqQuestions(gradeId: string): GrammarMcqQuestion[] {
  return grammarBankForGrade(gradeId).map((item, i) => {
    const order = seededShuffleIndices(4, `gmcq-${gradeId}-${i}`);
    const options = order.map((ix) => item.options[ix]!) as [string, string, string, string];
    const correctIndex = order.indexOf(item.answer) as 0 | 1 | 2 | 3;
    return {
      id: `q-gmcq-${gradeId}-${i}`,
      topicId: 'grammar',
      kind: 'grammar-mcq',
      prompt: item.prompt,
      options,
      correctIndex,
      explanation: item.explanationVi,
    };
  });
}

/** Reading comprehension True/False questions from the passage bank. */
export function generateTrueFalseQuestions(gradeId: string): TrueFalseQuestion[] {
  const questions: TrueFalseQuestion[] = [];
  let n = 0;
  for (const passage of readingBankForGrade(gradeId)) {
    for (const stmt of passage.statements) {
      questions.push({
        id: `q-tf-${gradeId}-${n++}`,
        topicId: 'reading',
        kind: 'true-false-reading',
        passage: passage.passage,
        statement: stmt.text,
        answer: stmt.answer,
        explanation: passage.explanationVi,
      });
    }
  }
  return questions;
}
