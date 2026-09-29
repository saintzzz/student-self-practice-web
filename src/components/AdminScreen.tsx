import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase/client';
import type { PracticeAccount } from '../lib/auth/practiceAuth';
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
  'w-full rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3 text-base font-bold text-sky-900 placeholder:font-normal placeholder:text-sky-400 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-200';
const BTN =
  'rounded-2xl bg-emerald-500 px-5 py-3 text-base font-extrabold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:opacity-60 motion-reduce:transition-none focus:outline-none focus:ring-4 focus:ring-emerald-400';
const BTN_SECONDARY =
  'rounded-2xl bg-white px-4 py-2 text-sm font-bold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-300';
const BTN_DANGER =
  'rounded-2xl bg-white px-4 py-2 text-sm font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-300';

type Tab = 'accounts' | 'classes' | 'enroll' | 'scope';

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

  const say = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const refresh = useCallback(async () => {
    const supa = await getSupabase();
    const [a, c] = await Promise.all([
      supa.from('accounts').select('id, username, display_name, role').order('username'),
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
        <span className={`ml-auto ${CHIP_SKY}`}>{account.display_name}</span>
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
                ? 'rounded-full bg-indigo-600 px-5 py-2 text-base font-bold text-white shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-300'
                : `${CHIP_SKY} cursor-pointer`
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
                className="flex flex-wrap items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100"
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
                className="flex flex-wrap items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100"
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
                    className={`min-h-[76px] rounded-3xl border-4 p-4 text-left font-display text-xl font-bold shadow-sm transition active:scale-95 motion-reduce:transition-none focus:outline-none focus:ring-4 ${
                      isOn
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 focus:ring-emerald-300'
                        : 'border-slate-200 bg-white text-slate-500 focus:ring-sky-300'
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
    </div>
  );
}
