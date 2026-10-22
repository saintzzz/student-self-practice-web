import type { Grade } from '../types';

/**
 * CR-07: full primary coverage - all five elementary grades.
 *
 * Lives outside data/vocabulary on purpose: screens that only need the
 * grade list (select, hubs, summaries) must not pull the ~290KB word
 * bank into the eager index chunk. The bank loads on demand through
 * lib/content/contentBank (CR-103).
 */
export const GRADES: readonly Grade[] = [
  { id: 'grade-1', name: 'Lớp 1' },
  { id: 'grade-2', name: 'Lớp 2' },
  { id: 'grade-3', name: 'Lớp 3' },
  { id: 'grade-4', name: 'Lớp 4' },
  { id: 'grade-5', name: 'Lớp 5' },
];
