import { useEffect, useRef, useState } from 'react';
import type { BatchResult } from '../lib/batch/batchSession';
import { getScoreStatus } from '../lib/batch/scoreStatus';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { CARD, CHIP_SKY, CTA_GOLD_XL, H1, H2, NAV_PILL, SCORE_PILL_LG, SCREEN_ENTER } from '../lib/ui/tokens';
import Mascot from './Mascot';
import ChestReveal from './celebrations/ChestReveal';
import { InstructionSpeaker } from './InstructionSpeaker';
import GiftBoxPicker from './GiftBoxPicker';
import { SendResultsCard } from './SendResultsCard';
import { ShareCard } from './ShareCard';
import { useViewer } from '../lib/viewer/ViewerContext';
import { GRADES } from '../data/vocabulary';
import {
  checkStreakStickers,
  getState,
  pendingGiftStickerIds,
  recordBatchResult,
  recordBigModeComplete,
  touchStreak,
  type BatchAwardResult,
  type Sticker,
} from '../lib/engagement/store';
import { savePracticeResult } from '../lib/practiceResults';

interface BatchSummaryProps {
  result: BatchResult;
  /** CR-10: the land this batch was played in. */
  gradeId: string;
  onStartNewBatch: () => void;
  onChooseGrade: () => void;
  /** kids-UX AC-4.4: `batch:<seed>` makes the reward grant idempotent. */
  objectiveId?: string;
  /** kids-UX (design s3.2): batch-scoped autoplay key for the speakers. */
  speakerKey?: string;
}

/**
 * Shown after Round 4 (plan.md v5 AC21: total score + per-round breakdown;
 * plan.md v10: points is now the headline metric, matching IOE's own
 * raw-point-total convention, with the existing correct-count line kept as
 * a secondary detail).
 *
 * CR-10 DS-R4: one chest award per mount (ref guard for StrictMode):
 * +2 chest stars, batch completion, day streak and sticker checks.
 *
 * kids-UX (design s3.5.a/s3.10, AC-4.1/AC-2.4): sao is THE headline metric -
 * the "+N sao" treasure pill sits on top and the points pill demotes to a
 * secondary sky chip. The action row becomes the "Xong rồi / Chơi tiếp"
 * fork; "Chơi tiếp" keeps the practice-again-button testid and the only
 * gold emphasis.
 */
export default function BatchSummary({ result, gradeId, onStartNewBatch, onChooseGrade, objectiveId, speakerKey }: BatchSummaryProps) {
  const status = getScoreStatus(result.points, result.maxPoints);
  const { band } = useViewer();
  /* CR-69: ending a batch via "KẾT THÚC" before answering anything must
    not pay rewards or write a 0-question practice result. kids-UX: the
    gift, fork, share and send-results surfaces all stay behind this same
    `earned` gate. */
  const earned = result.totalQuestions > 0;
  const awarded = useRef<{ batch: BatchAwardResult; streakStickers: Sticker[]; totalStars: number } | null>(null);
  const [award, setAward] = useState(awarded.current);

  useEffect(() => {
    if (!earned) return;
    if (!awarded.current) {
      const batch = recordBatchResult(gradeId, objectiveId);
      /* Dev-review #5: alreadyGranted = this run was counted before -
         skip EVERY completion-derived mutation (streak, quest, stickers,
         server result write) so a remount never double-counts. */
      if (batch.alreadyGranted) {
        awarded.current = { batch, streakStickers: [], totalStars: getState().totalStars };
      } else {
        touchStreak();
        // CR-27: a finished 4-round batch counts as the daily big-mode
        // quest. Correct answers are already recorded per-round in
        // RoundSummary - re-recording here would double-count.
        recordBigModeComplete();
        const streakStickers = checkStreakStickers();
        // Luu ket qua len Supabase cho bao cao tien do - no-op voi guest.
        void savePracticeResult(gradeId, result);
        awarded.current = { batch, streakStickers, totalStars: getState().totalStars };
      }
      setAward(awarded.current);
    }
  }, [gradeId, result, earned, objectiveId]);

  const newStickers = award ? [...award.batch.newStickers, ...award.streakStickers] : [];
  /* Dev-review #6: pending gift is persisted state - the box offer must
     survive leaving this summary unclaimed. */
  const giftStickerId = earned ? pendingGiftStickerIds()[0] ?? null : null;
  const gradeName = GRADES.find((g) => g.id === gradeId)?.name ?? gradeId;

  return (
    <div className={`mx-auto max-w-2xl px-4 py-6 sm:py-10 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-center`}>
      <Mascot mood={earned ? 'celebrating' : 'encouraging'} />
      <div className="mt-1 flex items-center justify-center gap-2">
        <h1 className={H1}>{earned ? 'Hoàn thành bài luyện tập!' : 'Em chưa làm câu nào'}</h1>
        {earned && (
          <InstructionSpeaker
            text={`Hoàn thành bài luyện tập! Em đúng ${result.totalCorrect} trên ${result.totalQuestions} câu.`}
            lang="vi-VN"
            autoplay={band === 'G12'}
            autoplayKey={speakerKey ? `${speakerKey}-summary` : undefined}
          />
        )}
      </div>
      {!earned && (
        <p data-testid="batch-empty-note" className="mt-2 text-lg text-slate-300">
          Quay lại chơi để nhận sao và huy hiệu nhé!
        </p>
      )}
      {/* kids-UX s3.5.a: the star chest delta is the gold treasure pill -
          THE currency headline. */}
      {award && award.batch.chestStars > 0 && (
        <p className="mt-4 flex justify-center">
          <span data-testid="batch-stars-summary" className={SCORE_PILL_LG}>
            +{award.batch.chestStars} ⭐
          </span>
        </p>
      )}
      {award && award.batch.alreadyGranted && (
        <p className="mt-4 text-sm font-semibold text-sky-300">Đã nhận thưởng rồi</p>
      )}
      {award && (
        <ChestReveal
          chestStars={award.batch.chestStars}
          totalStars={award.totalStars}
          newStickers={newStickers}
        />
      )}
      {/* kids-UX s3.5.b: the sticker moment opens the gift box - home items
          grant through the picker, never silently. */}
      {giftStickerId && <GiftBoxPicker stickerId={giftStickerId} />}
      {earned && (
        <>
          {/* AC-4.1: points demote to a secondary sky chip - gold fills are
              reserved for earned treasure (stars, gifts). */}
          <p className="mt-6 flex justify-center">
            <span data-testid="batch-points-summary" className={CHIP_SKY}>
              {result.points}/{result.maxPoints} điểm
            </span>
          </p>
          <p data-testid="batch-score-summary" className="mt-3 text-xl font-semibold text-amber-200">
            Tổng điểm: {result.totalCorrect}/{result.totalQuestions} câu đúng.
          </p>
          <p data-testid="batch-time-summary" className="mt-1 text-base font-semibold text-sky-300">
            Thời gian làm bài: {Math.floor(result.timeUsedSec / 60)}:{String(result.timeUsedSec % 60).padStart(2, '0')}
          </p>
          <p
            data-testid="batch-completion-badge"
            className={`mt-3 text-lg font-semibold ${status.isComplete ? 'text-emerald-300' : 'text-amber-200'}`}
          >
            {status.label}
          </p>
        </>
      )}

      {earned && (
      <div className="mt-8 text-left">
        <h2 className={`mb-4 ${H2}`}>Kết quả từng vòng</h2>
        <ul className="space-y-3">
          {result.rounds.map((round) => (
            <li
              key={round.roundNumber}
              data-testid={`round-breakdown-${round.roundNumber}`}
              className="rounded-2xl bg-sky-500/15 p-4 shadow-sm ring-1 ring-sky-400/30"
            >
              <p className="font-display text-lg font-bold text-white">{round.titleVi}</p>
              <p className="mt-0.5 text-base text-slate-300">
                {round.implemented
                  ? `${round.correctCount}/${round.totalCount} câu đúng (${round.points}/${round.maxPoints} điểm)`
                  : 'Chưa có nội dung ở bản này'}
              </p>
            </li>
          ))}
        </ul>
      </div>
      )}

      {earned ? (
        <>
          {/* kids-UX s3.8.c/s3.8.b: parent send card (self-gates to
              logged-in) + share as a secondary action, both before the
              fork. */}
          <SendResultsCard />
          <div className="mt-4 flex justify-center">
            <ShareCard
              title="Hoàn thành bài luyện tập!"
              lines={[
                `+${award?.batch.chestStars ?? 0} sao`,
                gradeName,
                `${result.totalCorrect}/${result.totalQuestions} câu đúng`,
              ]}
              label="Chia sẻ thành tích"
            />
          </div>

          {/* kids-UX s3.10 session fork - equal-size choices, no
              auto-advance; "Chơi tiếp" keeps the gold next-step emphasis. */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <h2 className={H2}>Em muốn làm gì tiếp?</h2>
            <InstructionSpeaker
              text="Em muốn nghỉ hay chơi tiếp nào?"
              lang="vi-VN"
              autoplay={band === 'G12'}
              autoplayKey={speakerKey ? `${speakerKey}-fork` : undefined}
            />
          </div>
          <div className="mt-3 flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              data-testid="back-to-grades"
              onClick={onChooseGrade}
              className={`${NAV_PILL} w-full text-2xl sm:w-auto`}
            >
              🏠 Xong rồi
            </button>
            <button
              type="button"
              data-testid="practice-again-button"
              onClick={onStartNewBatch}
              className={`w-full sm:w-auto ${CTA_GOLD_XL}`}
            >
              ▶ Chơi tiếp
            </button>
          </div>
        </>
      ) : (
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <button
            type="button"
            data-testid="practice-again-button"
            onClick={onStartNewBatch}
            className={`w-full sm:w-auto ${CONTINUE_BUTTON_CLASSNAME}`}
          >
            Luyện tập bài mới
          </button>
          <button
            type="button"
            data-testid="back-to-grades"
            onClick={onChooseGrade}
            className={`${NAV_PILL} w-full text-2xl sm:w-auto`}
          >
            Chọn lớp khác
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
