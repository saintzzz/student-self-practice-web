import { buildExamPool } from '../src/lib/exam/examSession';
const grades = ['grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'];
for (const p of ['english', 'math', 'science'] as const) {
  for (const g of grades) {
    console.log(p.padEnd(8), g, buildExamPool(p, g, 'x').length);
  }
}
