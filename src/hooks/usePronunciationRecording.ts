import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  type SpeechRecognitionController,
} from '../lib/speechRecognition';

export type PronunciationPhase =
  | 'idle'
  | 'recording'
  | 'permission-denied'
  | 'unsupported'
  | 'error';

/** SpeechRecognition error codes worth an invisible re-listen before giving up. */
const RETRYABLE_CODES = new Set(['no-speech', 'network', 'audio-capture', 'aborted']);

export interface UsePronunciationRecordingResult {
  phase: PronunciationPhase;
  /** Browser error code behind the 'error' phase ('no-speech', 'network', 'audio-capture', ...) for tailored messaging. */
  errorReason: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  /** Dismiss a transient 'error' state back to 'idle' so the child can tap record again. */
  retry: () => void;
  /** Explicit "give up on recording, submit an empty attempt" escape hatch for the fallback messages. */
  skip: () => void;
}

/**
 * Drives Round 3's record -> transcribe flow (plan.md v5 "Round 3 -
 * Pronunciation Recording"). Scoring itself happens in
 * practiceSession.submitPronunciationAnswer (single source of truth for
 * correctness, same as every other Round's reducer) - this hook's only job
 * is to get a transcript (or an explicit empty-string skip/no-speech
 * result) out of the browser and hand it to `onAttempt` exactly once per
 * question. No audio is ever stored by this hook or anywhere else - only
 * the text transcript the browser's own recognition service returns.
 */
export function usePronunciationRecording(onAttempt: (transcript: string) => void): UsePronunciationRecordingResult {
  const [phase, setPhase] = useState<PronunciationPhase>(() =>
    isSpeechRecognitionSupported() ? 'idle' : 'unsupported',
  );
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const controllerRef = useRef<SpeechRecognitionController | null>(null);
  const settledRef = useRef(false);
  // Transient failures ('no-speech' = silence timeout, 'network' = the
  // service is unreachable, 'audio-capture' = mic hiccup) get ONE silent
  // automatic retry while the child still sees "đang ghi âm" - field
  // feedback: kids tapped record, spoke, and got an error screen for a
  // failure the app could just have retried.
  const attemptsRef = useRef(0);
  // Self-reference so an auto-retry can start a fresh recognizer from
  // inside its own error callback - launch() intentionally skips the
  // 'already recording' guard that startRecording() enforces.
  const launchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.stop();
    };
  }, []);

  const finish = useCallback(
    (finalTranscript: string) => {
      if (settledRef.current) return;
      settledRef.current = true;
      onAttempt(finalTranscript);
    },
    [onAttempt],
  );

  const launch = useCallback(() => {

    // Goes straight to SpeechRecognition.start() instead of pre-flighting a
    // separate getUserMedia() call - requesting the microphone twice in a
    // row (once here, once again internally when recognition starts) is a
    // known source of flaky mic-acquisition failures on Android Chrome.
    // SpeechRecognition's own onerror already reports permission denial via
    // the 'not-allowed' family of codes (see PERMISSION_ERROR_CODES), so
    // nothing is lost by not asking twice.
    const controller = startSpeechRecognition({
      onResult: (transcript) => finish(transcript),
      onPermissionError: () => setPhase('permission-denied'),
      // CR-17 follow-up: a transient failure must NOT silently submit an
      // empty answer - it scored the question wrong with no explanation
      // of why. Silent-retry transient codes once, then move to a
      // retryable 'error' phase; the child chooses "thử lại"/"bỏ qua".
      onOtherError: (code) => {
        if (RETRYABLE_CODES.has(code) && attemptsRef.current < 2) {
          attemptsRef.current += 1;
          controllerRef.current = null;
          // Small beat so the recognizer can tear down cleanly.
          setTimeout(() => launchRef.current?.(), 150);
          return;
        }
        setErrorReason(code);
        setPhase('error');
      },
    });

    if (!controller) {
      setPhase('unsupported');
      return;
    }

    controllerRef.current = controller;
    setPhase('recording');
  }, [finish]);
  launchRef.current = launch;

  const startRecording = useCallback(() => {
    if (settledRef.current || phase === 'recording') return;
    launch();
  }, [phase, launch]);

  const stopRecording = useCallback(() => {
    controllerRef.current?.stop();
  }, []);

  const retry = useCallback(() => {
    if (settledRef.current) return;
    controllerRef.current = null;
    attemptsRef.current = 0;
    setErrorReason(null);
    setPhase('idle');
  }, []);

  const skip = useCallback(() => {
    finish('');
  }, [finish]);

  return { phase, errorReason, startRecording, stopRecording, retry, skip };
}
