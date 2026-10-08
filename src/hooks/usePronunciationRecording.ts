import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  type SpeechRecognitionController,
} from '../lib/speechRecognition';
import {
  isAudioRecordingSupported,
  isIOSOrIPadOS,
  startAudioRecording,
  type AudioRecordingController,
} from '../lib/audioRecording';
import { transcribePronunciationAudio } from '../lib/pronunciationTranscription';

export type PronunciationPhase =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'permission-denied'
  | 'unsupported'
  | 'error';

/** SpeechRecognition error codes worth an invisible re-listen before giving up. */
const RETRYABLE_CODES = new Set(['no-speech', 'network', 'audio-capture', 'aborted']);

export interface UsePronunciationRecordingResult {
  phase: PronunciationPhase;
  /** Browser error code behind the 'error' phase ('no-speech', 'network', 'audio-capture', 'transcription', ...) for tailored messaging. */
  errorReason: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  /** Dismiss a transient 'error' state back to 'idle' so the child can tap record again. */
  retry: () => void;
  /** Explicit "give up on recording, submit an empty attempt" escape hatch for the fallback messages. */
  skip: () => void;
}

type CaptureMode = 'sr' | 'recorder';

/**
 * Drives Round 3's record -> transcribe flow (plan.md v5 "Round 3 -
 * Pronunciation Recording"). Scoring itself happens in
 * practiceSession.submitPronunciationAnswer (single source of truth for
 * correctness, same as every other Round's reducer) - this hook's only job
 * is to get a transcript (or an explicit empty-string skip/no-speech
 * result) out of the browser and hand it to `onAttempt` exactly once per
 * question. No audio is ever stored by this hook or anywhere else - only
 * the text transcript the recognition service returns.
 *
 * CR-62: two capture engines behind one interface.
 *  - 'sr': browser SpeechRecognition - free and instant where it works
 *    (desktop Chrome/Edge, Android Chrome).
 *  - 'recorder': MediaRecorder + the practice-transcribe edge function -
 *    used on iOS/iPadOS (where webkitSpeechRecognition exists but is
 *    unusable in practice), wherever SR is missing, and as an automatic
 *    fallback when SR fails so the child is never stuck on an error
 *    screen while a working microphone sits unused.
 * `targetWord` is sent to the transcriber so the STT prompt can bias
 * toward the expected utterance.
 */
export function usePronunciationRecording(
  onAttempt: (transcript: string) => void,
  targetWord = '',
): UsePronunciationRecordingResult {
  const srSupported = isSpeechRecognitionSupported();
  const recorderSupported = isAudioRecordingSupported();
  // iOS goes straight to recorder even when SR's constructor exists -
  // on-device dictation errors are the norm there. Anywhere else SR
  // wins for latency/cost, with recorder as the safety net.
  const initialMode: CaptureMode | null = isIOSOrIPadOS()
    ? recorderSupported
      ? 'recorder'
      : srSupported
        ? 'sr'
        : null
    : srSupported
      ? 'sr'
      : recorderSupported
        ? 'recorder'
        : null;

  const [phase, setPhase] = useState<PronunciationPhase>(() =>
    initialMode ? 'idle' : 'unsupported',
  );
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const modeRef = useRef<CaptureMode | null>(initialMode);
  const controllerRef = useRef<SpeechRecognitionController | null>(null);
  const recorderRef = useRef<AudioRecordingController | null>(null);
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
      recorderRef.current?.cancel();
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

  // SR gave up (permission denial or retries exhausted). If the device
  // can still record real audio, switch to the recorder engine and hand
  // the child a working record button instead of a dead-end error - the
  // next tap uses MediaRecorder + server transcription. Without
  // MediaRecorder the original failure state stands.
  const fallBackToRecorder = useCallback((): boolean => {
    if (!isAudioRecordingSupported()) return false;
    modeRef.current = 'recorder';
    setErrorReason(null);
    setPhase('idle');
    return true;
  }, []);

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
      onPermissionError: () => {
        // SR denial is about the speech *service*, not necessarily the
        // mic (iOS: 'service-not-allowed' while getUserMedia is fine) -
        // try the recorder before showing the dead-end message.
        if (!fallBackToRecorder()) {
          setPhase('permission-denied');
        }
      },
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
        if (!fallBackToRecorder()) {
          setErrorReason(code);
          setPhase('error');
        }
      },
    });

    if (!controller) {
      // SR constructor threw at start() - same fallback rule.
      if (!fallBackToRecorder()) {
        setPhase('unsupported');
      }
      return;
    }

    controllerRef.current = controller;
    setPhase('recording');
  }, [finish, fallBackToRecorder]);
  launchRef.current = launch;

  const launchRecorder = useCallback(async () => {
    try {
      const controller = await startAudioRecording();
      if (settledRef.current) {
        controller.cancel();
        return;
      }
      recorderRef.current = controller;
      setPhase('recording');
    } catch (err) {
      const name = (err as DOMException)?.name ?? '';
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'NotFoundError') {
        setPhase('permission-denied');
      } else {
        setErrorReason('audio-capture');
        setPhase('error');
      }
    }
  }, []);

  const stopRecorder = useCallback(async () => {
    const controller = recorderRef.current;
    recorderRef.current = null;
    if (!controller) return;
    setPhase('processing');
    try {
      const blob = await controller.stop();
      const transcript = await transcribePronunciationAudio(blob, targetWord);
      if (transcript === null) {
        setErrorReason('transcription');
        setPhase('error');
        return;
      }
      if (transcript === '') {
        // Recorded fine but nothing intelligible - same affordance as
        // SR's silence path: retryable error, not an empty submission.
        setErrorReason('no-speech');
        setPhase('error');
        return;
      }
      finish(transcript);
    } catch {
      setErrorReason('audio-capture');
      setPhase('error');
    }
  }, [finish, targetWord]);

  const startRecording = useCallback(() => {
    if (settledRef.current || phase === 'recording' || phase === 'processing') return;
    if (modeRef.current === 'recorder') {
      void launchRecorder();
    } else {
      launch();
    }
  }, [phase, launch, launchRecorder]);

  const stopRecording = useCallback(() => {
    if (modeRef.current === 'recorder') {
      void stopRecorder();
    } else {
      controllerRef.current?.stop();
    }
  }, [stopRecorder]);

  const retry = useCallback(() => {
    if (settledRef.current) return;
    controllerRef.current = null;
    recorderRef.current = null;
    attemptsRef.current = 0;
    setErrorReason(null);
    setPhase('idle');
  }, []);

  const skip = useCallback(() => {
    finish('');
  }, [finish]);

  return { phase, errorReason, startRecording, stopRecording, retry, skip };
}
