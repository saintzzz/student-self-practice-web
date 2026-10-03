import type { Grade } from '../types';
import type { ExamProgramId } from '../types/exam';
import type { ArenaOpenChallenge } from '../lib/arena';
import Mascot from './Mascot';
import DailyQuestCard from './DailyQuestCard';
import ReviewCard from './ReviewCard';
import LeaderboardCard from './LeaderboardCard';
import ArenaCard from './ArenaCard';
import PetCard from './PetCard';
import { CARD, H1, PROMPT, NAV_PILL, SCREEN_ENTER } from '../lib/ui/tokens';
import { examConfigForGrade } from '../lib/exam/examSession';

interface StartBatchScreenProps {
  grade: Grade;
  onStartBatch: () => void;
  /** CR-25: 'practice' = 20-question drill with instant verdicts; 'exam' = 200q/30min.
   *  CR-28: 'review' = spaced-repetition session over due wrong questions.
   *  CR-34: 'arena' = 10-question 1v1 duel on a shared seed. */
  onStartExam: (programId: ExamProgramId, mode: 'practice' | 'exam' | 'review') => void;
  /** CR-34: arena entry points - create / accept / guest bot run. */
  onArenaCreate?: () => void;
  onArenaAccept?: (challenge: ArenaOpenChallenge) => void;
  onArenaBot?: () => void;
  onBack: () => void;
  /** CR-30: guests see a lock prompt on the leaderboard card. */
  isGuest?: boolean;
  onLogin?: () => void;
}

/**
 * Replaces the old topic-selection screen (plan.md v5: "Grade -> Start a
 * Batch, a single button, no topic selection needed since a Batch pulls
 * from the whole vocabulary pool, not one topic"). Greets with the app-wide
 * pig mascot (plan.md v10, AC38).
 */
/** CR-24: IOE-style Thi thử - 3 chương trình riêng biệt. */
const EXAM_PROGRAMS: readonly { id: ExamProgramId; icon: string; name: string; desc: string }[] = [
  { id: 'english', icon: '🇬🇧', name: 'Tiếng Anh', desc: 'Nghe, đọc, ngữ pháp, sắp câu' },
  { id: 'math', icon: '🔢', name: 'Toán tiếng Anh', desc: 'Tính nhẩm, đọc số, hình học' },
  { id: 'science', icon: '🔬', name: 'Khoa học', desc: 'Động vật, cây cối, tự nhiên' },
];

export default function StartBatchScreen({ grade, onStartBatch, onStartExam, onArenaCreate, onArenaAccept, onArenaBot, onBack, isGuest, onLogin }: StartBatchScreenProps) {
  // CR-46: same modes for every grade - only question counts scale.
  const examConfig = examConfigForGrade(grade.id);
  return (
    <div className={`mx-auto max-w-2xl px-4 py-6 sm:py-10 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
        <div className="mb-6 text-left">
          <button type="button" data-testid="back-to-grades" onClick={onBack} className={NAV_PILL}>
            ← Quay lại chọn lớp
          </button>
        </div>
        <Mascot mood="greeting" />
        <h1 className={`mt-1 ${H1}`}>{grade.name}: Sẵn sàng luyện tập chưa?</h1>
        <p className={`mt-3 ${PROMPT}`}>
          Luyện tập Tiếng Anh: 4 vòng game nhỏ, mỗi vòng khoảng 10 câu hỏi. Bấm nút bên dưới để bắt đầu nhé!
        </p>
        <button
          type="button"
          data-testid="start-batch-button"
          onClick={onStartBatch}
          className="mt-8 min-h-[76px] w-full rounded-3xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-12 py-6 font-display text-3xl font-extrabold text-white shadow-[inset_0_-5px_0_rgba(0,0,0,0.18),0_8px_20px_-6px_rgba(16,185,129,0.5)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_-5px_0_rgba(0,0,0,0.18),0_14px_28px_-8px_rgba(16,185,129,0.55)] active:translate-y-0 active:scale-95 active:shadow-[inset_0_-2px_0_rgba(0,0,0,0.18),0_4px_10px_-4px_rgba(16,185,129,0.5)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-emerald-500 sm:w-auto"
        >
          Bắt đầu luyện tập →
        </button>
      </div>

      {/* CR-27: daily quests - the first thing the student sees. */}
      <DailyQuestCard />

      {/* CR-28: spaced repetition - only renders when items are due. */}
      <ReviewCard gradeId={grade.id} onStartReview={() => onStartExam('english', 'review')} />

      {/* CR-36: companion pet - grows on every correct answer. */}
      <PetCard />

      {/* CR-30: weekly leaderboard - aggregate standings via rpc. */}
      <LeaderboardCard gradeId={grade.id} isGuest={isGuest ?? false} onLogin={onLogin} />

      {/* CR-34: arena duels - create/accept challenges or guest bot race. */}
      {onArenaCreate && onArenaAccept && onArenaBot && (
        <ArenaCard
          gradeId={grade.id}
          isGuest={isGuest ?? false}
          onCreate={onArenaCreate}
          onAccept={onArenaAccept}
          onBot={onArenaBot}
          onLogin={onLogin}
        />
      )}

      {/* CR-24/25: per-program Luyện đề (drill) + Thi thử (formal exam). */}
      <div className={`mt-4 ${CARD} text-center`}>
        <h2 className="font-display text-xl font-extrabold text-amber-300">🏆 Luyện đề & Thi thử</h2>
        <p className="mt-1 text-sm font-semibold text-slate-300">
          Luyện đề: {examConfig.drillCount} câu, chữa ngay. Thi thử: {examConfig.examCount} câu trong {Math.floor(examConfig.examTimeSec / 60)} phút, giống thi thật.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {EXAM_PROGRAMS.map((program) => (
            <div
              key={program.id}
              className="rounded-2xl bg-[#16232e] p-4 text-left ring-1 ring-white/10"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{program.icon}</span>
                <div className="font-extrabold text-white">{program.name}</div>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-400">{program.desc}</div>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  data-testid={`drill-${program.id}`}
                  onClick={() => onStartExam(program.id, 'practice')}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-500 active:scale-95"
                >
                  ✏️ Luyện đề - {examConfig.drillCount} câu
                </button>
                <button
                  type="button"
                  data-testid={`exam-program-${program.id}`}
                  onClick={() => onStartExam(program.id, 'exam')}
                  className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-sky-500 active:scale-95"
                >
                  🏆 Thi thử - {examConfig.examCount} câu
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
