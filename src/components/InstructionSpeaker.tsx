import { useCallback, useEffect, useRef, useState } from 'react';
import { currentAudioGeneration, speakInstruction, type InstructionStatus } from '../lib/speech';
import { SPEAKER_BTN, SPEAKER_BTN_BLOCKED, SPEAKER_BTN_PLAYING } from '../lib/ui/tokens';
import { EmojiVisual } from './EmojiVisual';

/**
 * kids-UX step 5 (design-kids-ux s3.2, ADR KUX-1/KUX-2): the persistent
 * round speaker attached to every kid-surface instruction. Indigo means
 * "Bé Heo is talking" - never gold, never emerald.
 *
 * - Tap ALWAYS replays (user-initiated, simplest mental model).
 * - Autoplay (G1-2) fires once per `autoplayKey` for the whole session,
 *   400ms after mount so it lands after the screen-enter transition.
 * - 'blocked' flips the disc to its bouncing "tap me" cue; 'unavailable'
 *   renders nothing so a voiceless device never shows a broken button.
 */

/** Session-scoped "already autoplaved" keys - a key must never speak twice. */
const playedKeys = new Set<string>();

/** Test-only reset so each spec starts with a clean autoplay ledger. */
export function __resetInstructionAutoplay(): void {
  playedKeys.clear();
}

/** Delay after mount before the G1-2 autoplay attempt (design s3.2). */
const AUTOPLAY_DELAY_MS = 400;

const TAP_HINT = 'Bé chạm để nghe nhé';

type SpeakerStatus = 'idle' | 'playing' | 'blocked' | 'error' | 'unavailable';

export interface InstructionSpeakerProps {
  /** Vietnamese (or English) instruction text to speak. */
  text: string;
  lang?: 'vi-VN' | 'en-US';
  /** G1-2 only: speak once on mount. Requires `autoplayKey`. */
  autoplay?: boolean;
  /** Screen/question identity - autoplay fires at most once per key. */
  autoplayKey?: string;
  /** Mic-open moments (pronunciation recording) dim the button - speech
   *  is suppressed anyway, so a tappable-but-silent control would be a
   *  dead control; a disabled, dimmed one is honest. */
  disabled?: boolean;
  className?: string;
}

export function InstructionSpeaker({
  text,
  lang,
  autoplay = false,
  autoplayKey,
  disabled = false,
  className,
}: InstructionSpeakerProps) {
  const [status, setStatus] = useState<SpeakerStatus>('idle');
  /* speakInstruction returns a cancel handle - a queued utterance or its
     pending timers must never fire setStatus after unmount, and a new tap
     cancels the in-flight replay first. */
  const cancelRef = useRef<(() => void) | null>(null);
  const cancelSpeak = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  const onStatus = useCallback((s: InstructionStatus) => {
    setStatus(
      s === 'playing'
        ? 'playing'
        : s === 'ended'
          ? 'idle'
          : s === 'blocked'
            ? 'blocked'
            : s === 'unavailable'
              ? 'unavailable'
              : 'error',
    );
  }, []);

  const speak = useCallback((auto = false) => {
    cancelSpeak();
    cancelRef.current = speakInstruction(text, { lang, onStatus, autoplay: auto });
  }, [text, lang, onStatus, cancelSpeak]);

  /* Unmount / text change / key change: kill the owned utterance. */
  useEffect(() => cancelSpeak, [cancelSpeak, text, autoplayKey]);

  /*
   * Autoplay once per `autoplayKey`. The key is reserved when the timer is
   * SCHEDULED (not when it fires) so two simultaneous mounts of the same
   * key cannot double-speak; the React StrictMode dev double-mount is
   * covered because the first mount's cleanup releases the reservation
   * before its timer ever fired.
   */
  useEffect(() => {
    if (!autoplay || !autoplayKey || playedKeys.has(autoplayKey)) return;
    playedKeys.add(autoplayKey);
    let fired = false;
    /* A recording session starting between schedule and fire permanently
       retires this autoplay (speech.ts audio-generation) - otherwise the
       instruction would sound after the mic closed, uninvited. */
    const gen = currentAudioGeneration();
    const timer = window.setTimeout(() => {
      fired = true;
      if (currentAudioGeneration() !== gen) return;
      // External-review r1 #2: autoplay defers to in-flight content audio.
      speak(true);
    }, AUTOPLAY_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (!fired) playedKeys.delete(autoplayKey);
    };
  }, [autoplay, autoplayKey, speak]);

  /* 'unavailable' -> visual-only path: no button at all (AC-1.4). */
  if (status === 'unavailable') return null;

  const token =
    status === 'playing' ? SPEAKER_BTN_PLAYING : status === 'blocked' ? SPEAKER_BTN_BLOCKED : SPEAKER_BTN;

  return (
    <button
      type="button"
      data-testid="instruction-speaker"
      aria-label={disabled ? 'Đang ghi âm - nghe hướng dẫn tạm tắt' : 'Nghe hướng dẫn'}
      title={status === 'error' || status === 'blocked' ? TAP_HINT : undefined}
      onClick={() => speak()}
      disabled={disabled}
      className={`${className ? `${token} ${className}` : token} ${disabled ? 'opacity-40' : ''}`}
    >
      <span aria-hidden="true">
        <EmojiVisual emoji="🔊" />
      </span>
    </button>
  );
}
