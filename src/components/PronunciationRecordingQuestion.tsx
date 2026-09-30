import type { PronunciationRecordingQuestion as PronunciationRecordingQuestionType } from '../types';
import { usePronunciationRecording } from '../hooks/usePronunciationRecording';
import PronunciationFeedbackPanel from './PronunciationFeedbackPanel';
import PronunciationStatusMessage from './PronunciationStatusMessage';

interface PronunciationRecordingQuestionProps {
  question: PronunciationRecordingQuestionType;
  hasAnswered: boolean;
  transcript: string | null;
  score: number | null;
  isCorrect: boolean | null;
  onSubmit: (transcript: string) => void;
}

const DISCLOSURE_TEXT =
  'Đây là cách kiểm tra gần đúng dựa trên nhận diện giọng nói của trình duyệt, không phải chấm điểm phát âm ' +
  'chuẩn xác tuyệt đối như chuyên gia đâu nhé. Cứ mạnh dạn đọc to lên nào!';

/**
 * Round 3 - Pronunciation Recording (plan.md v5/v6). Once `hasAnswered` is
 * true (the parent's practice-session reducer has already scored the
 * attempt), this renders the read-only feedback view; otherwise it renders
 * the record control plus whichever browser-capability state
 * usePronunciationRecording reports.
 */
export default function PronunciationRecordingQuestion({
  question,
  hasAnswered,
  transcript,
  score,
  isCorrect,
  onSubmit,
}: PronunciationRecordingQuestionProps) {
  const { phase, startRecording, stopRecording, skip } = usePronunciationRecording(onSubmit);

  return (
    <div>
      <p className="mb-2 text-xl font-semibold text-amber-200">Đọc to từ này lên nhé:</p>
      <p className="mb-3 text-4xl font-extrabold text-white">{question.word}</p>

      {hasAnswered ? (
        <PronunciationFeedbackPanel
          targetWord={question.word}
          transcript={transcript ?? ''}
          score={score ?? 0}
          isCorrect={isCorrect ?? false}
          explanation={question.explanation}
        />
      ) : (
        <>
          <p className="mb-3 text-base italic text-slate-400">{DISCLOSURE_TEXT}</p>

          {phase === 'unsupported' && (
            <PronunciationStatusMessage
              testId="speech-recognition-unsupported-message"
              heading="Trình duyệt chưa hỗ trợ ghi âm"
              body="Trình duyệt em đang dùng chưa hỗ trợ nhận diện giọng nói cho bài này. Em có thể bỏ qua câu này và làm câu tiếp theo nhé."
              onSkip={skip}
            />
          )}

          {phase === 'permission-denied' && (
            <PronunciationStatusMessage
              testId="mic-permission-denied-message"
              heading="Không thể truy cập micro"
              body="Trình duyệt không được cấp quyền dùng micro nên chưa ghi âm được. Em có thể bỏ qua câu này và làm câu tiếp theo nhé."
              onSkip={skip}
            />
          )}

          {(phase === 'idle' || phase === 'recording') && (
            <div>
              <button
                type="button"
                data-testid="record-button"
                onClick={phase === 'recording' ? stopRecording : startRecording}
                className="inline-flex min-h-[76px] items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-rose-600 px-8 py-3 font-display text-2xl font-bold text-white shadow-[inset_0_-4px_0_rgba(0,0,0,0.18),0_6px_16px_-4px_rgba(244,63,94,0.45)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-rose-400"
              >
                {phase === 'recording' ? '⏹️ Đang ghi âm, nhấn để dừng' : '🎙️ Nhấn để ghi âm'}
              </button>
              {phase === 'recording' && (
                <p data-testid="recording-indicator" className="mt-4 text-lg font-semibold text-rose-300">
                  🔴 Đang lắng nghe em đọc...
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
