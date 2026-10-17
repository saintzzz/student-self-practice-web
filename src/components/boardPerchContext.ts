import { createContext, useContext } from 'react';

/**
 * CR-82 (spec s9.3): true while the board-perch mascot is mounted over
 * the board rim (unanswered questions only). `QuestionBanner` reads it to
 * draw the speech tail and reserve left padding so instruction text never
 * sits under the mascot - a React context keeps that signal out of all 13
 * question-body prop interfaces.
 */
export const BoardPerchContext = createContext(false);

export function useBoardPerch(): boolean {
  return useContext(BoardPerchContext);
}
