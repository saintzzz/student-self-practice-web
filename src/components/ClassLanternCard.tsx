import { useEffect, useState } from 'react';
import { fetchClassLanterns, type ClassLanterns } from '../lib/classLanterns';
import { claimClassLantern } from '../lib/engagement/store';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { CARD_DAY } from '../lib/ui/tokens';
import { IconFlame, IconParty } from './icons';

interface ClassLanternCardProps {
  /** Guest / not configured -> renders nothing. */
  isGuest: boolean;
}

const DOTS = 5;

/**
 * CR-149 (P1-8): class co-op weekly lantern goal - "Lớp mình thắp
 * N/M đèn tuần này". Aggregate rpc only (no per-student data), goal =
 * 5 batches per member; when met every member banks the class-lantern
 * sticker once per ISO week. Renders nothing without a class.
 */
export default function ClassLanternCard({ isGuest }: ClassLanternCardProps) {
  const [data, setData] = useState<ClassLanterns | null>(null);
  const [loaded, setLoaded] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (isGuest || !configured) return;
    let cancelled = false;
    void fetchClassLanterns().then((res) => {
      if (cancelled) return;
      setData(res);
      setLoaded(true);
      // r250: claim under the SERVER's week key - a local-clock week
      // could disagree with the aggregate around the Monday boundary.
      if (res?.met) claimClassLantern(res.isoWeek);
    });
    return () => {
      cancelled = true;
    };
  }, [isGuest, configured]);

  if (isGuest || !configured) return null;
  // r251: one persistent live region - mounted (empty) while the rpc is
  // in flight and populated when `met` resolves, so screen readers
  // announce the achievement. The visible copy inside the card is
  // separate to avoid double announcements.
  const statusEl = (
    <span role="status" data-testid="class-lantern-status" className="sr-only">
      {data?.met ? 'Đạt rồi - nhận sticker Cả lớp thắp đèn!' : ''}
    </span>
  );
  if (!loaded || !data) return statusEl;

  const filled = Math.min(DOTS, Math.ceil((data.lanterns / data.goal) * DOTS));
  return (
    <>
      {statusEl}
      <div data-testid="class-lantern-card" className={`mt-3 ${CARD_DAY} text-left`}>
        <h2 className="font-display text-lg font-extrabold text-amber-800">
          <IconFlame size={18} className="mr-1.5 inline-block" /> Lớp mình thắp đèn
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {data.className} - cả lớp hoàn thành <b>{data.lanterns}/{data.goal}</b> bài luyện tuần này!
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: DOTS }, (_, i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full transition-colors ${
                  i < filled ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]' : 'bg-slate-200'
                }`}
              />
            ))}
          </span>
          {data.met && (
            <span data-testid="class-lantern-met" className="ml-1 text-sm font-extrabold text-amber-700">
              <IconParty size={16} className="mr-1 inline-block" aria-hidden /> Đạt rồi - nhận sticker Cả lớp thắp đèn!
            </span>
          )}
        </div>
      </div>
    </>
  );
}
