import { useEffect, useRef } from 'react';
import { currentAudioGeneration, speakInstruction } from '../lib/speech';

/**
 * kids-UX step 5 -> CR-72 revision: the persistent instruction speaker is
 * now HEADLESS - no speaker button anywhere. The instruction autoplays
 * once per `autoplayKey` for the whole session on EVERY grade (the old
 * G1-2-only gate is gone), 400ms after mount so it lands after the
 * screen-enter transition.
 *
 * Removal of the tap-replay button is deliberate (user decision
 * 2026-10): the icon read as clutter, and a once-per-screen voice line
 * plus on-screen text covers replay need.
 *
 * Safety invariants preserved:
 * - A key reserved while a timer is pending can never double-speak
 *   (StrictMode double-mount releases its reservation on cleanup).
 * - A recording session starting between schedule and fire retires the
 *   autoplay permanently (speech.ts audio-generation) so the instruction
 *   never bleeds into the mic or fires uninvited after the mic closed.
 * - speakInstruction itself still defers to in-flight content audio.
 */

/** Session-scoped "already autoplaved" keys - a key must never speak twice. */
const playedKeys = new Set<string>();

/**
 * CR-82 (D-15): board-level settle listeners. One speaker mounts per
 * question, so a module channel delivers the same signal the optional
 * `onSettled` prop gives direct callers - without growing all 13
 * question-body prop interfaces (the board owns the thinking clock).
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

/** Last instruction that an autoplay attempt actually dispatched -
 *  `useThinkingPose` replays it when the thinking pose fires (spec s9.2). */
let lastInstruction: { text: string; lang?: 'vi-VN' | 'en-US' } | null = null;

/** Deliberate (autoplay:false) replay of the most recent instruction. */
export function replayLastInstruction(): void {
  if (!lastInstruction) return;
  speakInstruction(lastInstruction.text, { lang: lastInstruction.lang, autoplay: false });
}

/** Test-only reset so each spec starts with a clean autoplay ledger. */
export function __resetInstructionAutoplay(): void {
  playedKeys.clear();
  lastInstruction = null;
  lastSettle = null;
}

/** Delay after mount before the autoplay attempt (design s3.2). */
const AUTOPLAY_DELAY_MS = 400;

export interface InstructionSpeakerProps {
  /** Vietnamese (or English) instruction text to speak. */
  text: string;
  lang?: 'vi-VN' | 'en-US';
  /** Screen/question identity - autoplay fires at most once per key.
      No key means silence (callers must pass their round/screen key). */
  autoplayKey?: string;
  /**
   * CR-82 (D-15): one-shot settlement signal - 'ended' when instruction
   * playback finishes, 'not-played' when the mount skips autoplay (no
   * key / key already used this session) or the attempt fails. Fires at
   * most once per mount; QuestionBanner feeds it to the thinking-pose
   * idle clock.
   */
  onSettled?: (outcome: 'ended' | 'not-played') => void;
}

export function InstructionSpeaker({ text, lang, autoplayKey, onSettled }: InstructionSpeakerProps) {
  /* speakInstruction returns a cancel handle - a queued utterance or its
     pending timers must never fire after unmount. */
  const cancelRef = useRef<(() => void) | null>(null);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const settledRef = useRef(false);
  const settle = (outcome: 'ended' | 'not-played') => {
    if (settledRef.current) return;
    settledRef.current = true;
    lastSettle = { outcome, epoch: Date.now() };
    onSettledRef.current?.(outcome);
    for (const listener of settleListeners) listener(outcome);
  };

  /* Autoplay once per `autoplayKey`. The key is reserved when the timer is
     SCHEDULED (not when it fires) so two simultaneous mounts of the same
     key cannot double-speak. If playback is refused ('blocked', 'error',
     'unavailable') the key is released so the next screen visit retries -
     and a one-shot pointerdown listener is armed because a browser that
     blocked autoplay will allow speech once the user has gestured. This
     restores a retry path after the replay button was removed (r19-03). */
  useEffect(() => {
    /* The mounted speaker owns "current instruction" for thinking-mode
       replay - independent of autoplay eligibility. speakerKey is
       ROUND-level (BatchScreen), so a later question's key is usually
       already played; without this, `lastInstruction` stays one
       question stale and thinking-mode replay speaks the wrong
       instruction (external review r34-A6). */
    lastInstruction = { text, lang };
    /* D-15: a mount that will never speak still settles - the thinking
       idle clock is allowed to start when nothing plays. */
    if (!autoplayKey || playedKeys.has(autoplayKey)) {
      settle('not-played');
      return;
    }
    playedKeys.add(autoplayKey);
    let fired = false;
    let disposed = false;
    const gen = currentAudioGeneration();

    const attempt = () => {
      lastInstruction = { text, lang };
      cancelRef.current = speakInstruction(text, {
        lang,
        autoplay: true,
        onStatus: (status) => {
          if (status === 'playing') return;
          if (status === 'ended') {
            settle('ended');
            return;
          }
          playedKeys.delete(autoplayKey);
          settle('not-played');
          // Any failure arms a gesture retry - pointerdown AND keydown AND
          // click: assistive tech activates controls via synthesized click
          // events which fire neither pointerdown nor keydown (r21-01).
          // 'unavailable' also retries: TTS can appear after a reload or
          // an extension init, and a no-op retry is harmless.
          if (!disposed) {
            window.addEventListener('pointerdown', retry, { once: true, capture: true });
            window.addEventListener('keydown', retry, { once: true, capture: true });
            window.addEventListener('click', retry, { once: true, capture: true });
          }
        },
      });
    };

    const retry = () => {
      if (disposed || playedKeys.has(autoplayKey)) return;
      playedKeys.add(autoplayKey);
      attempt();
    };

    const timer = window.setTimeout(() => {
      fired = true;
      if (currentAudioGeneration() !== gen) return;
      attempt();
    }, AUTOPLAY_DELAY_MS);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', retry, { capture: true });
      window.removeEventListener('keydown', retry, { capture: true });
      window.removeEventListener('click', retry, { capture: true });
      if (!fired) playedKeys.delete(autoplayKey);
      if (!fired) return;
      cancelRef.current?.();
      cancelRef.current = null;
    };
  }, [text, lang, autoplayKey]);

  return null;
}
