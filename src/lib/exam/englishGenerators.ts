import type { GrammarBankItem } from '../../data/grammarBank';
import type { GrammarMcqQuestion, MissingLetterQuestion, TrueFalseQuestion } from '../../types/exam';
import { seededShuffleIndices } from '../prng';
import { grammarBankForGrade } from '../../data/grammarBank';
import { ioeBanksForGrade } from '../../data/ioeBanks';
import { ioeBankForGrade } from '../../data/ioeRealBank';
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

/**
 * Real IOE question bank harvested from authorized Thi thử / Tu luyện
 * sessions per grade (scripts/ioe-convert-all.mjs). Coverage is
 * grade-specific: G4 is the deepest (Thi thử bank), G1-3/G5 come from
 * Tu luyện rounds. Grade 5 also falls back to the G4 bank - same band.
 */
export function ioeRealBankForGrade(gradeId: string) {
  return ioeBankForGrade(gradeId);
}

/** Pick up to `n` distractor words of similar length from the same bank. */
function makeWordDistractors(word: string, others: readonly { word: string }[]): string[] {
  return others
    .filter((o) => o.word !== word && Math.abs(o.word.length - word.length) <= 2)
    .slice(0, 3)
    .map((o) => o.word);
}

export function generateIoeRealMcqQuestions(gradeId: string): GrammarMcqQuestion[] {
  const bank = ioeRealBankForGrade(gradeId);
  if (!bank) return [];
  const mcqs = [...bank.mcq];
  // Grade 5 reuses the G4 mcq pool - same curriculum band.
  if (gradeId === 'grade-5') mcqs.push(...(ioeBankForGrade('grade-4')?.mcq ?? []));
  const makeWordBank: GrammarBankItem[] = bank.makeWord
    .map((item) => ({
      prompt: `Ghép các mảnh sau thành từ đúng: ${item.chunks.join(' - ')}`,
      options: [item.word, ...makeWordDistractors(item.word, bank.makeWord)] as [string, string, string, string],
      answer: 0 as const,
      explanationVi: `Các mảnh ghép lại được từ "${item.word}".`,
    }))
    .filter((i) => i.options.length === 4);
  const makeWordItems = toMcqQuestions(makeWordBank, gradeId, 'makeword', 'mkw');
  return [...toMcqQuestions(mcqs, gradeId, 'ioe', 'ioe-mcq'), ...makeWordItems];
}

export function generateIoeRealMaskedQuestions(gradeId: string): MissingLetterQuestion[] {
  const bank = ioeRealBankForGrade(gradeId);
  if (!bank) return [];
  const items = gradeId === 'grade-5'
    ? [...bank.masked, ...(ioeBankForGrade('grade-4')?.masked ?? [])]
    : bank.masked;
  return items.map((item, i) => {
    const maskedToken = item.displaySentence.match(/[\w'-]*(?:_ )+_?[\w'-]*/)?.[0] ?? item.displaySentence;
    return {
      id: `q-ioe-ml-${i}`,
      topicId: 'ioe',
      kind: 'missing-letter' as const,
      word: item.word,
      wordId: `ioe-${i}`,
      maskedWord: maskedToken,
      missing: item.missing,
      sentence: item.sentence,
      displaySentence: item.displaySentence,
      explanation: `Điền "${item.missing}" để được từ "${item.word}".`,
    };
  });
}

export function generateIoeRealTfQuestions(gradeId: string): TrueFalseQuestion[] {
  const bank = ioeRealBankForGrade(gradeId);
  if (!bank) return [];
  const items = gradeId === 'grade-5'
    ? [...bank.tf, ...(ioeBankForGrade('grade-4')?.tf ?? [])]
    : bank.tf;
  return items.map((item, i) => ({
    id: `q-ioe-tf-${i}`,
    topicId: 'reading',
    kind: 'true-false-reading' as const,
    passage: item.passage,
    statement: item.statement,
    answer: item.answer,
    explanation: 'Đối chiếu câu này với thông tin trong đoạn văn.',
  }));
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
