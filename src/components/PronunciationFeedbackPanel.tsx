interface PronunciationFeedbackPanelProps {
  targetWord: string;
  transcript: string;
  score: number;
  isCorrect: boolean;
  explanation: string;
}

/**
 * Round 3's dedicated feedback panel (plan.md v5 Data-Testid Contract:
 * `pronunciation-feedback`). Shows the transcribed text, the approximate
 * score, correct/incorrect styling and the explanation all in one place, so
 * this kind does not need the shared FeedbackPanel used by the other Round
 * kinds (see QuestionCard.tsx, which skips it for this question kind).
 */
export default function PronunciationFeedbackPanel({
  targetWord,
  transcript,
  score,
  isCorrect,
  explanation,
}: PronunciationFeedbackPanelProps) {
  const hasTranscript = transcript.trim().length > 0;

  return (
    <div
      data-testid="pronunciation-feedback"
      className={`mt-2 rounded-2xl border-4 p-5 text-left ${
        isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'
      }`}
    >
      <p className={`text-2xl font-extrabold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
        {isCorrect ? 'Phát âm khá chuẩn rồi, giỏi quá!' : 'Chưa thật gần đúng, cố lên nhé!'}
      </p>

      {hasTranscript ? (
        <>
          <p className="mt-2 text-lg text-slate-700">
            Máy nghe em đọc là: <span className="font-bold text-sky-900">&quot;{transcript}&quot;</span>
          </p>
          <p className="mt-1 text-lg text-slate-700">
            Độ gần đúng so với &quot;{targetWord}&quot;: <span className="font-bold">{score}%</span>
          </p>
        </>
      ) : (
        <p className="mt-2 text-lg text-slate-700">Không ghi nhận được bài đọc lần này. Em thử lại ở câu sau nhé!</p>
      )}

      <p className="mt-2 text-base text-slate-600">{explanation}</p>
      <p className="mt-3 text-sm italic text-slate-500">
        Đây là mức chấm gần đúng dựa trên nhận diện giọng nói của trình duyệt, không phải chấm điểm phát âm chuyên sâu
        như chuyên gia.
      </p>
    </div>
  );
}
