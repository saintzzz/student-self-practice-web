import type { RoundContentDefinition } from './types';
import type { GameId } from '../../games/types';
import { GAME_DEFS } from '../../games/defs';
import { hashString } from '../prng';
import { buildRound1Questions } from './round1ExtraLetter';
import { buildRound2Questions } from './round2ListeningSentence';
import { buildRound3Questions } from './round3Pronunciation';
import { buildRound4Questions } from './round4DescribeAndChooseImage';

/**
 * The fixed 4-Round Batch registry, in fixed order (plan.md v5 AC17, v6
 * AC24/AC25). All 4 Rounds have real content generators wired up.
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
    buildQuestions: buildRound3Questions,
  },
  {
    roundNumber: 4,
    roundType: 'describe-and-choose-image',
    titleVi: 'Vòng 4: Chọn hình đúng',
    buildQuestions: buildRound4Questions,
  },
];

/**
 * CR-86: a Batch is 4 question Rounds + one bonus game Round (definition
 * 5). The game pick is seeded at Batch creation - deterministic, so the
 * same `batch:<seed>` always replays the same game and reward grants
 * (`round:<seed>:4`, `game:<id>:L1:batch:<seed>:r4`) stay idempotent.
 * Pool = short, self-contained games readable at every grade that can
 * still DIFFERENTIATE a run (first-try picks can miss). Excluded:
 * memory-match - every run ends perfect (pairs always eventually match,
 * so correctCount is always max - exploration, not assessment);
 * tic-tac-toe - variable length; maze-chase/word-worm/castle-guard/
 * gold-quest - long strategy loops; quiz-show - grade-gated G3+;
 * racing-cars/letter-catch - heavy pacing for a bonus slot.
 */
export const TOTAL_ROUNDS = ROUND_DEFINITIONS.length + 1;

const GAME_ROUND_POOL: readonly GameId[] = [
  'balloon-pop',
  'fishing-catch',
  'feed-the-pig',
  'picture-reveal',
  'whack-a-mole',
];

export function gameRoundDefinition(seed: string, gradeId: string): RoundContentDefinition {
  const eligible = GAME_ROUND_POOL.filter((id) => {
    const def = GAME_DEFS.find((d) => d.id === id);
    return !def?.grades || def.grades.includes(gradeId);
  });
  const gameId = eligible[hashString(`${seed}:game-round`) % eligible.length] ?? 'balloon-pop';
  const title = GAME_DEFS.find((d) => d.id === gameId)?.title ?? 'Trò chơi';
  return {
    roundNumber: TOTAL_ROUNDS,
    roundType: 'game-round',
    titleVi: `Vòng ${TOTAL_ROUNDS}: ${title}`,
    game: { gameId, level: 1 },
  };
}

/** Definition for `roundIndex` (0-based): indices 0-3 come from the fixed
 *  registry, index 4 is the seeded bonus game Round (CR-86). */
export function roundDefinitionAt(
  roundIndex: number,
  seed: string,
  gradeId: string,
): RoundContentDefinition | null {
  if (roundIndex >= 0 && roundIndex < ROUND_DEFINITIONS.length) {
    return ROUND_DEFINITIONS[roundIndex];
  }
  if (roundIndex === ROUND_DEFINITIONS.length) {
    return gameRoundDefinition(seed, gradeId);
  }
  return null;
}
