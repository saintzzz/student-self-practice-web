import { useCallback, useEffect, useState } from 'react';
import { assignmentInbox, type InboxItem } from '../lib/assignments';
import { CARD } from '../lib/ui/tokens';
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

function fmtDue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * CR-98: "Bài tập cô giao" - the student's assignment inbox on the
 * grade picker. Only actionable rows get a button; done rows show the
 * score the teacher sees. Guests never reach this (no enrollment).
 */
export default function AssignmentsInbox({ isGuest, onTake, error }: {
  isGuest: boolean;
  onTake: (item: InboxItem) => void;
  /** Take-RPC failure surfaced inline next to the card. */
  error?: string | null;
}) {
  const [items, setItems] = useState<InboxItem[] | null>(null);

  const reload = useCallback(() => {
    if (isGuest) return;
    void assignmentInbox().then(setItems);
  }, [isGuest]);

  useEffect(() => {
    setItems(null);
    reload();
  }, [reload]);

  if (isGuest || !items || items.length === 0) return null;

  const actionable = (s: InboxItem['state']) => s === 'open' || s === 'in_progress' || s === 'late-open';

  return (
    <div data-testid="assignments-inbox" className={`mt-4 ${CARD}`}>
      <h2 className="font-display text-xl font-extrabold text-amber-300">
        <IconMail size={20} className="mr-1.5 inline-block" /> Bài tập cô giao
      </h2>
      {error && (
        <p data-testid="assignment-error" className="mt-2 text-sm font-semibold text-rose-300">{error}</p>
      )}
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it.assignmentId}
            data-testid={`assignment-row-${it.assignmentId}`}
            className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-white">{it.title}</p>
              <p className="text-xs font-semibold text-slate-400">
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
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${STATE_CLS[it.state]}`}>
                {STATE_LABEL[it.state]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
