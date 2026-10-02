/**
 * CR-26 - authored reorder sentences for upper grades. Template-based
 * word-order questions average ~4 words even at grade 4-5; real IOE
 * items use 7-10 word sentences ("It is a picture of our sports day").
 * These take the authored slot in the word-order quota for grade 3+.
 */
import { ioeBankForGrade } from './ioeRealBank';

export const REORDER_G3: readonly string[] = [
  'I usually get up at six o\'clock.',
  'She is reading a book in the library.',
  'We have English and maths on Mondays.',
  'My father drives me to school every day.',
  'There is a big garden behind my house.',
  'What do you do at break time?',
  'How many students are there in your class?',
  'My mother cooks dinner in the evening.',
  'I like swimming in the pool in summer.',
  'They are playing football in the yard now.',
  'Our classroom is on the second floor.',
  'I brush my teeth twice a day.',
];

export const REORDER_G45: readonly string[] = [
  'It is a picture of our sports day.',
  'He can\'t ride a horse.',
  'What do you do on Mondays?',
  'We are going to visit our grandparents this weekend.',
  'She watched a film about animals last night.',
  'My birthday party starts at seven o\'clock.',
  'Would you like some orange juice?',
  'There are thirty-five students in my class.',
  'I was born in a small village in 2015.',
  'Tom is taller than his younger brother.',
  'We should raise our hands before speaking.',
  'My uncle works in a big hospital in the city.',
  'They had a picnic by the lake last Sunday.',
  'Which subject do you like the most?',
  'Our teacher is telling an interesting story.',
  'I am going to be a doctor in the future.',
  'The children are flying kites in the park.',
  'Lan usually helps her mother cook dinner.',
  'We will have a music festival next month.',
  'My family goes to the beach every summer.',
];

export function reorderBankForGrade(gradeId: string): readonly string[] {
  const ioe = ioeBankForGrade(gradeId)?.reorder ?? [];
  if (gradeId === 'grade-3') return [...REORDER_G3, ...ioe];
  // Grade 5 shares the G4 harvest - same difficulty band.
  if (gradeId === 'grade-4') return [...REORDER_G45, ...ioe];
  if (gradeId === 'grade-5') return [...REORDER_G45, ...ioe, ...(ioeBankForGrade('grade-4')?.reorder ?? [])];
  return ioe;
}
