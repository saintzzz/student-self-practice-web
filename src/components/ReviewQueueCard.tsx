/**
 * CR-48 phase 5 / V7-AR: academic review queue for the V6 question bank.
 * Admins triage the 627 priority items from the bank's
 * academic-review-queue: approve (grants human examEligible signoff),
 * reject (pulls from all pools) or flag for follow-up - all through the
 * review_question RPC which enforces admin role server-side.
 */
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase/client';
import { H2 } from '../lib/ui/tokens';

interface QueueRow {
  question_id: string;
  priority: string;
  issues: string[];
}
interface QuestionRow {
  id: string;
  grade: number;
  subject: string;
  question_type: string;
  prompt_text: string;
  choices: string[] | null;
  answer: Record<string, unknown>;
  explanation_vi: string | null;
  review_status: string | null;
}

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3'];
const PAGE = 20;

export default function ReviewQueueCard() {
  const [rows, setRows] = useState<(QueueRow & { q?: QuestionRow })[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'flagged'>('pending');
  const [offset, setOffset] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ id: string; action: 'reject' | 'flag' } | null>(null);
  const [reason, setReason] = useState('');
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supa = await getSupabase();
    const { data, count, error: err } = await supa
      .from('qb_review_queue')
      .select('question_id, priority, issues', { count: 'exact' })
      .eq('review_status', statusFilter)
      .order('question_id')
      .range(offset, offset + PAGE - 1);
    if (err) { setError(err.message); return; }
    const items = (data ?? []) as QueueRow[];
    setTotal(count ?? items.length);
    items.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
    const ids = items.map((i) => i.question_id);
    const qs = ids.length
      ? await supa
          .from('qb_questions')
          .select('id, grade, subject, question_type, prompt_text, choices, answer, explanation_vi, review_status')
          .in('id', ids)
      : { data: [] };
    const qmap = new Map(((qs.data ?? []) as QuestionRow[]).map((q) => [q.id, q]));
    setRows(items.map((i) => ({ ...i, q: qmap.get(i.question_id) })));
  }, [statusFilter, offset]);

  useEffect(() => { setRows(null); void load(); }, [load]);

  async function act(questionId: string, action: 'approve' | 'reject' | 'flag', actReason = '') {
    setBusyId(questionId);
    setError(null);
    const { error: err } = await (await getSupabase()).rpc('review_question', {
      p_question_id: questionId,
      p_action: action,
      p_reason: actReason,
    });
    setBusyId(null);
    if (err) { setError(err.message); return; }
    setConfirming(null);
    setReason('');
    setRows((prev) => prev?.filter((r) => r.question_id !== questionId) ?? null);
    setTotal((t) => Math.max(0, t - 1));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className={H2}>Duyệt câu hỏi ({total})</h2>
        <div className="ml-auto flex gap-1">
          {(['pending', 'approved', 'rejected', 'flagged'] as const).map((s) => (
            <button
              key={s}
              type="button"
              data-testid={`review-filter-${s}`}
              onClick={() => { setStatusFilter(s); setOffset(0); }}
              className={`rounded-full px-3 py-1 text-xs font-bold ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-sky-100 text-sky-700'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="mb-3 rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">{error}</div>}
      {rows === null && <p className="text-sm font-semibold text-sky-700">Đang tải...</p>}
      {rows?.length === 0 && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Hàng đợi trống - không còn câu cần duyệt.</p>}
      <div className="space-y-3">
        {rows?.map((r) => (
          <div key={r.question_id} data-testid={`review-item-${r.question_id}`} className="rounded-2xl bg-white p-4 ring-1 ring-sky-100">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">{r.priority}</span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">Lớp {r.q?.grade} · {r.q?.subject} · {r.q?.question_type}</span>
              <span className="ml-auto font-mono text-[10px] text-slate-400">{r.question_id}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{r.q?.prompt_text ?? '(không tải được câu hỏi)'}</p>
            {r.q?.choices && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {r.q.choices.map((c, i) => (
                  <li key={i} className={i === (r.q?.answer?.index as number) ? 'font-extrabold text-emerald-700' : ''}>
                    {String.fromCharCode(65 + i)}. {String(c)}
                  </li>
                ))}
              </ul>
            )}
            {r.q?.explanation_vi && <p className="mt-1 text-xs italic text-slate-500">{r.q.explanation_vi}</p>}
            <div className="mt-1 text-[11px] text-amber-700">⚑ {(r.issues ?? []).join(', ')}</div>
            {statusFilter === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  data-testid={`review-approve-${r.question_id}`}
                  disabled={busyId === r.question_id}
                  onClick={() => void act(r.question_id, 'approve')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  ✓ Duyệt (cho phép thi thật)
                </button>
                <button
                  type="button"
                  data-testid={`review-reject-${r.question_id}`}
                  disabled={busyId === r.question_id}
                  onClick={() => { setConfirming({ id: r.question_id, action: 'reject' }); setReason(''); }}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-rose-500 disabled:opacity-50"
                >
                  ✗ Từ chối
                </button>
                <button
                  type="button"
                  data-testid={`review-flag-${r.question_id}`}
                  disabled={busyId === r.question_id}
                  onClick={() => { setConfirming({ id: r.question_id, action: 'flag' }); setReason(''); }}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-amber-400 disabled:opacity-50"
                >
                  ⚑ Gắn cờ
                </button>
              </div>
            )}
            {confirming?.id === r.question_id && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  data-testid={`review-reason-${r.question_id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Lý do (bắt buộc)"
                  className="min-w-0 flex-1 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-slate-800 ring-1 ring-sky-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  data-testid={`review-confirm-${r.question_id}`}
                  disabled={busyId === r.question_id || reason.trim() === ''}
                  onClick={() => void act(r.question_id, confirming.action, reason)}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-slate-600 disabled:opacity-50"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirming(null); setReason(''); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Huỷ
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {total > PAGE && (
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE))} className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700 disabled:opacity-40">← Trước</button>
          <span className="self-center text-xs font-bold text-slate-500">{offset + 1}-{Math.min(offset + PAGE, total)} / {total}</span>
          <button type="button" disabled={offset + PAGE >= total} onClick={() => setOffset((o) => o + PAGE)} className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700 disabled:opacity-40">Sau →</button>
        </div>
      )}
    </div>
  );
}
