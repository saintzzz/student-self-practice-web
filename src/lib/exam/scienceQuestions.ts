import type { ExamQuestion, GrammarMcqQuestion, TextAnswerQuestion, TrueFalseQuestion } from '../../types/exam';
import { seededShuffleIndices } from '../prng';
import { scienceBankForGrade, scienceClassesForGrade } from '../../data/scienceBank';
import { seededPickN } from '../prng';

/**
 * Content audit 2026-10: the old templates hard-coded "a"/"A" which
 * produced "Which one is a animal?" and "A Earth is a planet." for
 * vowel-initial labels, proper nouns, mass nouns and members already
 * carrying an article. These helpers pick a grammatical subject/article.
 */
const MASS_NOUNS = new Set([
  'water', 'milk', 'juice', 'oil', 'rain', 'snow', 'ice', 'air', 'steam',
  'smoke', 'oxygen', 'hydrogen', 'nitrogen', 'carbon dioxide', 'wood',
  'metal', 'glass', 'bread', 'rice', 'paper', 'soap', 'sand', 'soil',
  'fire', 'wind', 'skin',
]);

/** Unique referents that take a definite article: "The sun is ...". */
const THE_NOUNS = new Set(['sun', 'moon', 'sky', 'earth', 'internet', 'equator']);

function articleFor(word: string): 'a' | 'an' {
  // vowel-letter onset is the only relevant case in the class bank;
  // 'a herbivore'/'a human' keep aspirated h, no u-initial members exist.
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Earth", "The Moon", "A comet", "Water", "an elephant" -> grammatical subject. */
function subjectPhrase(member: string): string {
  if (/^(the|a|an)\s/i.test(member) || /^[A-Z]/.test(member)) {
    return capitalizeFirst(member);
  }
  const lower = member.toLowerCase();
  if (MASS_NOUNS.has(lower)) {
    return capitalizeFirst(member);
  }
  if (THE_NOUNS.has(lower)) {
    return `The ${member}`;
  }
  return `${capitalizeFirst(articleFor(member))} ${member}`;
}

function memberIsClassStatement(member: string, label: string): string {
  return `${subjectPhrase(member)} is ${articleFor(label)} ${label}.`;
}

/** Text-answer variants for a science fact answer: drop a leading article,
 * accept digit forms ("4") for number words ("four") and vice versa. */
function factAnswerVariants(answer: string): string[] {
  const variants = new Set<string>([answer, answer.toLowerCase()]);
  const noArticle = answer.replace(/^(the|a|an)\s+/i, '');
  if (noArticle !== answer) {
    variants.add(noArticle);
    variants.add(noArticle.toLowerCase());
  }
  const digits: Record<string, string> = {
    one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
    seven: '7', eight: '8', nine: '9', ten: '10',
  };
  for (const v of [...variants]) {
    for (const [word, digit] of Object.entries(digits)) {
      variants.add(v.replace(new RegExp(`\\b${word}\\b`, 'g'), digit));
      variants.add(v.replace(new RegExp(`\\b${digit}\\b`, 'g'), word));
    }
  }
  return [...variants];
}

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

    // Fill-in variant: "How many legs does a cat have?" -> "four".
    // Answers longer than 3 words ("a round bright moon") are
    // near-untypeable for a child - MCQ/TF variants still cover them.
    if (fact.answer.split(/\s+/).length <= 3) {
      questions.push({
        id: id(),
        topicId: T,
        kind: 'text-answer',
        sentence: `${fact.question} - ${fact.answer}.`,
        displaySentence: `${fact.question} - ___.`,
        accept: factAnswerVariants(fact.answer),
        explanation: fact.explanationVi,
      } satisfies TextAnswerQuestion);
    }
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
        prompt: `Which one is ${articleFor(cls.label)} ${cls.label}?`,
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
        prompt: `Which is NOT ${articleFor(cls.label)} ${cls.label}?`,
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
        statement: memberIsClassStatement(member, cls.label),
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
        statement: memberIsClassStatement(nonMember, cls.label),
        answer: false,
        explanation: `${nonMember} không phải ${cls.labelVi}.`,
      } satisfies TrueFalseQuestion);
    }
    // Fill-in: "A whale is a ___." -> "mammal". Restricted to single-word
    // labels - a child cannot type "job that helps people" verbatim
    // (content audit 2026-10).
    if (/^\S+$/.test(cls.label)) {
      for (const member of cls.members.slice(0, 3)) {
        const statement = memberIsClassStatement(member, cls.label);
        questions.push({
          id: id(),
          topicId: T,
          kind: 'text-answer',
          sentence: statement,
          displaySentence: statement.replace(` ${cls.label}.`, ' ___.'),
          accept: [cls.label],
          explanation: `${member} là ${cls.labelVi}.`,
        } satisfies TextAnswerQuestion);
      }
    }
  }

  return questions;
}
