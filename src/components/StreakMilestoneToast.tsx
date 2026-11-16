import { isStreakMilestone, useServerStreak } from '../lib/engagement/serverStreak';
import { IconFlame } from './icons';

/**
 * CR-138 (edu-research W47 R2): server-streak milestone moment.
 * Mounts inside a completion summary (BatchSummary / ExamResult) and
 * fires ONLY when this session's round was the first of the day AND it
 * pushed the streak to a loss-aversion milestone - day 3, then every
 * 7 days (Duolingo: retention locks in at day 7).
 *
 * Signed-in only by construction: the status is null for guests, who
 * already get streak stickers via the local engagement store.
 */
export default function StreakMilestoneToast() {
  const srv = useServerStreak();
  if (!isStreakMilestone(srv)) return null;
  const n = (srv as { streak: number }).streak;
  return (
    <p
      data-testid="streak-milestone"
      role="status"
      className="animate-mascot-pop pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-2 rounded-full bg-orange-500/95 px-5 py-2.5 text-base font-extrabold text-white shadow-lg ring-1 ring-orange-300/60 motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="inline-flex"><IconFlame size={20} /></span>
      Chuỗi {n} ngày liên tiếp! Giữ lửa nhé!
    </p>
  );
}
