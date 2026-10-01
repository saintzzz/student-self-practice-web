import type { ExamQuestion, GrammarMcqQuestion, TextAnswerQuestion, TrueFalseQuestion } from '../../types/exam';
import { seededShuffleIndices } from '../prng';
import { scienceBankForGrade, scienceClassesForGrade } from '../../data/scienceBank';
import { seededPickN } from '../prng';

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

  // CR-25 - classification questions from authored class lists:
  // "Which one is a mammal?" + "Which is NOT a mammal?".
  for (const cls of scienceClassesForGrade(gradeId)) {
    for (const member of cls.members) {
      const wrongs = seededPickN(cls.nonMembers, 3, `cls-${cls.label}-${member}`);
      if (wrongs.length < 3) continue;
      const texts = [member, ...wrongs] as [string, string, string, string];
      const order = seededShuffleIndices(4, `cls-o-${cls.label}-${member}`);
      const options = order.map((i) => texts[i]!) as [string, string, string, string];
      questions.push({
        id: id(),
        topicId: T,
        kind: 'grammar-mcq',
        prompt: `Which one is a ${cls.label}?`,
        options,
        correctIndex: order.indexOf(0) as 0 | 1 | 2 | 3,
        explanation: `${member} là ${cls.labelVi}.`,
      } satisfies GrammarMcqQuestion);
    }
    for (const nonMember of cls.nonMembers) {
      const members3 = seededPickN(cls.members, 3, `not-${cls.label}-${nonMember}`);
      if (members3.length < 3) continue;
      const texts = [nonMember, ...members3] as [string, string, string, string];
      const order = seededShuffleIndices(4, `not-o-${cls.label}-${nonMember}`);
      const options = order.map((i) => texts[i]!) as [string, string, string, string];
      questions.push({
        id: id(),
        topicId: T,
        kind: 'grammar-mcq',
        prompt: `Which is NOT a ${cls.label}?`,
        options,
        correctIndex: order.indexOf(0) as 0 | 1 | 2 | 3,
        explanation: `${nonMember} không phải ${cls.labelVi}.`,
      } satisfies GrammarMcqQuestion);
    }
    // True/False per member + nonMember: "A whale is a mammal."
    for (const member of cls.members) {
      questions.push({
        id: id(),
        topicId: T,
        kind: 'true-false-reading',
        passage: 'Decide if this is true.',
        statement: `A ${member} is a ${cls.label}.`,
        answer: true,
        explanation: `${member} là ${cls.labelVi}.`,
      } satisfies TrueFalseQuestion);
    }
    for (const nonMember of cls.nonMembers) {
      questions.push({
        id: id(),
        topicId: T,
        kind: 'true-false-reading',
        passage: 'Decide if this is true.',
        statement: `A ${nonMember} is a ${cls.label}.`,
        answer: false,
        explanation: `${nonMember} không phải ${cls.labelVi}.`,
      } satisfies TrueFalseQuestion);
    }
    // Fill-in: "A whale is a ___." -> "mammal"
    for (const member of cls.members.slice(0, 3)) {
      questions.push({
        id: id(),
        topicId: T,
        kind: 'text-answer',
        sentence: `A ${member} is a ${cls.label}.`,
        displaySentence: `A ${member} is a ___.`,
        accept: [cls.label],
        explanation: `${member} là ${cls.labelVi}.`,
      } satisfies TextAnswerQuestion);
    }
  }

  return questions;
}
