interface PronunciationStatusMessageProps {
  testId:
    | 'mic-permission-denied-message'
    | 'speech-recognition-unsupported-message'
    | 'speech-recognition-error-message';
  heading: string;
  body: string;
  onSkip: () => void;
  /** CR-17: transient recognition failures get a retry path. */
  onRetry?: () => void;
}

/**
 * Shared visual shell for Round 3's two browser-capability fallback
 * messages (plan.md v5 "Round 3 - Pronunciation Recording": microphone
 * permission denied, and browsers without SpeechRecognition support such as
 * Firefox). Both cases render the same shape - a clear Vietnamese
 * explanation plus a way to skip the question and keep going (AC19).
 */
export default function PronunciationStatusMessage({ testId, heading, body, onSkip, onRetry }: PronunciationStatusMessageProps) {
  return (
    <div data-testid={testId} className="rounded-2xl border-4 border-amber-400/50 bg-gradient-to-b from-amber-500/20 to-amber-600/10 p-5 text-left shadow-md">
      <p className="text-xl font-extrabold text-amber-200">{heading}</p>
      <p className="mt-2 text-lg text-amber-100">{body}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {onRetry && (
          <button
            type="button"
            data-testid="pronunciation-retry-button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-rose-400 to-rose-600 px-6 py-3 text-lg font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-3px_0_rgba(0,0,0,0.15),0_4px_10px_-3px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-rose-400 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            Thử lại 🎙️
          </button>
        )}
        <button
          type="button"
          data-testid="pronunciation-skip-button"
          onClick={onSkip}
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-6 py-3 text-lg font-bold text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-3px_0_rgba(0,0,0,0.15),0_4px_10px_-3px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-amber-400 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Bỏ qua câu này →
        </button>
      </div>
    </div>
  );
}
