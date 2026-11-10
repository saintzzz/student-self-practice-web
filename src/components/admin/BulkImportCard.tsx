import { useRef, useState } from 'react';
import { getSupabase } from '../../lib/supabase/client';
import { BODY, CARD_TINT_PAPER, H2 } from '../../lib/ui/tokens';

const BTN =
  'rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 text-base font-extrabold text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.15),0_3px_8px_-3px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-emerald-400';
const BTN_SECONDARY =
  'rounded-2xl bg-white px-4 py-2 text-sm font-bold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-300';
const SELECT =
  'w-full rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3 text-base font-bold text-sky-900 shadow-inner focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-300/70';

/** CR-134: school onboarding. One .xlsx/.csv upload creates the whole
 *  class roster through the same practice-admin create-account action the
 *  single-account form uses, then bulk-enrolls the new accounts into the
 *  chosen class. Failures are reported per row - no half-hidden state. */
interface Row {
  username: string;
  displayName: string;
  pin: string;
  status?: string;
  err?: string;
}

interface Props {
  classes: { id: string; name: string }[];
  onDone: () => void;
  invokeAdmin: (payload: Record<string, unknown>) => Promise<{ err: string | null; accountId?: string }>;
}

const TEMPLATE = 'username,display_name,pin\nhs001,Nguyen Van A,123456\n';

/** Minimal RFC-4180 CSV reader - quoted cells, escaped quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r' || ch === undefined) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  return rows;
}

export default function BulkImportCard({ classes, onDone, invokeAdmin }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [parseErr, setParseErr] = useState<string | null>(null);

  async function handleFile(file: File): Promise<void> {
    setParseErr(null);
    setRows([]);
    try {
      let raw: unknown[][];
      if (/\.csv$/i.test(file.name)) {
        raw = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
      } else {
        const { readSheet } = await import('read-excel-file/browser');
        raw = await readSheet(file);
      }
      const parsed: Row[] = [];
      for (const r of raw) {
        const username = String(r[0] ?? '').trim();
        const displayName = String(r[1] ?? '').trim();
        const pin = String(r[2] ?? '').trim();
        if (!username || /^username$/i.test(username)) continue; // header row
        if (!displayName) { parsed.push({ username, displayName, pin, err: 'Thiếu tên hiển thị' }); continue; }
        if (pin.length < 6) { parsed.push({ username, displayName, pin, err: 'PIN < 6 ký tự' }); continue; }
        parsed.push({ username, displayName, pin });
      }
      if (parsed.length === 0) setParseErr('File không có dòng học sinh hợp lệ.');
      setRows(parsed);
    } catch (e) {
      setParseErr(`Không đọc được file: ${e instanceof Error ? e.message : 'lỗi không rõ'}`);
    }
  }

  function downloadTemplate(): void {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mau-tai-khoan-hoc-sinh.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleImport(): Promise<void> {
    const valid = rows.filter((r) => !r.err);
    if (valid.length === 0) return;
    setBusy(true);
    setProgress(`0/${valid.length}`);
    const createdIds: string[] = [];
    const next = rows.map((r) => ({ ...r }));
    let done = 0;
    for (const row of next) {
      if (row.err) continue;
      const { err, accountId } = await invokeAdmin({
        action: 'create-account',
        username: row.username,
        displayName: row.displayName,
        pin: row.pin,
        role: 'student',
      });
      row.err = err ?? undefined;
      row.status = err ? 'Lỗi' : 'Đã tạo';
      if (!err && accountId) createdIds.push(accountId);
      setProgress(`${++done}/${valid.length}`);
      setRows([...next]);
    }
    // Enroll every successfully created account into the chosen class.
    let enrollErr: string | null = null;
    if (classId && createdIds.length > 0) {
      const { error } = await (await getSupabase()).from('enrollments').insert(
        createdIds.map((id) => ({ class_id: classId, student_id: id })),
      );
      enrollErr = error?.message ?? null;
    }
    const ok = next.filter((r) => r.status === 'Đã tạo').length;
    const bad = next.filter((r) => r.err).length;
    setProgress(`Xong: ${ok} tài khoản${classId ? `, gán lớp ${enrollErr ? 'LỖI - ' + enrollErr : 'OK'}` : ''}${bad ? `, ${bad} dòng lỗi` : ''}`);
    setBusy(false);
    onDone();
  }

  return (
    <div className={`mb-6 ${CARD_TINT_PAPER.sky}`} data-testid="bulk-import-card">
      <h3 className={`mb-3 ${H2}`}>Nhập hàng loạt (một lớp)</h3>
      <p className={`mb-3 ${BODY} text-sky-700`}>
        File .xlsx hoặc .csv với 3 cột: <b>username, display_name, pin</b>. Có thể gán luôn vào lớp sau khi tạo.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label htmlFor="bulk-file" className="sr-only">Chọn file danh sách học sinh</label>
        <input
          ref={fileRef}
          id="bulk-file"
          data-testid="bulk-file"
          type="file"
          accept=".xlsx,.csv"
          className={`${BODY} file:mr-3 file:rounded-xl file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:font-bold file:text-white`}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          disabled={busy}
        />
        <button type="button" className={BTN_SECONDARY} onClick={downloadTemplate} disabled={busy}>
          Tải template
        </button>
        <label htmlFor="bulk-class" className="sr-only">Gán vào lớp</label>
        <select id="bulk-class" data-testid="bulk-class" className={SELECT} style={{ maxWidth: 260 }} value={classId} onChange={(e) => setClassId(e.target.value)} disabled={busy}>
          <option value="">- Không gán lớp -</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {parseErr && <p className="mb-3 text-sm font-bold text-rose-600">{parseErr}</p>}
      {rows.length > 0 && (
        <>
          <ul data-testid="bulk-preview" className="mb-3 max-h-56 overflow-auto rounded-2xl bg-white p-3 ring-1 ring-sky-100">
            {rows.map((r, i) => (
              <li key={`${r.username}-${i}`} className="flex flex-wrap items-center gap-2 border-b border-sky-50 py-1.5 text-sm last:border-0">
                <span className="font-bold text-sky-900">@{r.username}</span>
                <span className="text-sky-700">{r.displayName}</span>
                <span className="text-sky-400">PIN {'•'.repeat(r.pin.length)}</span>
                {r.err && <span className="ml-auto font-bold text-rose-600">{r.err}</span>}
                {r.status && <span className={`ml-auto font-bold ${r.err ? 'text-rose-600' : 'text-emerald-600'}`}>{r.status}</span>}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <button data-testid="bulk-submit" type="button" className={BTN} onClick={() => void handleImport()} disabled={busy || rows.every((r) => r.err)}>
              {busy ? 'Đang nhập...' : `Tạo ${rows.filter((r) => !r.err).length} tài khoản`}
            </button>
            {progress && <span className={`${BODY} font-bold text-sky-700`}>{progress}</span>}
          </div>
        </>
      )}
    </div>
  );
}
