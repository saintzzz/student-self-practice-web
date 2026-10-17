/**
 * Thin wrapper around the browser's native SpeechRecognition /
 * webkitSpeechRecognition Web API (Round 3 - Pronunciation Recording,
 * plan.md v5/v6). This is an approximate transcription service, not a
 * certified pronunciation grader - see pronunciationScoring.ts for the
 * scoring curve built on top of its output.
 *
 * The official TypeScript DOM lib does not ship types for this API (it is
 * not a standardized/widely-implemented Web API - notably absent from
 * Firefox), so this module defines its own minimal structural types instead
 * of augmenting the global Window interface, to avoid any risk of
 * conflicting with a future lib.dom.d.ts addition.
 */

export interface SpeechRecognitionResultLike {
  readonly [index: number]: { transcript: string; confidence: number };
  readonly isFinal: boolean;
  readonly length: number;
}

export interface SpeechRecognitionResultListLike {
  readonly [index: number]: SpeechRecognitionResultLike;
  readonly length: number;
}

export interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionCapableWindow {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

function getRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const capableWindow = window as unknown as SpeechRecognitionCapableWindow;
  return capableWindow.SpeechRecognition ?? capableWindow.webkitSpeechRecognition ?? null;
}

/** Lets callers detect missing support up front (notably Firefox) and show a graceful fallback (AC19). */
export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionConstructor() !== null;
}

/**
 * Explicitly requests microphone permission via getUserMedia before
 * starting recognition, so a denial surfaces as a distinct, catchable state
 * (mic-permission-denied-message) instead of an opaque recognition error.
 * The stream is released immediately - SpeechRecognition captures audio
 * internally and does not need this stream kept alive (no audio is ever
 * persisted, per plan.md v5's privacy note).
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return true;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

/** Richer settle payload for CR-90: the top transcript plus the other
 *  hypotheses + its confidence, so the scorer can pick the best candidate
 *  instead of being stuck with whatever the recognizer ranked first. */
export interface SpeechRecognitionSettle {
  transcript: string;
  alternatives: string[];
  confidence?: number;
}

export interface SpeechRecognitionHandlers {
  onResult: (settle: SpeechRecognitionSettle) => void;
  onPermissionError: () => void;
  /** Called with the browser's error code ('no-speech', 'network', ...) so callers can auto-retry transient failures and tailor the fallback message. */
  onOtherError: (code: string) => void;
  /**
   * CR-83 latency: non-final interim transcripts, forwarded as they
   * arrive - the caller can early-stop once the whole target word is
   * heard instead of waiting for the service's own silence endpoint
   * (~1.5-3s of dead air after the child finishes speaking).
   */
  onInterim?: (transcript: string) => void;
}

export interface SpeechRecognitionController {
  stop: () => void;
}

const PERMISSION_ERROR_CODES = new Set(['not-allowed', 'permission-denied', 'service-not-allowed']);

/**
 * Starts a single-utterance recognition attempt. Returns null immediately
 * if the API is unsupported or fails to start, so callers never get stuck
 * waiting on a result that will never arrive.
 */
export function startSpeechRecognition(handlers: SpeechRecognitionHandlers): SpeechRecognitionController | null {
  const RecognitionCtor = getRecognitionConstructor();
  if (!RecognitionCtor) {
    return null;
  }

  const recognizer = new RecognitionCtor();
  recognizer.lang = 'en-US';
  recognizer.continuous = false;
  // Interim results keep the service's no-speech timeout from firing as
  // aggressively and let the caller settle on the first FINAL result only.
  recognizer.interimResults = true;
  // CR-90: grab the recognizer's other guesses - the top-1 transcript for a
  // child's short isolated word is often a near-miss while the correct word
  // sits at index 2-4. scorePronunciationAttempt picks the best candidate.
  recognizer.maxAlternatives = 5;

  let handled = false;

  recognizer.onresult = (event) => {
    if (handled) return;
    // With interimResults on, non-final events fire mid-utterance - only
    // settle on a final transcript so a hesitant first syllable is not
    // scored as the whole attempt.
    const lastResult = event.results[event.results.length - 1];
    if (!lastResult?.isFinal) {
      handlers.onInterim?.(lastResult?.[0]?.transcript ?? '');
      return;
    }
    handled = true;
    const candidates: { transcript: string; confidence: number }[] = [];
    for (let i = 0; i < lastResult.length; i++) {
      const alt = lastResult[i];
      if (alt && alt.transcript.trim().length > 0) {
        candidates.push({ transcript: alt.transcript, confidence: alt.confidence });
      }
    }
    handlers.onResult({
      transcript: candidates[0]?.transcript ?? '',
      alternatives: candidates.slice(1).map((c) => c.transcript),
      confidence: candidates[0]?.confidence,
    });
  };

  recognizer.onerror = (event) => {
    if (handled) return;
    handled = true;
    if (PERMISSION_ERROR_CODES.has(event.error)) {
      handlers.onPermissionError();
    } else {
      handlers.onOtherError(event.error ?? 'unknown');
    }
  };

  recognizer.onend = () => {
    // No onresult/onerror fired before the recognizer ended (e.g. the
    // student tapped stop before saying anything) - treat as a no-speech
    // attempt rather than leaving the UI stuck waiting.
    if (!handled) {
      handled = true;
      handlers.onOtherError('no-speech');
    }
  };

  try {
    recognizer.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      try {
        recognizer.stop();
      } catch {
        // Already stopped/ended - ignore, matches speech.ts's swallow-and-continue contract.
      }
    },
  };
}
