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

export interface SpeechRecognitionHandlers {
  onResult: (transcript: string) => void;
  onPermissionError: () => void;
  onOtherError: () => void;
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
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;

  let handled = false;

  recognizer.onresult = (event) => {
    handled = true;
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult?.[0]?.transcript ?? '';
    handlers.onResult(transcript);
  };

  recognizer.onerror = (event) => {
    handled = true;
    if (PERMISSION_ERROR_CODES.has(event.error)) {
      handlers.onPermissionError();
    } else {
      handlers.onOtherError();
    }
  };

  recognizer.onend = () => {
    // No onresult/onerror fired before the recognizer ended (e.g. the
    // student tapped stop before saying anything) - treat as a no-speech
    // attempt rather than leaving the UI stuck waiting.
    if (!handled) {
      handled = true;
      handlers.onOtherError();
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
