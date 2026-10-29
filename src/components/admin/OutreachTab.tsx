/**
 * CR-109 Outreach tab: admin-only GTM pipeline surface inside
 * AdminScreen. Leads + draft queue (approve/edit/reject via RPC) +
 * pipeline counts + suppression CRUD + run stats.
 *
 * Vietnamese copy, hyphen-only. Sends never happen here - approve only
 * queues; scripts/gtm/send.mjs owns delivery.
 */
import { useCallback, useEffect, useState } from 'react';
import { CARD, CARD_TINT, H2 } from '../../lib/ui/tokens';
import {
  addSuppression, approveMessage, editDraft, fetchCampaigns, fetchDrafts,
  fetchLeads, fetchPipeline, fetchStats, fetchSuppression, rejectMessage,
  removeSuppression, setLeadStatus,
  type GtmLead, type GtmMessage, type GtmSuppression, type PipelineCounts,
} from '../../lib/gtm/client';

const INPUT =
  'w-full rounded-2xl border-2 border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900 shadow-inner transition placeholder:font-normal placeholder:text-sky-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-300/70';
const BTN_OK =
  'rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-400';
const BTN_NO =
  'rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300';
const BTN_EDIT =
  'rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300';
const CHIP =
  'rounded-full px-2.5 py-0.5 text-xs font-extrabold ring-1';

const STATUS_LABEL: Record<string, string> = {
  staged: 'Mới', dropped: 'Loại', enriched: 'Đã chấm', cold: 'Nguội',
  queued: 'Chờ gửi', sending: 'Đang gửi', sent: 'Đã gửi', replied: 'Đã trả lời',
  meeting: 'Hẹn gặp', customer: 'Khách', bounced: 'Trả về', dead: 'Chết',
  suppressed: 'Chặn',
};
const STATUS_TONE: Record<string, string> = {
  staged: 'bg-sky-100 text-sky-800 ring-sky-200',
  enriched: 'bg-sky-100 text-sky-800 ring-sky-200',
  queued: 'bg-amber-100 text-amber-800 ring-amber-200',
  sent: 'bg-blue-100 text-blue-800 ring-blue-200',
  replied: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  meeting: 'bg-emerald-200 text-emerald-900 ring-emerald-300',
  customer: 'bg-amber-200 text-amber-900 ring-amber-300',
  cold: 'bg-slate-100 text-slate-600 ring-slate-200',
  dropped: 'bg-slate-100 text-slate-500 ring-slate-200',
  bounced: 'bg-orange-100 text-orange-800 ring-orange-200',
  dead: 'bg-rose-100 text-rose-700 ring-rose-200',
  suppressed: 'bg-rose-100 text-rose-800 ring-rose-300',
  sending: 'bg-blue-50 text-blue-700 ring-blue-200',
};

type Sub = 'leads' | 'drafts' | 'pipeline' | 'suppression' | 'stats';

export default function OutreachTab({ onError }: { onError: (msg: string | null) => void }) {
  const [sub, setSub] = useState<Sub>('leads');
  const [leads, setLeads] = useState<GtmLead[]>([]);
  const [drafts, setDrafts] = useState<GtmMessage[]>([]);
  const [pipe, setPipe] = useState<PipelineCounts | null>(null);
  const [supp, setSupp] = useState<GtmSuppression[]>([]);
  const [stats, setStats] = useState<{ sent: number; replies: number; meetings: number; truncated: boolean; runs: { agent: string; stats: Record<string, unknown>; created_at: string }[] } | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [segF, setSegF] = useState('all');
  const [stF, setStF] = useState('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [suppInput, setSuppInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [l, d, p, s, st, c] = await Promise.all([
        fetchLeads({ segment: segF, status: stF }),
        fetchDrafts(), fetchPipeline(), fetchSuppression(), fetchStats(), fetchCampaigns(),
      ]);
      setLeads(l); setDrafts(d); setPipe(p); setSupp(s); setStats(st);
      setCampaigns(c.map((x) => ({ id: x.id, name: x.name })));
      setLoaded(true);
      onError(null);
    } catch (e) {
      onError(`Tiếp thị: ${(e as Error).message}`);
    }
  }, [segF, stF, onError]);

  useEffect(() => {
    setLoaded(false);
    reload().catch(() => undefined);
  }, [reload]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      onError(`Tiếp thị: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const subs: { id: Sub; label: string }[] = [
    { id: 'leads', label: `Khách tiềm năng (${leads.length})` },
    { id: 'drafts', label: `Bản nháp (${drafts.filter((d) => d.status === 'pending_review').length})` },
    { id: 'pipeline', label: 'Phễu' },
    { id: 'suppression', label: `Danh sách chặn (${supp.length})` },
    { id: 'stats', label: 'Chạy gần đây' },
  ];

  return (
    <div className={CARD} data-testid="gtm-outreach">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className={H2}>Tiếp thị B2B</h2>
        {pipe && pipe.needsHuman > 0 && (
          <span data-testid="gtm-needs-human" className={`${CHIP} bg-amber-100 text-amber-800 ring-amber-300`}>
            {pipe.needsHuman} cần xử lý
          </span>
        )}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {subs.map((s) => (
          <button
            key={s.id}
            type="button"
            data-testid={`gtm-sub-${s.id}`}
            onClick={() => setSub(s.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-sky-300 ${
              sub === s.id ? 'bg-sky-600 text-white shadow' : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {!loaded && <p className="py-8 text-center text-sm font-semibold text-sky-600">Đang tải...</p>}

      {loaded && sub === 'leads' && (
        <div>
          <div className="mb-3 flex gap-2">
            <select data-testid="gtm-seg-filter" className={`${INPUT} max-w-44`} value={segF} onChange={(e) => setSegF(e.target.value)}>
              <option value="all">Mọi phân khúc</option>
              <option value="center">Trung tâm</option>
              <option value="school">Trường học</option>
              <option value="unknown">Chưa rõ</option>
            </select>
            <select data-testid="gtm-status-filter" className={`${INPUT} max-w-44`} value={stF} onChange={(e) => setStF(e.target.value)}>
              <option value="all">Mọi trạng thái</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {leads.length === 0 ? (
            <p data-testid="gtm-leads-empty" className="rounded-2xl bg-sky-50 py-8 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-100">
              Chưa có khách tiềm năng - chạy `gtm:discover` để nạp.
            </p>
          ) : (
            <ul data-testid="gtm-lead-list" className="flex flex-col gap-2">
              {leads.map((l) => (
                <li key={l.id} data-testid={`gtm-lead-${l.id}`} className="rounded-2xl bg-gradient-to-r from-sky-50 to-white px-4 py-3 shadow-sm ring-1 ring-sky-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sky-900">{l.name}</span>
                    {l.fit != null && <span className={`${CHIP} bg-sky-100 text-sky-800 ring-sky-200`}>{l.fit}/10</span>}
                    <span className={`${CHIP} ${STATUS_TONE[l.status] ?? STATUS_TONE.staged}`}>{STATUS_LABEL[l.status] ?? l.status}</span>
                    {l.needs_human && <span className={`${CHIP} bg-amber-100 text-amber-800 ring-amber-300`}>cần xử lý</span>}
                    <span className="ml-auto flex gap-1.5">
                      {['meeting', 'customer', 'dead'].map((s) => (
                        <button
                          key={s} type="button" disabled={busy}
                          data-testid={`gtm-lead-${s}-${l.id}`}
                          onClick={() => act(() => setLeadStatus(l.id, s as GtmLead['status'], { needsHuman: false, from: l.status }))}
                          className={BTN_EDIT}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {[l.city, l.segment === 'center' ? 'trung tâm' : l.segment === 'school' ? 'trường' : '', l.contact_email, l.phone].filter(Boolean).join(' - ')}
                  </p>
                  {l.fit_reason && <p className="mt-0.5 text-xs text-slate-500">{l.fit_reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loaded && sub === 'drafts' && (
        <div>
          {drafts.length === 0 ? (
            <p data-testid="gtm-drafts-empty" className="rounded-2xl bg-sky-50 py-8 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-100">
              Không có bản nháp - chạy `gtm:draft` sau khi enrich.
            </p>
          ) : (
            <ul data-testid="gtm-draft-list" className="flex flex-col gap-3">
              {drafts.map((d) => (
                <li key={d.id} data-testid={`gtm-draft-${d.id}`} className="rounded-2xl bg-gradient-to-r from-sky-50 to-white px-4 py-3 shadow-sm ring-1 ring-sky-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sky-900">{d.leads?.name ?? d.lead_id}</span>
                    <span className={`${CHIP} ${STATUS_TONE[d.status] ?? ''}`}>{STATUS_LABEL[d.status] ?? d.status}</span>
                    {d.edited && <span className={`${CHIP} bg-sky-100 text-sky-700 ring-sky-200`}>đã sửa</span>}
                    <span className="text-xs font-semibold text-slate-500">{d.kind === 'followup' ? 'thư nhắc' : 'thư đầu'}</span>
                    <span className="ml-auto flex gap-1.5">
                      {d.status === 'pending_review' && (
                        <>
                          <button type="button" disabled={busy} data-testid={`gtm-approve-${d.id}`} className={BTN_OK} onClick={() => act(() => approveMessage(d.id))}>Duyệt</button>
                          <button type="button" disabled={busy} data-testid={`gtm-edit-${d.id}`} className={BTN_EDIT}
                            onClick={() => { setEditing(editing === d.id ? null : d.id); setEditBody(d.body); }}>
                            Sửa
                          </button>
                          <button type="button" disabled={busy} data-testid={`gtm-reject-${d.id}`} className={BTN_NO} onClick={() => act(() => rejectMessage(d.id))}>Từ chối</button>
                        </>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-700">{d.subject}</p>
                  {editing === d.id ? (
                    <div className="mt-2">
                      <textarea
                        data-testid={`gtm-edit-body-${d.id}`}
                        className={`${INPUT} min-h-40 font-mono text-xs`}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2">
                        <button type="button" disabled={busy} data-testid={`gtm-save-${d.id}`} className={BTN_OK}
                          onClick={() => act(async () => { await editDraft(d.id, editBody); setEditing(null); })}>
                          Lưu
                        </button>
                        <button type="button" data-testid={`gtm-cancel-${d.id}`} className={BTN_NO} onClick={() => setEditing(null)}>Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <pre data-testid={`gtm-body-${d.id}`} className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white/80 p-3 text-xs text-slate-600 ring-1 ring-sky-100">{d.body}</pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loaded && sub === 'pipeline' && pipe && (
        <div data-testid="gtm-pipeline" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {pipe.truncated && (
            <p className="col-span-full rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Số liệu đang hiển thị phần đầu - bộ đếm là cận dưới, tải lại trang khi dữ liệu lớn hơn.
            </p>
          )}
          {(['staged', 'enriched', 'queued', 'sent', 'replied', 'meeting', 'customer', 'dead'] as const).map((s) => (
            <div key={s} data-testid={`gtm-pipe-${s}`} className="rounded-2xl bg-sky-50 p-4 text-center ring-1 ring-sky-100">
              <p className="text-2xl font-extrabold text-sky-900">{pipe.byStatus[s] ?? 0}</p>
              <p className="text-xs font-bold text-slate-600">{STATUS_LABEL[s]}</p>
            </div>
          ))}
        </div>
      )}

      {loaded && sub === 'suppression' && (
        <div>
          <form
            className="mb-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = suppInput.trim().toLowerCase();
              if (!v) return;
              const kind = v.includes('@') ? 'email' : 'domain';
              act(() => addSuppression(v, kind)).then(() => setSuppInput(''));
            }}
          >
            <input data-testid="gtm-supp-input" className={INPUT} placeholder="email@domain.vn hoặc domain.vn" value={suppInput} onChange={(e) => setSuppInput(e.target.value)} />
            <button data-testid="gtm-supp-add" type="submit" disabled={busy || !suppInput.trim()} className={BTN_OK}>Chặn</button>
          </form>
          {supp.length === 0 ? (
            <p data-testid="gtm-supp-empty" className="rounded-2xl bg-sky-50 py-6 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-100">Danh sách chặn trống.</p>
          ) : (
            <ul data-testid="gtm-supp-list" className="flex flex-col gap-1.5">
              {supp.map((s) => (
                <li key={s.value} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-sky-100">
                  <span className="font-mono text-sm font-bold text-slate-800">{s.value}</span>
                  <span className={`${CHIP} ${s.kind === 'domain' ? 'bg-amber-100 text-amber-800 ring-amber-200' : 'bg-sky-100 text-sky-700 ring-sky-200'}`}>{s.kind}</span>
                  <span className="text-xs text-slate-500">{s.reason ?? s.source}</span>
                  <button type="button" disabled={busy} data-testid={`gtm-supp-del-${s.value}`} className={`${BTN_NO} ml-auto`} onClick={() => act(() => removeSuppression(s.value))}>Bỏ</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loaded && sub === 'stats' && stats && (
        <div>
          {stats.truncated && (
            <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
              Số liệu đang hiển thị phần đầu - bộ đếm là cận dưới, tải lại trang khi dữ liệu lớn hơn.
            </p>
          )}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div data-testid="gtm-stat-sent" className="rounded-2xl bg-sky-50 p-4 text-center ring-1 ring-sky-100"><p className="text-2xl font-extrabold text-sky-900">{stats.sent}</p><p className="text-xs font-bold text-slate-600">Đã gửi</p></div>
            <div data-testid="gtm-stat-replies" className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100"><p className="text-2xl font-extrabold text-emerald-800">{stats.replies}</p><p className="text-xs font-bold text-slate-600">Phản hồi tốt</p></div>
            <div data-testid="gtm-stat-cpl" className="rounded-2xl bg-sky-50 p-4 text-center ring-1 ring-sky-100"><p className="text-2xl font-extrabold text-sky-800">{stats.replies > 0 ? `~${Math.round(stats.sent / stats.replies)}` : '-'}</p><p className="text-xs font-bold text-slate-600">Email / phản hồi</p></div>
          </div>
          {stats.runs.length === 0 ? (
            <p data-testid="gtm-runs-empty" className="rounded-2xl bg-sky-50 py-6 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-100">Chưa có lần chạy nào.</p>
          ) : (
            <ul data-testid="gtm-run-list" className="flex flex-col gap-1.5">
              {stats.runs.map((r, i) => (
                <li key={i} className="rounded-xl bg-white px-3 py-2 ring-1 ring-sky-100">
                  <span className="text-sm font-extrabold text-sky-800">{r.agent}</span>
                  <span className="ml-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleString('vi-VN')}</span>
                  <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{JSON.stringify(r.stats)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {campaigns.length > 0 && sub === 'leads' && loaded && (
        <p className="mt-3 text-xs font-semibold text-slate-400">
          {campaigns.length} chiến dịch - mới nhất: {campaigns[0]?.name}
        </p>
      )}
      {loaded && !pipe && (
        <div className={`mt-3 ${CARD_TINT.rose} py-2 text-center text-sm font-bold`}>Không tải được số liệu phễu.</div>
      )}
    </div>
  );
}
