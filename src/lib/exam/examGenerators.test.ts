import { describe, expect, it } from 'vitest';
import { generateAuthoredWordOrderQuestions, generateWordOrderQuestions, isWordOrderCorrect, tokenizeSentence } from './wordOrder';
import { generateOddPronunciationQuestions } from './oddPronunciation';
import { generateMissingLetterQuestions } from './missingLetter';
import { generateGrammarMcqQuestions, generateIoeMcqQuestions, generateIoeRealListenQuestions, generateIoeRealMaskedQuestions, generateIoeRealMcqQuestions, generateIoeRealTfQuestions, generateTrueFalseQuestions } from './englishGenerators';
import { generateMathQuestions } from './mathEnglish';
import { generateScienceQuestions } from './scienceQuestions';
import { getWordsByGrade } from '../../data/vocabulary';
import { ioeBanksForGrade } from '../../data/ioeBanks';
import { reorderBankForGrade } from '../../data/reorderBank';
import { buildExamPool } from './examSession';

const WORDS = getWordsByGrade('grade-4');
const GRADES = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];

describe('word-order', () => {
  const questions = generateWordOrderQuestions(WORDS);

  it('generates questions with shuffled tiles that are not already in order', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.tiles.join(' ')).not.toBe(q.sentence);
      expect([...q.tiles].sort()).toEqual([...tokenizeSentence(q.sentence)].sort());
    }
  });

  it('isWordOrderCorrect accepts the correct ordering and rejects swaps', () => {
    const q = questions[0]!;
    // Rebuild the correct order by matching tiles back to the sentence.
    const correct = tokenizeSentence(q.sentence);
    expect(isWordOrderCorrect(q.sentence, correct)).toBe(true);
    const swapped = [...correct];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    // Only assert when the swap actually changes the sequence.
    if (swapped.join(' ') !== correct.join(' ')) {
      expect(isWordOrderCorrect(q.sentence, swapped)).toBe(false);
    }
  });
});

describe('odd-pronunciation', () => {
  const questions = generateOddPronunciationQuestions(WORDS);

  it('produces 4 distinct options with exactly one correctIndex', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe('missing-letter', () => {
  const questions = generateMissingLetterQuestions(WORDS);

  it('masks a contiguous run and keeps the full word as answer', () => {
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.word.length).toBeGreaterThanOrEqual(4);
      expect(q.missing.length).toBeGreaterThan(0);
      expect(q.word.includes(q.missing)).toBe(true);
      // CR-25: one blank per missing letter - "n_ _se" shows 2 blanks.
      const blanks = (q.maskedWord.match(/_/g) ?? []).length;
      expect(blanks).toBe(q.missing.length);
      expect(q.displaySentence).toContain(q.maskedWord);
    }
  });
});

describe('grammar + reading banks', () => {
  it('grammar-mcq items carry 4 options and a valid correctIndex', () => {
    const qs = generateGrammarMcqQuestions('grade-4');
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.options.length).toBe(4);
      expect(q.prompt).toContain('___');
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it('true-false items carry a passage, a statement and an explanation', () => {
    const qs = generateTrueFalseQuestions('grade-4');
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.passage.length).toBeGreaterThan(20);
      expect(typeof q.answer).toBe('boolean');
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe('math program', () => {
  it('generates a large deterministic pool in English wording', () => {
    const a = generateMathQuestions('grade-4', 'seed');
    const b = generateMathQuestions('grade-4', 'seed');
    expect(a.length).toBeGreaterThan(50);
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    for (const q of a) {
      if (q.kind === 'text-answer') {
        expect(q.displaySentence).toContain('___');
        expect(q.accept.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('CR-26 ioe banks', () => {
  it('every authored MCQ item has 4 distinct options and a valid answer index', () => {
    for (const gradeId of GRADES) {
      const banks = ioeBanksForGrade(gradeId);
      const all = [...banks.spelling, ...banks.pronunciation, ...banks.error, ...banks.correct, ...banks.facts];
      for (const item of all) {
        expect(item.options.length).toBe(4);
        expect(new Set(item.options).size).toBe(4);
        expect(item.answer).toBeGreaterThanOrEqual(0);
        expect(item.answer).toBeLessThan(4);
        expect(item.explanationVi.length).toBeGreaterThan(0);
      }
    }
  });

  it('spelling masks have exactly as many blanks as the missing chunk', () => {
    for (const gradeId of GRADES) {
      for (const item of ioeBanksForGrade(gradeId).spelling) {
        const blanks = item.prompt.split(' ').filter((t) => t.includes('_')).length;
        expect(blanks).toBe(item.options[item.answer]!.length);
      }
    }
  });

  it('higher bands unlock more IOE types (pronunciation, error correction, facts)', () => {
    const g12 = ioeBanksForGrade('grade-1');
    const g45 = ioeBanksForGrade('grade-4');
    expect(g12.pronunciation.length).toBe(0);
    expect(g12.error.length).toBe(0);
    expect(g45.pronunciation.length).toBeGreaterThanOrEqual(10);
    expect(g45.error.length).toBeGreaterThanOrEqual(8);
    expect(g45.facts.length).toBeGreaterThanOrEqual(5);
  });

  it('generateIoeMcqQuestions produces valid shuffled questions', () => {
    const qs = generateIoeMcqQuestions('grade-4');
    expect(qs.length).toBeGreaterThan(30);
    for (const q of qs) {
      expect(q.kind).toBe('grammar-mcq');
      expect(q.options.length).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    }
  });
});

describe('CR-26 grade-calibrated difficulty', () => {
  it('authored reorder sentences are longer and only exist for grade 3+', () => {
    expect(reorderBankForGrade('grade-1').length).toBe(0);
    expect(reorderBankForGrade('grade-2').length).toBe(0);
    const g45 = generateAuthoredWordOrderQuestions('grade-4', reorderBankForGrade('grade-4'));
    expect(g45.length).toBeGreaterThanOrEqual(15);
    for (const q of g45) {
      expect(tokenizeSentence(q.sentence).length).toBeGreaterThanOrEqual(4);
      expect(q.tiles.join(' ')).not.toBe(q.sentence);
    }
  });

  it('grade 4 pool is harder and more varied than grade 1', () => {
    const g1 = buildExamPool('english', 'grade-1', 's');
    const g4 = buildExamPool('english', 'grade-4', 's');
    const share = (pool: typeof g1, kind: string) => pool.filter((q) => q.kind === kind).length;
    // Recognition-heavy image questions drop from G1 to G4...
    expect(share(g4, 'image-choice')).toBeLessThan(share(g1, 'image-choice'));
    // ...while authored MCQ and reading grow.
    expect(share(g4, 'grammar-mcq')).toBeGreaterThan(share(g1, 'grammar-mcq'));
    expect(share(g4, 'true-false-reading')).toBeGreaterThan(share(g1, 'true-false-reading'));
    // Upper-grade reorders average longer than early-grade ones.
    const avgWords = (pool: typeof g1) => {
      const wo = pool.filter((q) => q.kind === 'word-order');
      return wo.reduce((a, q) => a + q.sentence.split(' ').length, 0) / Math.max(1, wo.length);
    };
    expect(avgWords(g4)).toBeGreaterThan(avgWords(g1));
  });

  it('every grade still fills a >=200 question pool for all programs', () => {
    for (const gradeId of GRADES) {
      for (const program of ['english', 'math', 'science'] as const) {
        expect(buildExamPool(program, gradeId, 's').length).toBeGreaterThanOrEqual(200);
      }
    }
  });
});

describe('CR-48 phase 4 - harvested IOE bank is reference-only', () => {
  // The harvested generators stay in the codebase so the content can be
  // re-enabled after rights clearance, but until then ioeBankForGrade
  // returns nothing and every consumer must tolerate an empty bank.
  it('real-IOE generators yield nothing while the bank is retired', () => {
    for (const gradeId of GRADES) {
      expect(generateIoeRealListenQuestions(gradeId), gradeId).toEqual([]);
      expect(generateIoeRealMcqQuestions(gradeId), gradeId).toEqual([]);
      expect(generateIoeRealMaskedQuestions(gradeId), gradeId).toEqual([]);
      expect(generateIoeRealTfQuestions(gradeId), gradeId).toEqual([]);
    }
  });

  it('reorder bank serves authored sentences only', () => {
    for (const gradeId of GRADES) {
      for (const sentence of reorderBankForGrade(gradeId)) {
        expect(sentence.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('science program', () => {
  it('expands authored facts into mcq + true-false + fill-in questions', () => {
    const qs = generateScienceQuestions('grade-4');
    expect(qs.length).toBeGreaterThan(20);
    const kinds = new Set(qs.map((q) => q.kind));
    expect(kinds.has('grammar-mcq')).toBe(true);
    expect(kinds.has('true-false-reading')).toBe(true);
    for (const q of qs) {
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe('CR-48 phase 4 - harvested content retired', () => {
  // Rights-uncleared third-party banks (ioeRealBank, vioMathBank) are
  // reference-only. This invariant fails if anything reintroduces
  // harvested ids (ioe-*, vio-*) into any bundled pool.
  const HARVESTED = /^(?:vio-|q-ioe-|ioe-)/;

  it('exam pools contain no harvested question ids', () => {
    for (const gradeId of ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5']) {
      for (const programId of ['english', 'math', 'science'] as const) {
        const pool = buildExamPool(programId, gradeId, 's');
        const leaked = pool.filter((q) => HARVESTED.test(String(q.id)));
        expect(leaked, `${programId}/${gradeId}: ${leaked.map((q) => q.id).slice(0, 3).join(',')}`).toEqual([]);
      }
    }
  });

  it('grade-2 math pool no longer serves harvested Violympic items', () => {
    const qs = generateMathQuestions('grade-2', 's');
    expect(qs.length).toBeGreaterThan(50);
    expect(qs.filter((q) => String(q.id).startsWith('vio-'))).toEqual([]);
  });
});
