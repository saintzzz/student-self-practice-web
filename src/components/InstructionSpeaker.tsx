import { useEffect, useRef } from 'react';

/**
 * CR-83 (field feedback 2026-10): instruction voice is DISABLED
 * product-wide - the once-per-key autoplay is gone because the spoken
 * instruction collided with the listening play buttons (kids could not
 * tell which speaker did what) and, worse, bled into the pronunciation
 * mic so the recognizer transcribed the app's own voice instead of the
 * child's. The component stays mounted everywhere it was: it still
 * settles 'not-played' immediately so the board's thinking-pose idle
 * clock arms at mount (the D-15 contract), and `replayLastInstruction`
 * is kept as a silent no-op for API compatibility.
 */

export type InstructionSettleOutcome = 'ended' | 'not-played';
const settleListeners = new Set<(outcome: InstructionSettleOutcome) => void>();

/* Buffered copy of the most recent settle. Passive effects run
   children-first, so a synchronous 'not-played' settle inside the
   speaker's mount effect can fire BEFORE the board's subscription
   effect runs - the listener would miss it and the thinking idle clock
   would never arm (external review r34-A5). Subscribers replay the
   buffer when its epoch falls inside their own mount. */
let lastSettle: { outcome: InstructionSettleOutcome; epoch: number } | null = null;

export function subscribeInstructionSettled(
  listener: (outcome: InstructionSettleOutcome) => void,
): () => void {
  settleListeners.add(listener);
  return () => settleListeners.delete(listener);
}

/** The most recent settle outcome + when it happened (module clock). */
export function lastInstructionSettle(): { outcome: InstructionSettleOutcome; epoch: number } | null {
  return lastSettle;
}

/**
 * CR-83: no instruction voice anywhere - replaying is a no-op. The
 * thinking pose still fires and re-arms the visual demo hint via the
 * caller, just without speech.
 */
export function replayLastInstruction(): void {
  // Intentionally silent - see module doc.
}

/** Test-only reset so each spec starts with a clean settle ledger. */
export function __resetInstructionAutoplay(): void {
  lastSettle = null;
}

export interface InstructionSpeakerProps {
  /** Vietnamese (or English) instruction text - retained for API compat. */
  text: string;
  lang?: 'vi-VN' | 'en-US';
  /** Screen/question identity - retained for API compat, no longer used. */
  autoplayKey?: string;
  /**
   * One-shot settlement signal - always 'not-played' now that voice is
   * disabled. QuestionBanner feeds it to the thinking-pose idle clock.
   */
  onSettled?: (outcome: 'ended' | 'not-played') => void;
}

export function InstructionSpeaker({ onSettled }: InstructionSpeakerProps) {
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const settledRef = useRef(false);

  /* No autoplay: settle 'not-played' at mount so the idle clock arms.
     Once per mount, same as the old "key already played" path. */
  useEffect(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    lastSettle = { outcome: 'not-played', epoch: Date.now() };
    onSettledRef.current?.('not-played');
    for (const listener of settleListeners) listener('not-played');
  }, []);

  return null;
}
