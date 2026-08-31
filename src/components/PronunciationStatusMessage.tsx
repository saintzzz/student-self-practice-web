interface PronunciationStatusMessageProps {
  testId: 'mic-permission-denied-message' | 'speech-recognition-unsupported-message';
  heading: string;
  body: string;
  onSkip: () => void;
}

/**
 * Shared visual shell for Round 3's two browser-capability fallback
 * messages (plan.md v5 "Round 3 - Pronunciation Recording": microphone
 * permission denied, and browsers without SpeechRecognition support such as
 * Firefox). Both cases render the same shape - a clear Vietnamese
 * explanation plus a way to skip the question and keep going (AC19).
 */
export default function PronunciationStatusMessage({ testId, heading, body, onSkip }: PronunciationStatusMessageProps) {
  return (
    <div data-testid={testId} className="rounded-2xl border-4 border-amber-300 bg-amber-50 p-5 text-left">
      <p className="text-xl font-extrabold text-amber-800">{heading}</p>
      <p className="mt-2 text-lg text-amber-900">{body}</p>
      <button
        type="button"
        data-testid="pronunciation-skip-button"
        onClick={onSkip}
        className="mt-4 rounded-2xl bg-amber-500 px-6 py-3 text-lg font-bold text-white shadow-md transition hover:bg-amber-600"
      >
        Bỏ qua câu này →
      </button>
    </div>
  );
}
