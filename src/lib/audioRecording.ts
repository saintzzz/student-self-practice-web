/**
 * Real microphone capture via getUserMedia + MediaRecorder (CR-62). The
 * pronunciation round used to rely solely on the browser's
 * SpeechRecognition service, which is unusable on iOS/iPadOS (Siri-
 * dependent, network/service-not-allowed errors, and its silent-retry
 * loses the user gesture). MediaRecorder works on iOS Safari 14.3+,
 * Android Chrome and every modern desktop browser, so this is the
 * fallback - and on iOS the primary - transcription path.
 */

export function isAudioRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/**
 * iPhone/iPad, including iPadOS desktop-mode UA
 * ("Macintosh" + multi-touch). iOS WebKit SpeechRecognition is present
 * but unreliable, so callers route these devices to MediaRecorder even
 * when the SR constructor exists.
 */
export function isIOSOrIPadOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1)
  );
}

/**
 * MIME candidates in preference order. iOS Safari records audio/mp4
 * (AAC) only; Chrome/Android prefer opus-in-webm. Empty string means
 * "let the browser pick" - MediaRecorder still works, blob.type tells
 * us what we got.
 */
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
];

export function pickAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
}

export interface AudioRecordingController {
  /** Idempotent - resolves with the recorded blob on the first call.
      Also resolves when VAD auto-stops the take, so callers can observe
      endpointing without a button tap. */
  stop: () => Promise<Blob>;
  /** Resolves with the take however it ended (manual stop, VAD, cap).
      Never resolves after cancel(). */
  done: Promise<Blob>;
  /** Abort without producing audio (unmount cleanup). */
  cancel: () => void;
}

export interface RecordingOptions {
  /** Hard cap - a wandering child still produces a usable blob. */
  maxDurationMs?: number;
  /** Auto-stop after this much quiet once speech has been heard -
      endpointing like dictation apps, no stop-tap needed. */
  silenceMs?: number;
  /** No speech at all within this window -> auto-stop (empty take). */
  initialSilenceMs?: number;
  /** RMS energy (0..1 float PCM) that counts as "speech". */
  rmsThreshold?: number;
}

/** Seconds of consecutive loud frames before we trust it as speech -
    filters mic bumps/key clicks that spike a single frame. */
const SPEECH_ONSET_MS = 150;

export async function startAudioRecording(
  options: RecordingOptions = {},
): Promise<AudioRecordingController> {
  const {
    maxDurationMs = 10000,
    silenceMs = 1200,
    initialSilenceMs = 6000,
    rmsThreshold = 0.015,
  } = options;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickAudioMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  // Voice-activity endpointing: an AnalyserNode taps the live mic stream
  // and auto-stops the recorder once speech is followed by `silenceMs` of
  // quiet (or `initialSilenceMs` of silence with no speech at all). Any
  // failure here is non-fatal - the max-duration timer below still caps
  // the take, so a broken AudioContext can never strand the recording.
  const startAt = Date.now();
  let speechSince = 0;
  let quietSince = startAt;
  let speechSeen = false;
  let vadStop = () => {};
  try {
    const ctx = new AudioContext();
    // iOS Safari spawns the context suspended; resume() runs inside the
    // same user-gesture chain as the record tap, so it is allowed here.
    if (ctx.state === 'suspended') void ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let rafId = 0;
    let stopped = false;
    const stop = () => {
      if (stopped || recorder.state === 'inactive') return;
      stopped = true;
      try {
        recorder.stop();
      } catch {
        // already stopping
      }
    };
    const tick = () => {
      if (stopped) return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const now = Date.now();
      if (rms > rmsThreshold) {
        quietSince = 0;
        if (!speechSince) speechSince = now;
        if (!speechSeen && now - speechSince >= SPEECH_ONSET_MS) speechSeen = true;
      } else {
        speechSince = 0;
        if (!quietSince) quietSince = now;
        if (speechSeen && now - quietSince >= silenceMs) return stop();
        if (!speechSeen && now - startAt >= initialSilenceMs) return stop();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    vadStop = () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      void ctx.close();
    };
  } catch {
    // No AudioContext - caller still gets the max-duration cap.
  }

  let resolveDone!: (blob: Blob) => void;
  let rejectDone!: (err: unknown) => void;
  const done = new Promise<Blob>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  // Never let an unresolved rejection surface (cancel() abandons it).
  done.catch(() => {});

  const release = () => {
    vadStop();
    stream.getTracks().forEach((track) => track.stop());
  };

  const timer = setTimeout(() => {
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // already stopping
      }
    }
  }, maxDurationMs);

  const effectiveType = recorder.mimeType || mimeType || 'audio/webm';
  recorder.onstop = () => {
    clearTimeout(timer);
    release();
    resolveDone(new Blob(chunks, { type: effectiveType }));
  };
  recorder.onerror = (event) => {
    clearTimeout(timer);
    release();
    rejectDone(event);
  };

  recorder.start();

  return {
    done,
    stop: () => {
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // already stopping - fall through, `done` still resolves
        }
      }
      return done;
    },
    cancel: () => {
      recorder.onstop = null;
      recorder.onerror = null;
      clearTimeout(timer);
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // already stopped
        }
      }
      release();
    },
  };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
