/**
 * CR-48 phase 5 / V7-AR: academic review queue for the V6 question bank.
 * Admins triage the 627 priority items from the bank's
 * academic-review-queue: approve (grants human examEligible signoff),
 * reject (pulls from all pools) or flag for follow-up - all through the
 * review_question RPC which enforces admin role server-side.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from '../lib/supabase/client';
import { optionLabel } from '../lib/qb/bank';
import { H2 } from '../lib/ui/tokens';
import { IconChevronLeft, IconChevronRight } from './icons';

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
  choices: unknown[] | null;
  answer: Record<string, unknown>;
  explanation_vi: string | null;
  review_status: string | null;
  passage: string | null;
  statement: string | null;
  tokens: string[] | null;
}

interface ItemStat {
  question_id: string;
  attempts: number;
  learners: number;
  facility: number | null;
}

const PAGE = 20;

export default function ReviewQueueCard() {
  const [rows, setRows] = useState<(QueueRow & { q?: QuestionRow; stats?: ItemStat; assets?: string[] })[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'flagged'>('pending');
  const [offset, setOffset] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ id: string; action: 'reject' | 'flag' } | null>(null);
  const [reason, setReason] = useState('');
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // r10: a superseded request must never write state - an out-of-order
  // response would display the old filter's rows under the new one.
  // r12: mutations compare a captured GENERATION, not the view values -
  // an A->B->A switch restores identical values, so only a monotonic
  // epoch can detect that the view was replaced meanwhile.
  const loadGenRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    const alive = () => gen === loadGenRef.current;
    const supa = await getSupabase();
    // r10: order by priority in the DB before paginating - sorting the
    // page afterwards leaves P0 items buried on later pages.
    const { data, count, error: err } = await supa
      .from('qb_review_queue')
      .select('question_id, priority, issues', { count: 'exact' })
      .eq('review_status', statusFilter)
      .order('priority')
      .order('question_id')
      .range(offset, offset + PAGE - 1);
    if (!alive()) return;
    if (err) { setError(err.message); return; }
    const items = (data ?? []) as QueueRow[];
    setTotal(count ?? items.length);
    const ids = items.map((i) => i.question_id);
    // bounded-ok: ids <= PAGE(20) tu trang queue ben tren.
    const qs = ids.length
      ? await supa
          .from('qb_questions')
          .select('id, grade, subject, question_type, prompt_text, choices, answer, explanation_vi, review_status, passage, statement, tokens')
          .in('id', ids)
      : { data: [] };
    if (!alive()) return;
    if ('error' in qs && qs.error) { setError(qs.error.message); return; }
    const qmap = new Map(((qs.data ?? []) as QuestionRow[]).map((q) => [q.id, q]));
    // CR-49: item statistics from real attempt events - admin-checked RPC
    // (external-review r5: the invoker view needed underlying table grants).
    const stats = ids.length
      ? await supa.rpc('qb_item_stats_for', { p_ids: ids })
      : { data: [], error: null };
    if (!alive()) return;
    if (stats.error) { setError(stats.error.message); return; }
    const smap = new Map(((stats.data ?? []) as ItemStat[]).map((s) => [s.question_id, s]));
    // Reviewers must see the same visuals the student sees - fetch linked
    // asset paths so image-based questions can be verified against the
    // prompt before approval (external-review r4).
    // bounded-ok: .in(question_id, ids<=20).
    const links = ids.length
      ? await supa
          .from('qb_question_assets')
          .select('question_id, sort_order, qb_assets(file_path)')
          .in('question_id', ids)
      : { data: [] };
    if (!alive()) return;
    if ('error' in links && links.error) { setError(links.error.message); return; }
    const amap = new Map<string, string[]>();
    for (const l of (links.data ?? []) as unknown as { question_id: string; qb_assets: { file_path: string } | { file_path: string }[] | null }[]) {
      const arr = amap.get(l.question_id) ?? [];
      const asset = Array.isArray(l.qb_assets) ? l.qb_assets[0] : l.qb_assets;
      if (asset?.file_path) arr.push(asset.file_path);
      amap.set(l.question_id, arr);
    }
    setRows(items.map((i) => ({ ...i, q: qmap.get(i.question_id), stats: smap.get(i.question_id), assets: amap.get(i.question_id) })));
  }, [statusFilter, offset]);

  const loadRef = useRef(load);
  loadRef.current = load;
  // r11: bumping the generation in cleanup invalidates any request still
  // in flight when this view is unmounted or replaced.
  useEffect(() => {
    setRows(null);
    void load();
    return () => { loadGenRef.current++; };
  }, [load]);

  async function act(questionId: string, action: 'approve' | 'reject' | 'flag', actReason = '') {
    const genAtStart = loadGenRef.current;
    setBusyId(questionId);
    setError(null);
    const { data, error: err } = await (await getSupabase()).rpc('review_question', {
      p_question_id: questionId,
      p_action: action,
      p_reason: actReason,
    });
    setBusyId(null);
    if (genAtStart !== loadGenRef.current) {
      setRows(null);
      void loadRef.current();
      return;
    }
    if (err) { setError(err.message); return; }
    // r8: SQL CAS returns {ok:false, stale:true, current} when another
    // reviewer already moved the row - that is NOT a success. Surface the
    // current state and reload instead of silently dropping the row.
    if (data?.stale) {
      setError(`Câu hỏi đã được xử lý bởi người khác - trạng thái hiện tại: ${data.current ?? 'không rõ'}. Danh sách đã tải lại.`);
      setConfirming(null);
      setReason('');
      setRows(null);
      void load();
      return;
    }
    // r9: only an explicit {ok:true} may transition the UI to success -
    // a null/malformed payload with no transport error is not a success.
    if (data?.ok !== true) {
      setError('Không xác nhận được kết quả duyệt. Vui lòng tải lại.');
      return;
    }
    // r12: a successful mutation invalidates every load still in flight -
    // a snapshot captured before the approval must not restore the row.
    loadGenRef.current++;
    setConfirming(null);
    setReason('');
    // r13: removing the last row of a later page leaves the offset
    // out of range - step back a page so the effect reloads real rows.
    const lastOnLaterPage = (rows?.length ?? 0) <= 1 && offset > 0;
    setRows((prev) => prev?.filter((r) => r.question_id !== questionId) ?? null);
    setTotal((t) => Math.max(0, t - 1));
    if (lastOnLaterPage) setOffset(Math.max(0, offset - PAGE));
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
              className={`rounded-full px-3 py-1 text-xs font-bold ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-sky-100 text-sky-700'}`}
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
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">{r.priority}</span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">Lớp {r.q?.grade} · {r.q?.subject} · {r.q?.question_type}</span>
              <span className="ml-auto font-mono text-[10px] text-slate-400">{r.question_id}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{r.q?.prompt_text ?? '(không tải được câu hỏi)'}</p>
            {r.q?.passage && (
              <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-slate-700 whitespace-pre-wrap">{r.q.passage}</p>
            )}
            {r.q?.statement && (
              <p className="mt-1 text-xs font-semibold text-blue-700">Nhận định: {r.q.statement}</p>
            )}
            {r.q?.tokens && r.q.tokens.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {r.q.tokens.map((t, i) => (
                  <span key={i} className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-bold text-sky-800 ring-1 ring-sky-100">{t}</span>
                ))}
              </div>
            )}
            {r.assets && r.assets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.assets.map((p) => (
                  <img key={p} src={p} alt="minh họa câu hỏi" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                ))}
              </div>
            )}
            {typeof r.q?.answer?.text === 'string' && (
              <p className="mt-1 text-xs font-extrabold text-emerald-700">Đáp án: {r.q.answer.text}</p>
            )}
            {Array.isArray(r.q?.answer?.accepted) && (r.q.answer.accepted as unknown[]).length > 0 && (
              <p className="mt-0.5 text-[11px] text-emerald-600">Chấp nhận thêm: {(r.q.answer.accepted as string[]).join(', ')}</p>
            )}
            {typeof (r.q?.answer?.bool ?? r.q?.answer?.boolean) === 'boolean' && (
              <p className="mt-1 text-xs font-extrabold text-emerald-700">Đáp án: {(r.q!.answer!.bool ?? r.q!.answer!.boolean) ? 'Đúng (True)' : 'Sai (False)'}</p>
            )}
            {typeof r.q?.answer?.order === 'object' && r.q.answer.order !== null && (
              <p className="mt-1 text-xs font-extrabold text-emerald-700">Thứ tự đúng: {String(r.q.answer.order)}</p>
            )}
            {r.q?.choices && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {r.q.choices.map((c, i) => (
                  <li key={i} className={i === (r.q?.answer?.index as number) ? 'font-extrabold text-emerald-700' : ''}>
                    {String.fromCharCode(65 + i)}. {optionLabel(c)}
                  </li>
                ))}
              </ul>
            )}
            {r.q?.explanation_vi && <p className="mt-1 text-xs italic text-slate-500">{r.q.explanation_vi}</p>}
            <div className="mt-1 text-[11px] text-amber-700">⚑ {(r.issues ?? []).join(', ')}</div>
            {r.stats && (
              <div className="mt-1 text-[11px] font-bold text-slate-500">
                📊 {r.stats.attempts} lượt làm · {r.stats.learners} HS · tỉ lệ đúng{' '}
                {r.stats.facility !== null ? `${Math.round(r.stats.facility * 100)}%` : '-'}
              </div>
            )}
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
                  className="min-w-0 flex-1 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-slate-800 ring-1 ring-sky-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
          <button type="button" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE))} className="inline-flex items-center gap-1 rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700 disabled:opacity-40"><IconChevronLeft size={14} /> Trước</button>
          <span className="self-center text-xs font-bold text-slate-500">{offset + 1}-{Math.min(offset + PAGE, total)} / {total}</span>
          <button type="button" disabled={offset + PAGE >= total} onClick={() => setOffset((o) => o + PAGE)} className="inline-flex items-center gap-1 rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700 disabled:opacity-40">Sau <IconChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}
