import { createContext, useContext, type ReactNode } from 'react';

/**
 * CR-82 (ARCHITECTURE D-20): one board-level owner allocates every Lottie
 * player on a screen so the constitution #5 / AC-2.9 cap holds - at most 1
 * player before answering, at most 2 after, at most 1 on non-question
 * screens (BatchSummary's post-answer reward moment allows 2). Every
 * suppressed owner keeps its visible static twin (EmojiVisual svg/image
 * mode, MascotStaticPose).
 */

export type LottieOwner = 'prompt' | 'mascot' | 'feedback' | 'reward';

export interface LottieBoardState {
  /** The current answer has been judged (feedback sheet mounted). */
  answered: boolean;
  /** The prompt emoji requested `animated` AND `hasLottie(key)`. */
  promptEligible: boolean;
  /** The feedback picture has a Lottie asset. */
  feedbackEligible: boolean;
  /** The sheet perch (not the inline mascot) is showing. */
  sheetPerch: boolean;
  reducedMotion: boolean;
}

export type LottieSlots = Record<LottieOwner, boolean>;

const ALL_STATIC: LottieSlots = { prompt: false, mascot: false, feedback: false, reward: false };

/** Pure allocation table (D-20) - unit-tested directly. */
export function allocateLottie(s: LottieBoardState): LottieSlots {
  if (s.reducedMotion) return { ...ALL_STATIC };
  if (!s.answered) {
    /* unanswered: prompt owns the slot when eligible, else the perch
       mascot (idle / thinking). */
    return s.promptEligible
      ? { prompt: true, mascot: false, feedback: false, reward: false }
      : { prompt: false, mascot: true, feedback: false, reward: false };
  }
  /* answered: the sheet-perch mascot animates (the short-landscape inline
     mascot is always static, D-09); the feedback picture animates when it
     has an asset; the prompt stays mounted under the sheet but static. */
  return {
    prompt: false,
    mascot: s.sheetPerch,
    feedback: s.feedbackEligible,
    reward: false,
  };
}

/**
 * Screen-level default when no provider wraps the tree: the mascot and the
 * post-answer reward illustration may animate (the two contexts that exist
 * outside QuestionCard), prompt/feedback contexts never do. Pre-round
 * screens wrap their mascot in a stricter provider per D-21.
 */
const DEFAULT_SLOTS: LottieSlots = { prompt: false, mascot: true, feedback: false, reward: true };

/**
 * CR-82 (D-21 / AC-2.5): pre-round screens (GradeSelect, AuthScreen,
 * StartBatch) mount ZERO Lottie players - the mascot renders its static
 * greeting pose so no player chunk, WASM or JSON request fires before the
 * first question.
 */
export const PRE_ROUND_SLOTS: LottieSlots = { ...ALL_STATIC };

const LottieBudgetContext = createContext<LottieSlots>(DEFAULT_SLOTS);

export function LottieBudgetProvider({
  slots,
  children,
}: {
  slots: LottieSlots;
  children: ReactNode;
}) {
  return <LottieBudgetContext.Provider value={slots}>{children}</LottieBudgetContext.Provider>;
}

/** Does this owner's Lottie player get the screen's slot right now? */
export function useLottieSlot(owner: LottieOwner): boolean {
  return useContext(LottieBudgetContext)[owner];
}
