/** Entry point bundled by scripts/export-question-bank.mjs. */
import { IOE_BANK } from '../src/data/ioeRealBank';
import { ioeBanksForGrade } from '../src/data/ioeBanks';
import { GRAMMAR_G12, GRAMMAR_G3, GRAMMAR_G45 } from '../src/data/grammarBank';
import { readingBankForGrade } from '../src/data/readingBank';
import { reorderBankForGrade } from '../src/data/reorderBank';
import { VIO_MATH_BANK } from '../src/data/vioMathBank';
import { scienceBankForGrade, scienceClassesForGrade } from '../src/data/scienceBank';
import { getTopicsByGrade, getWordsByGrade } from '../src/data/vocabulary/index';
import { generateMathQuestions } from '../src/lib/exam/mathEnglish';
import { generateScienceQuestions } from '../src/lib/exam/scienceQuestions';

const GRADE_IDS = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];

export function exportAll() {
  const grades: Record<string, unknown> = {};
  for (const g of GRADE_IDS) {
    grades[g] = {
      ioe: IOE_BANK[g],
      ioeBanks: ioeBanksForGrade(g),
      grammar: g === 'grade-1' || g === 'grade-2' ? GRAMMAR_G12 : g === 'grade-3' ? GRAMMAR_G3 : GRAMMAR_G45,
      reading: readingBankForGrade(g),
      reorderAuthored: reorderBankForGrade(g).filter((s) => !(IOE_BANK[g]?.reorder ?? []).includes(s)),
      vocabulary: {
        topics: getTopicsByGrade(g).map((t) => ({ id: t.id, name: t.name })),
        words: getWordsByGrade(g),
      },
      // Full materialized pool (seeded, deterministic): real harvested
      // items (id prefix `vio-`) + generated families.
      mathPool: generateMathQuestions(g),
      mathRealBankOnly: g === 'grade-2' ? VIO_MATH_BANK : [],
      sciencePool: generateScienceQuestions(g),
      scienceFacts: scienceBankForGrade(g),
      scienceClasses: scienceClassesForGrade(g),
    };
  }
  return grades;
}
