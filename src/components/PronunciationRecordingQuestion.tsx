import { useRef } from 'react';
import type { PronunciationRecordingQuestion as PronunciationRecordingQuestionType } from '../types';
import { usePronunciationRecording } from '../hooks/usePronunciationRecording';
import { useDemoHint } from '../hooks/useDemoHint';
import DemoHint from './DemoHint';
import PronunciationFeedbackPanel from './PronunciationFeedbackPanel';
import PronunciationStatusMessage from './PronunciationStatusMessage';
import QuestionBanner from './QuestionBanner';
import { speakWord } from '../lib/speech';
import { IconClock, IconMic, IconSpeaker } from './icons';

const INSTRUCTION = 'Đọc to từ này lên nhé:';

interface PronunciationRecordingQuestionProps {
  question: PronunciationRecordingQuestionType;
  hasAnswered: boolean;
  transcript: string | null;
  score: number | null;
  isCorrect: boolean | null;
  onSubmit: (transcript: string, options?: import('../lib/rounds/pronunciationScoring').PronunciationScoringOptions) => void;
  /** kids-UX s3.2: round-scoped key for the (now silent) instruction speaker. */
  speakerKey?: string;
}

const DISCLOSURE_TEXT =
  'Đây là cách kiểm tra gần đúng dựa trên nhận diện giọng nói của trình duyệt, không phải chấm điểm phát âm ' +
  'chuẩn xác tuyệt đối như chuyên gia đâu nhé. Cứ mạnh dạn đọc to lên nào!';

/** Friendly copy per real browser error code (generic hint as fallback). */
function errorBodyFor(reason: string | null): string {
  switch (reason) {
    case 'no-speech':
    case 'aborted':
      return 'Micro đã bật nhưng chưa nghe rõ tiếng em - em đứng gần micro hơn, đọc thật to và rõ từng chữ ngay sau khi bấm nhé.';
    case 'network':
      return 'Dịch vụ nhận diện giọng nói cần mạng ổn định - mạng đang chập chờn nên chưa nghe được. Em kiểm tra mạng rồi thử lại nhé.';
    case 'audio-capture':
      return 'Micro đang gặp trục trặc - em kiểm tra micro (hoặc tai nghe) đang bật rồi thử lại nhé.';
    case 'transcription':
      return 'Đã ghi âm xong nhưng chưa nghe rõ được - mạng đang chập chờn. Em thử lại nhé.';
    case 'mismatch':
      return 'Máy nghe nhầm tiếng khác chứ không phải tiếng đọc của em - em ra chỗ yên tĩnh hơn, để micro gần miệng rồi đọc thật to và rõ từng chữ nhé.';
    default:
      return 'Micro chưa nhận được tiếng đọc của em - có thể do mạng chập chờn hoặc em chưa kịp đọc. Em thử lại hoặc bỏ qua câu này nhé.';
  }
}

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
  speakerKey,
}: PronunciationRecordingQuestionProps) {
  const { phase, errorReason, startRecording, stopRecording, retry, skip, heardText } = usePronunciationRecording(
    onSubmit,
    question.word,
  );
  const demo = useDemoHint('pronunciation-recording');
  const micRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <QuestionBanner text={INSTRUCTION} speakerKey={speakerKey} />
      {/* Cream reading card - the word the child reads aloud, plus a
          "Nghe mẫu" chip so pre-readers can hear it first. speakWord is
          suppressed automatically once the mic opens (micRecordingActive). */}
      <div className="mb-4 inline-flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-6 py-4 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.55)]">
        <p className="font-display text-5xl font-extrabold tracking-wide text-slate-800">{question.word}</p>
        <button
          type="button"
          data-testid="model-word-button"
          onClick={() => speakWord(question.word)}
          aria-label={`Nghe mẫu từ ${question.word}`}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_4px_10px_-3px_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-amber-400"
        >
          <IconSpeaker size={20} />
        </button>
      </div>

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

          {phase === 'error' && (
            <PronunciationStatusMessage
              testId="speech-recognition-error-message"
              heading="Chưa nghe được giọng em"
              body={errorBodyFor(errorReason)}
              onRetry={retry}
              onSkip={skip}
            />
          )}

          {phase === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-2">
              <button
                type="button"
                disabled
                data-testid="processing-button"
                aria-label="Đang chấm giọng em"
                className="flex h-24 w-24 cursor-wait items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-amber-600 text-white opacity-95 shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_10px_24px_-6px_rgba(245,158,11,0.5)]"
              >
                <IconClock size={34} className="animate-pulse motion-reduce:animate-none" />
              </button>
              <p className="text-lg font-semibold text-amber-200">Đang chấm giọng em...</p>
            </div>
          )}

          {(phase === 'idle' || phase === 'recording') && (
            <div ref={micRef} className="relative flex flex-col items-center gap-3 py-2">
              <button
                type="button"
                data-testid="record-button"
                onClick={phase === 'recording' ? stopRecording : startRecording}
                aria-label={phase === 'recording' ? 'Nhấn để dừng sớm' : 'Nhấn rồi đọc to lên'}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-rose-400 ${
                  phase === 'recording'
                    ? 'bg-gradient-to-b from-rose-500 to-rose-700 shadow-[inset_0_3px_0_rgba(255,255,255,0.3),0_10px_28px_-6px_rgba(244,63,94,0.6)]'
                    : 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-[inset_0_3px_0_rgba(255,255,255,0.35),0_10px_24px_-6px_rgba(244,63,94,0.5)]'
                }`}
              >
                {phase === 'recording' && (
                  <span
                    aria-hidden
                    className="absolute -inset-1.5 animate-pulse rounded-full border-4 border-rose-400/50 motion-reduce:hidden"
                  />
                )}
                {phase === 'recording' ? (
                  <span className="flex items-end gap-1" aria-hidden>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="audio-bars h-7 w-1.5 rounded-full bg-white/90"
                        style={{ animationDelay: `${i * 130}ms` }}
                      />
                    ))}
                  </span>
                ) : (
                  <IconMic size={36} />
                )}
              </button>
              <p className="text-base font-semibold text-slate-300">
                {phase === 'recording' ? 'Nhấn để dừng sớm' : 'Nhấn rồi đọc to lên'}
              </p>
              {phase === 'recording' && (
                <div data-testid="recording-indicator" className="text-center">
                  <p className="text-lg font-semibold text-rose-300">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-3 w-3 animate-pulse motion-reduce:animate-none rounded-full bg-rose-500" />
                      Đang lắng nghe - em đọc xong sẽ tự chấm luôn
                    </span>
                  </p>
                  {heardText && (
                    <p data-testid="live-transcript" className="mt-1 text-base italic text-amber-300">
                      Nghe thấy: {heardText}
                    </p>
                  )}
                </div>
              )}
              {demo.showDemo && phase === 'idle' ? (
                <DemoHint containerRef={micRef} onDone={demo.dismiss} />
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
