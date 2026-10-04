import type { GrammarBankItem } from '../../data/grammarBank';
import type {
  GrammarMcqQuestion,
  TrueFalseQuestion,
} from '../../types/exam';
import { seededShuffleIndices } from '../prng';
import { grammarBankForGrade } from '../../data/grammarBank';
import { ioeBanksForGrade } from '../../data/ioeBanks';
import { readingBankForGrade } from '../../data/readingBank';

/**
 * CR-24 - wraps an authored MCQ bank into ExamQuestion objects.
 * Option order is shuffled deterministically per item so the stored
 * `answer` index never leaks position.
 */
function toMcqQuestions(
  items: readonly GrammarBankItem[],
  gradeId: string,
  topicId: string,
  idPrefix: string,
): GrammarMcqQuestion[] {
  return items.map((item, i) => {
    const order = seededShuffleIndices(4, `${idPrefix}-${gradeId}-${i}`);
    const options = order.map((ix) => item.options[ix]!) as [string, string, string, string];
    const correctIndex = order.indexOf(item.answer) as 0 | 1 | 2 | 3;
    return {
      id: `q-${idPrefix}-${gradeId}-${i}`,
      topicId,
      kind: 'grammar-mcq',
      prompt: item.prompt,
      options,
      correctIndex,
      explanation: item.explanationVi,
    };
  });
}

export function generateGrammarMcqQuestions(gradeId: string): GrammarMcqQuestion[] {
  return toMcqQuestions(grammarBankForGrade(gradeId), gradeId, 'grammar', 'gmcq');
}

/**
 * CR-26 - the extra IOE types observed in a real G4 exam, all MCQ-
 * shaped: masked-word spelling, reference-letter pronunciation, error
 * correction, which-is-correct and calendar facts. Grade 1-2 only gets
 * the spelling masks (the rest is above their level).
 */
export function generateIoeMcqQuestions(gradeId: string): GrammarMcqQuestion[] {
  const banks = ioeBanksForGrade(gradeId);
  return [
    ...toMcqQuestions(banks.spelling, gradeId, 'spelling', 'spell'),
    ...toMcqQuestions(banks.pronunciation, gradeId, 'pronunciation', 'pron'),
    ...toMcqQuestions(banks.error, gradeId, 'grammar', 'err'),
    ...toMcqQuestions(banks.correct, gradeId, 'grammar', 'corr'),
    ...toMcqQuestions(banks.facts, gradeId, 'facts', 'fact'),
  ];
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
