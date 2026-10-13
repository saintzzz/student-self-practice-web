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

/** Test-only reset so each spec starts with a clean autoplay ledger. */
export function __resetInstructionAutoplay(): void {
  playedKeys.clear();
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
}

export function InstructionSpeaker({ text, lang, autoplayKey }: InstructionSpeakerProps) {
  /* speakInstruction returns a cancel handle - a queued utterance or its
     pending timers must never fire after unmount. */
  const cancelRef = useRef<(() => void) | null>(null);

  /* Autoplay once per `autoplayKey`. The key is reserved when the timer is
     SCHEDULED (not when it fires) so two simultaneous mounts of the same
     key cannot double-speak. */
  useEffect(() => {
    if (!autoplayKey || playedKeys.has(autoplayKey)) return;
    playedKeys.add(autoplayKey);
    let fired = false;
    const gen = currentAudioGeneration();
    const timer = window.setTimeout(() => {
      fired = true;
      if (currentAudioGeneration() !== gen) return;
      cancelRef.current = speakInstruction(text, { lang, autoplay: true });
    }, AUTOPLAY_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (!fired) playedKeys.delete(autoplayKey);
      if (!fired) return;
      cancelRef.current?.();
      cancelRef.current = null;
    };
  }, [text, lang, autoplayKey]);

  return null;
}
