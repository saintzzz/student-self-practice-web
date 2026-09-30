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

export interface UsePronunciationRecordingResult {
  phase: PronunciationPhase;
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
  const controllerRef = useRef<SpeechRecognitionController | null>(null);
  const settledRef = useRef(false);

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

  const startRecording = useCallback(() => {
    if (settledRef.current || phase === 'recording') return;

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
      // CR-17 follow-up: a transient failure (mobile 'network'/'audio-
      // capture'/'no-speech', or the child tapping stop without speaking)
      // must NOT silently submit an empty answer - it scored the question
      // wrong with no explanation of why. Move to a retryable 'error'
      // phase instead; the child chooses "thử lại" or "bỏ qua".
      onOtherError: () => setPhase('error'),
    });

    if (!controller) {
      setPhase('unsupported');
      return;
    }

    controllerRef.current = controller;
    setPhase('recording');
  }, [phase, finish]);

  const stopRecording = useCallback(() => {
    controllerRef.current?.stop();
  }, []);

  const retry = useCallback(() => {
    if (settledRef.current) return;
    controllerRef.current = null;
    setPhase('idle');
  }, []);

  const skip = useCallback(() => {
    finish('');
  }, [finish]);

  return { phase, startRecording, stopRecording, retry, skip };
}
