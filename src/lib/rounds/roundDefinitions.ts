import type { RoundContentDefinition } from './types';
import { buildRound1Questions } from './round1ExtraLetter';
import { buildRound2Questions } from './round2ListeningSentence';

/**
 * The fixed 4-Round Batch registry, in fixed order (plan.md v5 AC17). Round
 * 3 (pronunciation-recording) and Round 4 (describe-and-choose-image) are
 * explicit placeholders in this build - see RoundContentDefinition's doc
 * comment for how a follow-up task lights them up.
 */
export const ROUND_DEFINITIONS: readonly RoundContentDefinition[] = [
  {
    roundNumber: 1,
    roundType: 'extra-letter',
    titleVi: 'Vòng 1: Bắn chữ cái thừa',
    buildQuestions: buildRound1Questions,
  },
  {
    roundNumber: 2,
    roundType: 'listening-sentence-fill-blank',
    titleVi: 'Vòng 2: Nghe và điền từ',
    buildQuestions: buildRound2Questions,
  },
  {
    roundNumber: 3,
    roundType: 'pronunciation-recording',
    titleVi: 'Vòng 3: Ghi âm phát âm',
  },
  {
    roundNumber: 4,
    roundType: 'describe-and-choose-image',
    titleVi: 'Vòng 4: Chọn hình đúng',
  },
];
