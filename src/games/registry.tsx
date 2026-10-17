import type { ComponentType } from 'react';
import type {
  EmojiChoiceFieldProps,
  LetterOrderFieldProps,
  PairBoardFieldProps,
  WordChoiceFieldProps,
} from './mechanics';
import type { GameComponent, GameId, GameMechanic } from './types';
import MemoryMatch from './games/MemoryMatch';
import BalloonPop from './games/BalloonPop';
import RacingCars from './games/RacingCars';
import FishingCatch from './games/FishingCatch';
import LetterCatch from './games/LetterCatch';
import TicTacToe from './games/TicTacToe';
import {
  EmojiChoiceField,
  LetterOrderField,
  PairBoardField,
  WordChoiceField,
} from './mechanics';

/**
 * CR-83 registry - two maps, two audiences:
 *
 *  GAME_COMPONENTS: GameScreen resolves GameId -> the mounted arcade
 *  shell (only imported inside the lazy game chunk).
 *
 *  GAME_MECHANICS: the REUSE contract - each bare interactive field maps
 *  to the question kinds it can host, so a future Round type or exam
 *  surface can embed the same step instead of a second implementation.
 *  (e.g. LetterOrderField can render a spelling question inside a Round;
 *  EmojiChoiceField already backs two games + fits image-choice kinds.)
 */
export const GAME_COMPONENTS: Record<GameId, GameComponent> = {
  'memory-match': MemoryMatch,
  'balloon-pop': BalloonPop,
  'racing-cars': RacingCars,
  'fishing-catch': FishingCatch,
  'letter-catch': LetterCatch,
  'tic-tac-toe': TicTacToe,
};

export const GAME_MECHANICS = {
  'emoji-choice': {
    id: 'emoji-choice',
    kinds: ['listening-image-choice', 'describe-and-choose-image'],
    Step: EmojiChoiceField as ComponentType<EmojiChoiceFieldProps>,
  },
  'word-choice': {
    id: 'word-choice',
    kinds: [
      'image-choice',
      'phonics-sound-choice',
      'phonics-word-choice',
      'phonics-final-choice',
      'phonics-blend-choice',
      'phonics-rhyme-choice',
    ],
    Step: WordChoiceField as ComponentType<WordChoiceFieldProps>,
  },
  'letter-order': {
    id: 'letter-order',
    kinds: ['listening-fill-blank', 'listening-sentence-fill-blank'],
    Step: LetterOrderField as ComponentType<LetterOrderFieldProps>,
  },
  'pair-board': {
    id: 'pair-board',
    kinds: ['picture-pair-matching'],
    Step: PairBoardField as ComponentType<PairBoardFieldProps>,
  },
} as const satisfies Record<string, GameMechanic & { Step: ComponentType<any> }>;
