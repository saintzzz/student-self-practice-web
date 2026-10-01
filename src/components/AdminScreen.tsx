import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase/client';
import type { PracticeAccount } from '../lib/auth/practiceAuth';
import { fetchRecentResults, type ResultWithStudent } from '../lib/practiceResults';
import { GRADES } from '../data/vocabulary';
import {
  BODY,
  CARD,
  CARD_TINT,
  CHIP_SKY,
  H1,
  H2,
  NAV_PILL,
  SCREEN_ENTER,
} from '../lib/ui/tokens';

const INPUT =
  'w-full rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3 text-base font-bold text-sky-900 shadow-inner transition placeholder:font-normal placeholder:text-sky-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-300/70';
const BTN =
  'rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 text-base font-extrabold text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.15),0_3px_8px_-3px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 focus:ring-emerald-400';
const BTN_SECONDARY =
  'rounded-2xl bg-white px-4 py-2 text-sm font-bold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-300';
const BTN_DANGER =
  'rounded-2xl bg-white px-4 py-2 text-sm font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-300';

type Tab = 'accounts' | 'classes' | 'enroll' | 'scope' | 'progress';

interface PracticeClass {
  id: string;
  name: string;
  grade_id: string;
  school_year: string | null;
}

interface AdminScreenProps {
  account: PracticeAccount;
  onSignOut: () => void;
  /** Preview the practice flow (all grades) without leaving admin. */
  onPractice?: () => void;
}

export default function AdminScreen({ account, onSignOut, onPractice }: AdminScreenProps) {
  const [tab, setTab] = useState<Tab>('accounts');
  const [toast, setToast] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PracticeAccount[]>([]);
  const [classes, setClasses] = useState<PracticeClass[]>([]);
  const [enrolled, setEnrolled] = useState<Record<string, string[]>>({});
  const [scopes, setScopes] = useState<Record<string, string[]>>({});
  const [enrollClassId, setEnrollClassId] = useState('');
  const [scopeClassId, setScopeClassId] = useState('');

  const [newUser, setNewUser] = useState({ username: '', displayName: '', pin: '' });
  const [newClass, setNewClass] = useState({ name: '', gradeId: 'grade-2', schoolYear: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultWithStudent[] | null>(null);

  useEffect(() => {
    if (tab !== 'progress' || results !== null) return;
    void fetchRecentResults().then(setResults);
  }, [tab, results]);

  const say = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const refresh = useCallback(async () => {
    const supa = await getSupabase();
    const [a, c] = await Promise.all([
      supa.from('accounts').select('id, username, display_name, role, placement_grade').order('username'),
      supa.from('classes').select('id, name, grade_id, school_year').order('name'),
    ]);
    setAccounts((a.data as PracticeAccount[]) ?? []);
    setClasses((c.data as PracticeClass[]) ?? []);
    const [e, s] = await Promise.all([
      supa.from('enrollments').select('class_id, student_id'),
      supa.from('class_grade_scopes').select('class_id, grade_id'),
    ]);
    const emap: Record<string, string[]> = {};
    for (const r of e.data ?? []) {
      (emap[r.class_id] ??= []).push(r.student_id);
    }
    setEnrolled(emap);
    const smap: Record<string, string[]> = {};
    for (const r of s.data ?? []) {
      (smap[r.class_id] ??= []).push(r.grade_id);
    }
    setScopes(smap);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function invokeAdmin(payload: Record<string, unknown>): Promise<string | null> {
    const { data, error } = await (await getSupabase()).functions.invoke('practice-admin', { body: payload });
    if (error) return data?.error ?? error.message;
    if (data?.error) return data.error;
    return null;
  }

  async function handleCreateAccount(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await invokeAdmin({
      action: 'create-account',
      username: newUser.username,
      displayName: newUser.displayName,
      pin: newUser.pin,
      role: 'student',
    });
    setBusy(false);
    if (err) return setError(err);
    setNewUser({ username: '', displayName: '', pin: '' });
    say(`Đã tạo tài khoản ${newUser.username}`);
    void refresh();
  }

  async function handleResetPin(acc: PracticeAccount): Promise<void> {
    const pin = window.prompt(`Mã PIN mới cho ${acc.username} (tối thiểu 6 ký tự):`);
    if (!pin) return;
    const err = await invokeAdmin({ action: 'reset-pin', accountId: acc.id, pin });
    if (err) return setError(err);
    say(`Đã đổi PIN cho ${acc.username}`);
  }

  async function handleDeleteAccount(acc: PracticeAccount): Promise<void> {
    if (!window.confirm(`Xóa tài khoản ${acc.username}?`)) return;
    const err = await invokeAdmin({ action: 'delete-account', accountId: acc.id });
    if (err) return setError(err);
    say(`Đã xóa ${acc.username}`);
    void refresh();
  }

  async function handleCreateClass(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await (await getSupabase()).from('classes').insert({
      name: newClass.name.trim(),
      grade_id: newClass.gradeId,
      school_year: newClass.schoolYear.trim() || null,
      created_by: account.id,
    });
    setBusy(false);
    if (err) return setError('Lớp đã tồn tại hoặc dữ liệu chưa hợp lệ.');
    setNewClass({ name: '', gradeId: 'grade-2', schoolYear: '' });
    say(`Đã tạo lớp ${newClass.name}`);
    void refresh();
  }

  async function handleDeleteClass(cls: PracticeClass): Promise<void> {
    if (!window.confirm(`Xóa lớp ${cls.name}?`)) return;
    await (await getSupabase()).from('classes').delete().eq('id', cls.id);
    say(`Đã xóa lớp ${cls.name}`);
    void refresh();
  }

  async function toggleEnroll(classId: string, studentId: string, isIn: boolean): Promise<void> {
    const supa = await getSupabase();
    if (isIn) {
      await supa.from('enrollments').delete().eq('class_id', classId).eq('student_id', studentId);
    } else {
      await supa.from('enrollments').insert({ class_id: classId, student_id: studentId });
    }
    void refresh();
  }

  async function toggleScope(classId: string, gradeId: string, isOn: boolean): Promise<void> {
    const supa = await getSupabase();
    if (isOn) {
      await supa.from('class_grade_scopes').delete().eq('class_id', classId).eq('grade_id', gradeId);
    } else {
      await supa.from('class_grade_scopes').insert({ class_id: classId, grade_id: gradeId });
    }
    void refresh();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'accounts', label: 'Tài khoản' },
    { id: 'classes', label: 'Lớp học' },
    { id: 'enroll', label: 'Gán học sinh' },
    { id: 'scope', label: 'Nội dung' },
    { id: 'progress', label: 'Tiến độ' },
  ];
  const students = accounts.filter((a) => a.role === 'student');

  return (
    <div className={`mx-auto max-w-3xl px-4 py-6 ${SCREEN_ENTER}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onSignOut} data-testid="admin-signout" className={NAV_PILL}>
          Thoát
        </button>
        {onPractice && (
          <button type="button" onClick={onPractice} data-testid="admin-practice" className={NAV_PILL}>
            Luyện thử
          </button>
        )}
        <h1 className={H1}>Quản trị</h1>
        {/* CR-12 DS-X5: gold role badge for the admin identity chip. */}
        <span
          className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-gradient-to-b from-amber-100 to-amber-200 px-3 py-1 text-sm font-bold text-amber-900 shadow-md ring-1 ring-amber-300/80"
        >
          <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-xs">👑</span>
          {account.display_name}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={`admin-tab-${t.id}`}
            onClick={() => { setTab(t.id); setError(null); }}
            className={
              tab === t.id
                ? 'rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600 px-5 py-2 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_10px_-3px_rgba(79,70,229,0.5)] transition focus:outline-none focus:ring-4 focus:ring-indigo-300'
                : `${CHIP_SKY} cursor-pointer transition hover:bg-sky-100`
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {toast && (
        <div data-testid="admin-toast" className={`mb-4 ${CARD_TINT.emerald} py-3 text-center font-bold`}>
          {toast}
        </div>
      )}
      {error && (
        <div data-testid="admin-error" className={`mb-4 ${CARD_TINT.rose} py-3 text-center font-bold`}>
          {error}
        </div>
      )}

      {tab === 'accounts' && (
        <div className={CARD}>
          <h2 className={`mb-4 ${H2}`}>Tài khoản</h2>
          <form data-testid="account-create-form" onSubmit={handleCreateAccount} className="mb-6 grid gap-3 sm:grid-cols-4">
            <input
              data-testid="account-username"
              className={INPUT}
              placeholder="tên đăng nhập"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
            <input
              data-testid="account-displayname"
              className={INPUT}
              placeholder="tên hiển thị"
              value={newUser.displayName}
              onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
            />
            <input
              data-testid="account-pin"
              className={INPUT}
              placeholder="PIN (>=6 số)"
              inputMode="numeric"
              value={newUser.pin}
              onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
            />
            <button data-testid="account-create-submit" className={BTN} disabled={busy} type="submit">
              Tạo tài khoản
            </button>
          </form>
          <ul data-testid="account-list" className="flex flex-col gap-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                data-testid={`account-row-${a.username}`}
                className="flex flex-wrap items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-50 to-white px-4 py-3 shadow-sm ring-1 ring-sky-100 transition hover:bg-sky-100/60 hover:shadow-md hover:ring-sky-200"
              >
                <span className={`${BODY} font-bold`}>{a.display_name}</span>
                <span className="text-sm text-sky-600">@{a.username}</span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                  {a.role === 'admin' ? 'Quản trị' : 'Học sinh'}
                </span>
                <span className="ml-auto flex gap-2">
                  <button type="button" className={BTN_SECONDARY} onClick={() => handleResetPin(a)}>
                    Đổi PIN
                  </button>
                  <button type="button" className={BTN_DANGER} onClick={() => handleDeleteAccount(a)}>
                    Xóa
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'classes' && (
        <div className={CARD}>
          <h2 className={`mb-4 ${H2}`}>Lớp học</h2>
          <form data-testid="class-create-form" onSubmit={handleCreateClass} className="mb-6 grid gap-3 sm:grid-cols-4">
            <input
              data-testid="class-name"
              className={INPUT}
              placeholder="tên lớp (vd: 3A1)"
              value={newClass.name}
              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
            />
            <select
              data-testid="class-grade"
              className={INPUT}
              value={newClass.gradeId}
              onChange={(e) => setNewClass({ ...newClass, gradeId: e.target.value })}
            >
              {GRADES.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <input
              data-testid="class-year"
              className={INPUT}
              placeholder="năm học (vd: 2026-2027)"
              value={newClass.schoolYear}
              onChange={(e) => setNewClass({ ...newClass, schoolYear: e.target.value })}
            />
            <button data-testid="class-create-submit" className={BTN} disabled={busy} type="submit">
              Tạo lớp
            </button>
          </form>
          <ul data-testid="class-list" className="flex flex-col gap-2">
            {classes.map((c) => (
              <li
                key={c.id}
                data-testid={`class-row-${c.name}`}
                className="flex flex-wrap items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-50 to-white px-4 py-3 shadow-sm ring-1 ring-sky-100 transition hover:bg-sky-100/60 hover:shadow-md hover:ring-sky-200"
              >
                <span className={`${BODY} font-bold`}>{c.name}</span>
                <span className="text-sm text-sky-600">
                  {GRADES.find((g) => g.id === c.grade_id)?.name ?? c.grade_id}
                  {c.school_year ? ` · ${c.school_year}` : ''}
                </span>
                <button type="button" className={`ml-auto ${BTN_DANGER}`} onClick={() => handleDeleteClass(c)}>
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'enroll' && (
        <div className={CARD}>
          <h2 className={`mb-4 ${H2}`}>Gán học sinh vào lớp</h2>
          <select
            data-testid="enroll-class-select"
            className={`mb-4 ${INPUT}`}
            value={enrollClassId}
            onChange={(e) => setEnrollClassId(e.target.value)}
          >
            <option value="">- chọn lớp -</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {enrollClassId && (
            <ul data-testid="enroll-student-list" className="flex flex-col gap-2">
              {students.map((s) => {
                const isIn = (enrolled[enrollClassId] ?? []).includes(s.id);
                return (
                  <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                    <span className={`${BODY} font-bold`}>{s.display_name}</span>
                    <span className="text-sm text-sky-600">@{s.username}</span>
                    <button
                      type="button"
                      data-testid={`enroll-toggle-${s.username}`}
                      className={`ml-auto ${isIn ? BTN_SECONDARY : BTN}`}
                      onClick={() => toggleEnroll(enrollClassId, s.id, isIn)}
                    >
                      {isIn ? 'Gỡ khỏi lớp' : 'Thêm vào lớp'}
                    </button>
                  </li>
                );
              })}
              {students.length === 0 && (
                <li className="py-4 text-center text-slate-500">Chưa có học sinh nào - hãy tạo tài khoản trước.</li>
              )}
            </ul>
          )}
        </div>
      )}

      {tab === 'scope' && (
        <div className={CARD}>
          <h2 className={`mb-4 ${H2}`}>Nội dung lớp được học</h2>
          <select
            data-testid="scope-class-select"
            className={`mb-4 ${INPUT}`}
            value={scopeClassId}
            onChange={(e) => setScopeClassId(e.target.value)}
          >
            <option value="">- chọn lớp -</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {scopeClassId && (
            <div className="grid gap-3 sm:grid-cols-2">
              {GRADES.map((g) => {
                const isOn = (scopes[scopeClassId] ?? []).includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    data-testid={`scope-grade-${g.id}`}
                    onClick={() => toggleScope(scopeClassId, g.id, isOn)}
                    className={`min-h-[76px] rounded-3xl border-4 p-4 text-left font-display text-xl font-bold transition hover:-translate-y-0.5 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-none focus:ring-4 ${
                      isOn
                        ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-emerald-100/60 text-emerald-800 shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_6px_14px_-6px_rgba(5,150,105,0.4)] focus:ring-emerald-300'
                        : 'border-slate-200 bg-gradient-to-b from-white to-sky-50/70 text-slate-500 shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_4px_10px_-4px_rgba(15,23,42,0.12)] focus:ring-sky-300'
                    }`}
                  >
                    {g.name}
                    <span className="block text-sm font-normal">
                      {isOn ? 'Đang mở' : 'Chưa mở'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'progress' && (
        <div className={CARD}>
          <h2 className={`mb-4 ${H2}`}>Tiến độ học sinh</h2>
          {results !== null && (
            <WeeklyReport results={results} classes={classes} enrolled={enrolled} />
          )}
          {results === null && <p className={BODY}>Đang tải...</p>}
          {results !== null && results.length === 0 && (
            <p className={BODY} data-testid="progress-empty">
              Chưa có kết quả nào - học sinh hoàn thành bài luyện tập sẽ xuất hiện ở đây.
            </p>
          )}
          {results !== null && results.length > 0 && (
            <ProgressTable results={results} students={students} />
          )}
        </div>
      )}
    </div>
  );
}

const GRADE_NAME = new Map(GRADES.map((g) => [g.id, g.name]));

/** Tong hop ket qua theo hoc sinh - moi hoc sinh 1 dong, sap xep theo lan choi gan nhat. */
function ProgressTable({ results, students }: { results: ResultWithStudent[]; students: PracticeAccount[] }) {
  const byAccount = new Map<string, ResultWithStudent[]>();
  for (const r of results) {
    const arr = byAccount.get(r.account_id) ?? [];
    arr.push(r);
    byAccount.set(r.account_id, arr);
  }
  const nameOf = (id: string) =>
    students.find((s) => s.id === id)?.display_name ??
    results.find((r) => r.account_id === id)?.accounts?.display_name ??
    '-';
  const rows = [...byAccount.entries()]
    .map(([id, rs]) => {
      const correct = rs.reduce((s, r) => s + r.correct_count, 0);
      const total = rs.reduce((s, r) => s + r.total_questions, 0);
      const grades = [...new Set(rs.map((r) => r.grade_id))].map((g) => GRADE_NAME.get(g) ?? g);
      return { id, batches: rs.length, correct, total, pct: total ? Math.round((correct / total) * 100) : 0, last: rs[0]?.created_at, grades };
    })
    .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''));
  return (
    <div className="overflow-x-auto" data-testid="progress-table">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-sky-100 text-sky-700">
            <th className="py-2 pr-3">Học sinh</th>
            <th className="py-2 pr-3">Số bài</th>
            <th className="py-2 pr-3">Đúng</th>
            <th className="py-2 pr-3">Tỉ lệ</th>
            <th className="py-2 pr-3">Vùng đất</th>
            <th className="py-2 pr-3">Lớp gợi ý</th>
            <th className="py-2">Lần cuối</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-50">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-2 pr-3 font-bold text-sky-900">{nameOf(r.id)}</td>
              <td className="py-2 pr-3">{r.batches}</td>
              <td className="py-2 pr-3">{r.correct}/{r.total}</td>
              <td className="py-2 pr-3">
                <span className={`inline-block min-w-12 rounded-full px-2 py-0.5 text-center font-bold ${r.pct >= 80 ? 'bg-emerald-100 text-emerald-700' : r.pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                  {r.pct}%
                </span>
              </td>
              <td className="py-2 pr-3 text-xs">{r.grades.join(', ')}</td>
              <td className="py-2 pr-3 text-xs">
                {students.find((s) => s.id === r.id)?.placement_grade
                  ? (GRADE_NAME.get(students.find((s) => s.id === r.id)!.placement_grade!) ?? '-')
                  : '-'}
              </td>
              <td className="py-2 text-xs text-slate-500">
                {r.last ? new Date(r.last).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** CR-23: bao cao tuan - tong hop 7 ngay gan nhat theo lop de GV nam tien do. */
function WeeklyReport({
  results,
  classes,
  enrolled,
}: {
  results: ResultWithStudent[];
  classes: PracticeClass[];
  enrolled: Record<string, string[]>;
}) {
  const since = Date.now() - 7 * 24 * 3600 * 1000;
  const week = results.filter((r) => new Date(r.created_at).getTime() >= since);
  const active = new Set(week.map((r) => r.account_id)).size;
  const correct = week.reduce((s, r) => s + r.correct_count, 0);
  const total = week.reduce((s, r) => s + r.total_questions, 0);
  const perClass = classes.map((c) => {
    const ids = new Set(enrolled[c.id] ?? []);
    const rows = week.filter((r) => ids.has(r.account_id));
    const c2 = rows.reduce((s, r) => s + r.correct_count, 0);
    const t2 = rows.reduce((s, r) => s + r.total_questions, 0);
    return {
      name: c.name,
      sessions: rows.length,
      active: new Set(rows.map((r) => r.account_id)).size,
      students: ids.size,
      pct: t2 ? Math.round((c2 / t2) * 100) : null,
    };
  });
  return (
    <div className="mb-4 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100" data-testid="weekly-report">
      <h3 className="mb-2 text-base font-bold text-sky-900">Báo cáo tuần (7 ngày)</h3>
      <p className={`${BODY} mb-3`}>
        {week.length} lượt luyện - {active} học sinh hoạt động - tỉ lệ đúng{' '}
        {total ? Math.round((correct / total) * 100) : 0}%
      </p>
      {perClass.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {perClass.map((c) => (
            <li key={c.name} className="flex flex-wrap gap-2 text-sm">
              <span className="font-bold text-sky-900">{c.name}</span>
              <span className="text-sky-700">
                {c.sessions} lượt - {c.active}/{c.students} HS -{' '}
                {c.pct === null ? 'chưa có dữ liệu' : `${c.pct}% đúng`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
