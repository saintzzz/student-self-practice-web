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
  /** Idempotent - resolves with the recorded blob on the first call. */
  stop: () => Promise<Blob>;
  /** Abort without producing audio (unmount cleanup). */
  cancel: () => void;
}

/**
 * Starts a capture. Auto-stops after `maxDurationMs` - pronunciation
 * prompts are a single word/sentence, so anything longer is a child who
 * wandered off; the resolved blob is still usable. The mic stream is
 * released on stop/cancel - nothing is uploaded or stored client-side
 * beyond the in-memory blob the caller hands to transcription.
 */
export async function startAudioRecording(
  maxDurationMs = 10000,
): Promise<AudioRecordingController> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickAudioMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  let resolveDone!: (blob: Blob) => void;
  let rejectDone!: (err: unknown) => void;
  const done = new Promise<Blob>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  // Never let an unresolved rejection surface (cancel() abandons it).
  done.catch(() => {});

  const release = () => {
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
