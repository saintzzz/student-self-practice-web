import { useCallback, useEffect, useState } from 'react';
import { assignmentInbox, type InboxItem } from '../lib/assignments';
import { CARD, CARD_DAY } from '../lib/ui/tokens';
import { IconMail } from './icons';

const STATE_LABEL: Record<InboxItem['state'], string> = {
  upcoming: 'Sắp mở',
  open: 'Làm bài',
  in_progress: 'Làm tiếp',
  'late-open': 'Làm muộn',
  done: 'Đã nộp',
  closed: 'Đã đóng',
};

const STATE_CLS: Record<InboxItem['state'], string> = {
  upcoming: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
  open: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40',
  in_progress: 'bg-amber-500/20 text-amber-300 ring-amber-500/40',
  'late-open': 'bg-rose-500/20 text-rose-300 ring-rose-500/40',
  done: 'bg-sky-500/20 text-sky-300 ring-sky-500/40',
  closed: 'bg-slate-600/20 text-slate-400 ring-slate-600/40',
};

/* CR-116: day twins - deeper text on tinted light surfaces. */
const STATE_CLS_DAY: Record<InboxItem['state'], string> = {
  upcoming: 'bg-slate-100 text-slate-600 ring-slate-300',
  open: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
  in_progress: 'bg-amber-100 text-amber-700 ring-amber-300',
  'late-open': 'bg-rose-100 text-rose-700 ring-rose-300',
  done: 'bg-sky-100 text-sky-700 ring-sky-300',
  closed: 'bg-slate-100 text-slate-500 ring-slate-300',
};

function fmtDue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * CR-98: "Bài tập cô giao" - the student's assignment inbox on the
 * grade picker. Only actionable rows get a button; done rows show the
 * score the teacher sees. Guests never reach this (no enrollment).
 */
export default function AssignmentsInbox({ isGuest, onTake, error, tone = 'dark' }: {
  isGuest: boolean;
  onTake: (item: InboxItem) => void;
  /** Take-RPC failure surfaced inline next to the card. */
  error?: string | null;
  tone?: 'dark' | 'day';
}) {
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (isGuest) return;
    setLoadError(null);
    void assignmentInbox().then((r) => { setItems(r.items); setLoadError(r.error); });
  }, [isGuest]);

  useEffect(() => {
    setItems(null);
    reload();
  }, [reload]);

  const day = tone === 'day';
  const card = day ? CARD_DAY : CARD;
  const headCls = `font-display text-xl font-extrabold ${day ? 'text-amber-700' : 'text-amber-300'}`;
  if (isGuest) return null;
  // Fail-closed: a real RPC error is not "no assignments" - show a retry.
  if (loadError) {
    return (
      <div data-testid="assignments-inbox" className={`mt-4 ${card}`}>
        <h2 className={headCls}>
          <IconMail size={20} className="mr-1.5 inline-block" /> Bài tập cô giao
        </h2>
        <p data-testid="assignment-load-error" className={`mt-2 text-sm font-semibold ${day ? 'text-rose-600' : 'text-rose-300'}`}>
          Chưa tải được danh sách bài tập.
        </p>
        <button
          type="button"
          data-testid="assignment-load-retry"
          onClick={reload}
          className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-500 active:scale-95"
        >
          Thử lại
        </button>
      </div>
    );
  }
  if (!items || items.length === 0) return null;

  const actionable = (s: InboxItem['state']) => s === 'open' || s === 'in_progress' || s === 'late-open';

  return (
    <div data-testid="assignments-inbox" className={`mt-4 ${card}`}>
      <h2 className={headCls}>
        <IconMail size={20} className="mr-1.5 inline-block" /> Bài tập cô giao
      </h2>
      {error && (
        <p data-testid="assignment-error" className={`mt-2 text-sm font-semibold ${day ? 'text-rose-600' : 'text-rose-300'}`}>{error}</p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it.assignmentId}
            data-testid={`assignment-row-${it.assignmentId}`}
            className={`flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 ring-1 ${day ? 'bg-sky-50/80 ring-sky-200/80' : 'bg-white/5 ring-white/10'}`}
          >
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-extrabold ${day ? 'text-sky-950' : 'text-white'}`}>{it.title}</p>
              <p className={`text-xs font-semibold ${day ? 'text-slate-500' : 'text-slate-400'}`}>
                {it.className} · hạn {fmtDue(it.dueAt)}
                {it.state === 'done' && it.score !== null && ` · ${it.score}/${it.total ?? 0} điểm`}
                {it.late === true && ' · nộp muộn'}
              </p>
            </div>
            {actionable(it.state) ? (
              <button
                type="button"
                data-testid={`assignment-take-${it.assignmentId}`}
                onClick={() => onTake(it)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-emerald-500 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {STATE_LABEL[it.state]}
              </button>
            ) : (
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${(day ? STATE_CLS_DAY : STATE_CLS)[it.state]}`}>
                {STATE_LABEL[it.state]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
