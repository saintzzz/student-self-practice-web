import { useEffect } from 'react';
import { playSfx } from '../lib/sfx';

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

  // CR-20: same verdict chime/two-tone as the shared feedback panel.
  useEffect(() => {
    playSfx(isCorrect ? 'correct' : 'wrong');
  }, [isCorrect]);

  return (
    <div
      data-testid="pronunciation-feedback"
      className={`mt-2 rounded-2xl border-4 p-4 text-left shadow-md ${
        isCorrect
          ? 'border-emerald-400 bg-gradient-to-b from-emerald-500/25 to-emerald-600/15'
          : 'border-rose-400 bg-gradient-to-b from-rose-500/25 to-rose-600/15'
      }`}
    >
      <p className={`text-2xl font-extrabold ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
        {isCorrect ? 'Phát âm khá chuẩn rồi, giỏi quá!' : 'Chưa thật gần đúng, cố lên nhé!'}
      </p>

      {hasTranscript ? (
        <>
          <p className="mt-2 text-lg text-slate-300">
            Máy nghe em đọc là: <span className="font-bold text-white">&quot;{transcript}&quot;</span>
          </p>
          <p className="mt-1 text-lg text-slate-300">
            Độ gần đúng so với &quot;{targetWord}&quot;: <span className="font-bold">{score}%</span>
          </p>
        </>
      ) : (
        <p className="mt-2 text-lg text-slate-300">Không ghi nhận được bài đọc lần này. Em thử lại ở câu sau nhé!</p>
      )}

      <p className="mt-2 text-base text-slate-300">{explanation}</p>
      <p className="mt-3 text-sm italic text-slate-400">
        Đây là mức chấm gần đúng dựa trên nhận diện giọng nói của trình duyệt, không phải chấm điểm phát âm chuyên sâu
        như chuyên gia.
      </p>
    </div>
  );
}
