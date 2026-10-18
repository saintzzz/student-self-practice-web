import { useEffect, useRef, useState } from 'react';
import { usePressRelease } from '../hooks/usePressRelease';
import type { RoundOutcome } from '../lib/batch/batchSession';
import { getScoreStatus } from '../lib/batch/scoreStatus';
import { CONTINUE_BUTTON_CLASSNAME } from './actionButtonStyle';
import { CARD, CHIP_SKY, CTA_GOLD_XL, NAV_PILL, SCREEN_ENTER, TYPE_HERO_NUMBER_NAVY, TYPE_SECTION_NAVY } from '../lib/ui/tokens';
import Mascot from './Mascot';
import StarRain from './celebrations/StarRain';
import { ArtImg } from './ArtImg';
import { InstructionSpeaker } from './InstructionSpeaker';
import GiftBoxPicker from './GiftBoxPicker';
import { SendResultsCard } from './SendResultsCard';
import { ShareCard } from './ShareCard';
import { GRADES } from '../data/vocabulary';
import {
  checkStreakStickers,
  pendingGiftStickerIds,
  recordCorrectAnswers,
  recordRoundResult,
  recordSkillAnswers,
  touchStreak,
  type RoundAwardResult,
} from '../lib/engagement/store';
import { skillKeyForRound } from '../lib/engagement/skills';
import { IconArrowRight, IconHome, IconPlay } from './icons';

interface RoundSummaryProps {
  outcome: RoundOutcome;
  /** CR-10: grade the batch belongs to - stars bank into that land. */
  gradeId: string;
  onNextRound: () => void;
  /** CR-13: guest trial - after the free round, lock the rest behind login. */
  locked?: boolean;
  onRequestLogin?: () => void;
  onExit?: () => void;
  /**
   * kids-UX fork (design s3.10): "Xong rồi" ends the batch now so the child
   * lands on the BatchSummary with rewards for what was answered.
   */
  onEndBatch?: () => void;
  /** kids-UX AC-4.4: `round:<seed>:<roundIndex>` makes rewards idempotent. */
  objectiveId?: string;
  /**
   * kids-UX (design s3.2): round-scoped autoplay key for the instruction
   * speakers - `round-<gradeId>-<roundIndex>-<seed>`.
   */
  speakerKey?: string;
}

/**
 * Shown right after a Round's last question is answered (plan.md v5 -
 * "After each Round: a round score"; plan.md v10 - points headline + 75%
 * completion badge + celebrating mascot). No own mx-auto/max-w/px-4 (plan.md
 * v9 fix) - always nested inside BatchScreen's wrapper, which already
 * provides that padding; re-applying it here doubled the horizontal
 * padding on narrow phones.
 *
 * CR-10 DS-R3: awards 0-3 stars to the grade's land once per mount
 * (ref guard survives StrictMode's effect double-invoke) and rains
 * them over the points chip.
 *
 * kids-UX (design s3.5.a/s3.10, AC-4.1/AC-2.4): sao is THE headline metric -
 * the points pill is demoted to a secondary sky chip - and the single
 * continue button becomes the "Xong rồi / Chơi tiếp" fork (Chơi tiếp keeps
 * the gold emphasis and the next-round-button testid).
 */
export default function RoundSummary({
  outcome,
  gradeId,
  onNextRound,
  locked = false,
  onRequestLogin,
  onExit,
  onEndBatch,
  objectiveId,
  speakerKey,
}: RoundSummaryProps) {
  const status = getScoreStatus(outcome.points, outcome.maxPoints);
  const awarded = useRef<RoundAwardResult | null>(null);
  const [award, setAward] = useState<RoundAwardResult | null>(null);
  /* CR-82 (spec s16.1): the gold "Chơi tiếp" CTA springs on release. */
  const nextRoundPress = usePressRelease();

  useEffect(() => {
    if (!awarded.current) {
      const r = recordRoundResult(gradeId, outcome.roundNumber, outcome.points, outcome.maxPoints, objectiveId);
      /* Dev-review #5: alreadyGranted means this run was counted before -
         EVERY completion-derived mutation (streak day, correct-answer
         quest, skill stats, streak stickers) must skip together, else a
         remount/replay double-counts stats and pet XP. */
      if (r.alreadyGranted) {
        awarded.current = r;
      } else {
        // A finished round is real practice - it counts toward the day streak.
        touchStreak();
        // CR-27: round boundary is the right grain for the correct-answer
        // quest - a student who exits mid-batch still keeps progress.
        recordCorrectAnswers(outcome.correctCount);
        // CR-29: same granularity for the parent-report skill stats.
        // CR-82 (D-10): skill stats exclude assisted tracing completions -
        // points/stars still use correctCount/totalCount (R-v5-07).
        recordSkillAnswers(
          gradeId,
          skillKeyForRound(outcome.roundType),
          outcome.skillCorrect ?? outcome.correctCount,
          outcome.skillTotal ?? outcome.totalCount,
        );
        const streakStickers = checkStreakStickers();
        awarded.current = { ...r, newStickers: [...r.newStickers, ...streakStickers] };
      }
      setAward(awarded.current);
    }
  }, [gradeId, outcome.roundNumber, outcome.points, outcome.maxPoints, outcome.correctCount, outcome.totalCount, outcome.skillCorrect, outcome.skillTotal, outcome.roundType, objectiveId]);

  const stars = award?.stars ?? 0;
  const newStickers = award?.newStickers ?? [];
  /* Dev-review #6: gift eligibility is persisted state (owned sticker,
     unclaimed box) - not the transient newStickers list - so the offer
     survives a closed summary / remount. */
  const giftStickerId = pendingGiftStickerIds()[0] ?? null;
  const gradeName = GRADES.find((g) => g.id === gradeId)?.name ?? gradeId;
  /* "Xong rồi" prefers ending the batch (lands on the BatchSummary); when
     no end-batch handler exists (tests, other hosts) it falls back to the
     old exit path. */
  const onDone = onEndBatch ?? onExit;

  return (
    <div className={`${CARD} ${SCREEN_ENTER} py-6 text-center [@media(max-height:420px)]:py-3`}>
      <Mascot mood="celebrating" />
      <StarRain stars={stars} />
      <h2 className={`mt-1 ${TYPE_SECTION_NAVY}`}>{outcome.titleVi}</h2>

      {/* kids-UX s3.5.a: stars are the headline - "Em được N sao!" with the
          0-star process-praise variant (never deficit framing). CR-82 M3:
          the star count is the screen's hero number. */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <p data-testid="round-stars-summary" className="text-2xl font-semibold text-amber-200">
          {stars > 0 ? (
            <>Em được <span className={TYPE_HERO_NUMBER_NAVY}>{stars}</span> sao!</>
          ) : (
            'Em đã chơi hết vòng này - giỏi lắm! Vòng sau mình cùng lấy sao nhé.'
          )}
        </p>
        <InstructionSpeaker
          text={
            stars > 0
              ? `Em được ${stars} sao! Em đúng ${outcome.correctCount} trên ${outcome.totalCount} câu.`
              : 'Em đã chơi hết vòng này - giỏi lắm! Vòng sau mình cùng lấy sao nhé.'
          }
          lang="vi-VN"

          autoplayKey={speakerKey ? `${speakerKey}-summary` : undefined}
        />
      </div>

      <p data-testid="round-score-summary" className="mt-2 text-lg font-semibold text-slate-300">
        Em trả lời đúng {outcome.correctCount}/{outcome.totalCount} câu ở vòng này.
      </p>
      {/* kids-UX AC-4.1: points are demoted to a secondary sky chip - gold
          fills are reserved for earned treasure (stars, gifts). */}
      <p className="mt-2 flex justify-center">
        <span data-testid="round-points-summary" className={CHIP_SKY}>
          {outcome.points}/{outcome.maxPoints} điểm
        </span>
      </p>
      {award?.alreadyGranted && (
        <p className="mt-2 text-sm font-semibold text-sky-300">Đã nhận thưởng rồi</p>
      )}
      {newStickers.length > 0 && (
        <p data-testid="round-new-stickers" className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {newStickers.map((s) => (
            <span
              key={s.id}
              className="sticker-chip inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900 ring-2 ring-amber-300"
            >
              <ArtImg key={s.art} src={s.art} emoji={s.emoji} size={20} /> Huy hiệu mới: {s.nameVi}
            </span>
          ))}
        </p>
      )}
      {/* kids-UX s3.5.b: a new sticker moment opens the gift box - the home
          item is granted through the picker, never silently. */}
      {giftStickerId && <GiftBoxPicker stickerId={giftStickerId} />}
      <p
        data-testid="round-completion-badge"
        className={`mt-3 text-lg font-semibold ${status.isComplete ? 'text-emerald-300' : 'text-amber-200'}`}
      >
        {status.label}
      </p>
      {locked ? (
        <div
          data-testid="guest-lock-panel"
          className="mt-6 rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-[#1d3465] via-[#162C55] to-amber-500/10 px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_12px_28px_-12px_rgba(0,0,0,0.4)]"
        >
          <p className="font-display text-xl font-extrabold tracking-tight text-amber-200">
            Hết vòng chơi thử miễn phí
          </p>
          <p className="mt-2 text-base font-semibold text-slate-300">
            Đăng nhập để mở đủ 5 vòng mỗi bài, lưu sao và huy hiệu vĩnh viễn.
          </p>
          <button
            type="button"
            data-testid="guest-lock-login"
            onClick={onRequestLogin}
            className={`mt-4 w-full sm:w-auto ${CONTINUE_BUTTON_CLASSNAME}`}
          >
            <span className="inline-flex items-center gap-1.5">Đăng nhập để chơi tiếp <IconArrowRight size={18} /></span>
          </button>
          {onExit && (
            <button
              type="button"
              data-testid="guest-lock-exit"
              onClick={onExit}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center text-center text-sm font-bold text-blue-300 underline-offset-2 hover:underline sm:w-auto sm:px-2"
            >
              Chơi thử lớp khác
            </button>
          )}
        </div>
      ) : (
        <>
          {/* kids-UX s3.8.b/s3.8.c: share only rides sticker moments here;
              the send-results card self-gates to logged-in viewers. */}
          {newStickers.length > 0 && (
            <div className="mt-4 flex justify-center">
              <ShareCard
                title={outcome.titleVi}
                lines={[`${stars} sao`, gradeName, `${outcome.correctCount}/${outcome.totalCount} câu đúng`]}
                label="Chia sẻ thành tích"
              />
            </div>
          )}
          <SendResultsCard />

          {/* kids-UX s3.10 session fork - equal-size choices, no
              auto-advance; "Chơi tiếp" keeps the gold next-step emphasis. */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <h2 className={TYPE_SECTION_NAVY}>Em muốn làm gì tiếp?</h2>
            <InstructionSpeaker
              text="Em muốn nghỉ hay chơi tiếp nào?"
              lang="vi-VN"

              autoplayKey={speakerKey ? `${speakerKey}-fork` : undefined}
            />
          </div>
          <div className="mt-3 flex flex-col justify-center gap-4 sm:flex-row">
            {onDone && (
              <button
                type="button"
                data-testid="round-done"
                onClick={onDone}
                className={`w-full sm:w-auto ${NAV_PILL}`}
              >
                <span className="inline-flex items-center gap-2"><IconHome size={20} /> Xong rồi</span>
              </button>
            )}
            <button
              type="button"
              data-testid="next-round-button"
              onClick={onNextRound}
              className={`w-full sm:w-auto ${CTA_GOLD_XL}`}
              {...nextRoundPress}
            >
              <span className="inline-flex items-center gap-2"><IconPlay size={20} /> Chơi tiếp</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
