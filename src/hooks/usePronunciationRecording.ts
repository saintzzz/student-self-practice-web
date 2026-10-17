import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  type SpeechRecognitionController,
  type SpeechRecognitionSettle,
} from '../lib/speechRecognition';
import type { PronunciationScoringOptions } from '../lib/rounds/pronunciationScoring';
import {
  isAudioRecordingSupported,
  isIOSOrIPadOS,
  startAudioRecording,
  type AudioRecordingController,
} from '../lib/audioRecording';
import {
  isPronunciationServerConfigured,
  transcribePronunciationAudio,
} from '../lib/pronunciationTranscription';
import { setMicRecording } from '../lib/speech';
import { stopSfx } from '../lib/sfx';

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
  /** Latest non-final transcript while recording - the UI shows it live so
      the child sees the machine hearing them, not a dead wait. */
  heardText: string;
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
  onAttempt: (transcript: string, options?: PronunciationScoringOptions) => void,
  targetWord = '',
): UsePronunciationRecordingResult {
  const srSupported = isSpeechRecognitionSupported();
  const recorderSupported = isAudioRecordingSupported();
  // CR-90: when the build carries Supabase env the recorder path reaches
  // 'assess' mode - a provider hearing the audio and grading it against
  // the target is strictly better than scoring an STT transcript, so it
  // becomes the primary engine everywhere, not just on iOS. SR remains
  // the fallback for guests-without-env builds and browsers without
  // MediaRecorder.
  const recorderUsable = recorderSupported && isPronunciationServerConfigured();
  const initialMode: CaptureMode | null = isIOSOrIPadOS()
    ? recorderUsable
      ? 'recorder'
      : srSupported
        ? 'sr'
        : null
    : recorderUsable
      ? 'recorder'
      : srSupported
        ? 'sr'
        : null;

  const [phase, setPhase] = useState<PronunciationPhase>(() =>
    initialMode ? 'idle' : 'unsupported',
  );
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [heardText, setHeardText] = useState('');
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
  // Same trick for the recorder: VAD auto-stop resolves controller.done
  // and needs to invoke the stop+transcribe path from launchRecorder.
  const stopRecorderRef = useRef<(() => void) | null>(null);
  // r7: pending async work must never attach or callback after unmount -
  // a getUserMedia promise resolving late, the silent-retry timer, or an
  // in-flight transcription would otherwise submit to a question the
  // child already left.
  const unmountedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // CR-83 latency: once an interim transcript covers the target word, a
  // short stability window stops the recognizer early - cuts the ~1.5-3s
  // of post-speech silence the service would otherwise wait through.
  const interimStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // r8: React StrictMode replays mount->cleanup->mount; the cleanup sets
    // unmountedRef.current=true, so setup must re-arm it or the second mount is
    // permanently dead.
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (interimStopRef.current !== null) {
        clearTimeout(interimStopRef.current);
        interimStopRef.current = null;
      }
      controllerRef.current?.stop();
      recorderRef.current?.cancel();
      setMicRecording(false);
    };
  }, []);

  // The audio-suppression flag is owned by the 'recording' phase - any
  // transition out of it (processing/error/finish/unmount) releases
  // normal playback again.
  useEffect(() => {
    if (phase !== 'recording') setMicRecording(false);
  }, [phase]);

  const finish = useCallback(
    (finalTranscript: string, options?: PronunciationScoringOptions) => {
      if (settledRef.current || unmountedRef.current) return;
      /* CR-83 mishear guard: a transcript far longer than the target
         ("i am a student" vs target "egg") is the mic capturing
         something else - leftover app audio, TV, a sibling - not a bad
         pronunciation of the word. Scoring that 0% punishes the child
         for a capture failure, so route it to a retryable 'error' with
         a tailored hint instead of submitting. settledRef stays false
         so the retry button can bring the phase back to idle. */
      const targetWords = Math.max(
        1,
        targetWord.trim().split(/\s+/).filter(Boolean).length,
      );
      const heardWords = finalTranscript.trim().split(/\s+/).filter(Boolean).length;
      if (heardWords >= targetWords + 3) {
        setMicRecording(false);
        setErrorReason('mismatch');
        setPhase('error');
        return;
      }
      settledRef.current = true;
      if (interimStopRef.current) {
        clearTimeout(interimStopRef.current);
        interimStopRef.current = null;
      }
      setHeardText('');
      // SR success never passes through a non-'recording' phase, so the
      // phase effect cannot release suppression - the feedback screen's
      // "Nghe mẫu" would stay dead. Release here for every engine.
      setMicRecording(false);
      onAttempt(finalTranscript, options);
    },
    [onAttempt, targetWord],
  );

  const launchRecorder = useCallback(async () => {
    // r8: never even request the mic after unmount.
    if (unmountedRef.current) return;
    // Optimistic 'recording': getUserMedia may surface a permission
    // dialog while we await - showing idle mid-flight invites a double
    // tap. If it rejects, the proper error phase replaces this below.
    setPhase('recording');
    try {
      const controller = await startAudioRecording({ silenceMs: 900 });
      if (settledRef.current || unmountedRef.current) {
        controller.cancel();
        return;
      }
      recorderRef.current = controller;
      // VAD auto-stop (or the 10s cap) resolves done without a tap - run
      // the same stop path so transcription starts by itself.
      void controller.done.then(() => {
        if (unmountedRef.current) return;
        if (recorderRef.current === controller) void stopRecorderRef.current?.();
      });
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

  // SR gave up (permission denial or retries exhausted). If the device
  // can still record real audio, switch to the recorder engine AND
  // launch it in place - the child already tapped once, a dead button
  // that needs a second tap reads as "không dùng được". Without
  // MediaRecorder the original failure state stands.
  const fallBackToRecorder = useCallback((): boolean => {
    // r8: an SR error callback can fire after unmount - never launch a
    // fresh mic capture for a page the child already left. Returning true
    // keeps the caller from also setting a dead error phase.
    if (unmountedRef.current) return true;
    if (!isAudioRecordingSupported()) return false;
    modeRef.current = 'recorder';
    setErrorReason(null);
    void launchRecorder();
    return true;
  }, [launchRecorder]);

  const launch = useCallback(() => {
    if (unmountedRef.current) return;

    // Goes straight to SpeechRecognition.start() instead of pre-flighting a
    // separate getUserMedia() call - requesting the microphone twice in a
    // row (once here, once again internally when recognition starts) is a
    // known source of flaky mic-acquisition failures on Android Chrome.
    // SpeechRecognition's own onerror already reports permission denial via
    // the 'not-allowed' family of codes (see PERMISSION_ERROR_CODES), so
    // nothing is lost by not asking twice.
    const targetWords = Math.max(
      1,
      targetWord.trim().split(/\s+/).filter(Boolean).length,
    );
    const controller = startSpeechRecognition({
      // CR-90: forward the recognizer's alternates + confidence so the
      // scorer can evaluate every hypothesis, not just top-1.
      onResult: (settle: SpeechRecognitionSettle) =>
        finish(settle.transcript, {
          alternatives: settle.alternatives,
          confidence: settle.confidence,
        }),
      onInterim: (text) => {
        setHeardText(text);
        const heard = text.trim().split(/\s+/).filter(Boolean).length;
        if (heard > targetWords) {
          // Past the target - every extra word is drift/noise, stop now.
          controller?.stop();
        } else if (heard === targetWords) {
          // Same count may still be mid-word ('eg' -> 'egg') - wait for
          // the transcript to be stable a beat before cutting it off.
          if (interimStopRef.current) clearTimeout(interimStopRef.current);
          interimStopRef.current = setTimeout(() => {
            interimStopRef.current = null;
            controller?.stop();
          }, 500);
        }
      },
      onPermissionError: () => {
        // SR denial is about the speech *service*, not necessarily the
        // mic (iOS: 'service-not-allowed' while getUserMedia is fine) -
        // recorder takes over in-place when available.
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
          // Small beat so the recognizer can tear down cleanly; the timer
          // is tracked so unmount can cancel a pending restart.
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            if (!unmountedRef.current) launchRef.current?.();
          }, 150);
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
  }, [finish, fallBackToRecorder, targetWord]);
  launchRef.current = launch;

  const stopRecorder = useCallback(async () => {
    const controller = recorderRef.current;
    recorderRef.current = null;
    if (!controller) return;
    setPhase('processing');
    try {
      const blob = await controller.stop();
      if (unmountedRef.current) return;
      const result = await transcribePronunciationAudio(blob, targetWord);
      if (result === null) {
        setErrorReason('transcription');
        setPhase('error');
        return;
      }
      if (result.transcript === '') {
        // Recorded fine but nothing intelligible - same affordance as
        // SR's silence path: retryable error, not an empty submission.
        setErrorReason('no-speech');
        setPhase('error');
        return;
      }
      // CR-90: a present score = the provider graded the audio itself;
      // absent = plain transcript, the local scorer still applies.
      finish(result.transcript, result.score !== undefined ? { serverScore: result.score } : undefined);
    } catch {
      setErrorReason('audio-capture');
      setPhase('error');
    }
  }, [finish, targetWord]);
  stopRecorderRef.current = () => void stopRecorder();

  const startRecording = useCallback(() => {
    if (settledRef.current || phase === 'recording' || phase === 'processing') return;
    // Silence every app-owned sound before the mic opens - anything still
    // playing (instruction TTS, a word mp3 from the previous question,
    // "Nghe mẫu") bleeds into the recording and the STT dutifully
    // transcribes THAT instead of the child ("pepper" -> "chocolate").
    // The flag also blocks NEW sounds (delayed instruction autoplay)
    // until the phase effect below releases it. stopSfx silences a
    // still-ringing verdict ding - sfx uses its own elements.
    setMicRecording(true);
    stopSfx();
    setHeardText('');
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
    if (interimStopRef.current) {
      clearTimeout(interimStopRef.current);
      interimStopRef.current = null;
    }
    controllerRef.current = null;
    recorderRef.current = null;
    attemptsRef.current = 0;
    setHeardText('');
    setErrorReason(null);
    setPhase('idle');
  }, []);

  const skip = useCallback(() => {
    finish('');
  }, [finish]);

  return { phase, errorReason, startRecording, stopRecording, retry, skip, heardText };
}
