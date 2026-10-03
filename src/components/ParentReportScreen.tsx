import { useEffect, useState } from 'react';
import { getDueReviewItems, getReportSnapshot, getState, STICKERS } from '../lib/engagement/store';
import { SKILL_LABELS } from '../lib/engagement/skills';
import { fetchParentContact, isValidParentEmail, saveParentContact } from '../lib/parentContact';
import { CARD, NAV_PILL, SCREEN_ENTER } from '../lib/ui/tokens';
import type { Grade } from '../types';

interface ParentReportScreenProps {
  grades: readonly Grade[];
  onBack: () => void;
  /** CR-31: parent email section only exists for logged-in students. */
  isLoggedIn?: boolean;
}

const DAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function dayLabel(iso: string): string {
  return DAY_LABEL[new Date(`${iso}T00:00:00`).getDay()];
}

function accuracyColor(accuracy: number): string {
  if (accuracy >= 0.8) return 'bg-emerald-400';
  if (accuracy >= 0.5) return 'bg-amber-400';
  return 'bg-rose-400';
}

/**
 * CR-29: "Báo cáo cho ba mẹ" - read-only progress dashboard built from
 * the local engagement store (guest-safe). Shows 7-day activity,
 * per-grade progress, weakest-first skill breakdown, review queue.
 */
export default function ParentReportScreen({ grades, onBack, isLoggedIn = false }: ParentReportScreenProps) {
  const [report] = useState(() => getReportSnapshot());
  const engagement = getState();
  const [parentEmail, setParentEmail] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [emailSaved, setEmailSaved] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    void fetchParentContact().then((contact) => {
      if (!cancelled && contact) {
        setParentEmail(contact.email);
        setEmailOptIn(contact.opted_in);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  async function handleSaveEmail(): Promise<void> {
    if (!isValidParentEmail(parentEmail)) {
      setEmailSaved('error');
      return;
    }
    const ok = await saveParentContact(parentEmail, emailOptIn);
    setEmailSaved(ok ? 'saved' : 'error');
  }
  const totalAnswered = report.days.reduce((sum, d) => sum + d.total, 0);
  const maxDay = Math.max(1, ...report.days.map((d) => d.total));

  return (
    <div className={`mx-auto max-w-2xl px-4 py-6 sm:py-10 ${SCREEN_ENTER}`}>
      <div className={`${CARD} text-left`}>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold text-amber-300">📊 Báo cáo cho ba mẹ</h1>
          <button type="button" data-testid="report-back" onClick={onBack} className={NAV_PILL}>
            ← Quay lại
          </button>
        </div>

        {/* Tổng quan */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[#16232e] p-3 text-center ring-1 ring-white/10">
            <div className="text-2xl font-extrabold text-orange-300">🔥 {engagement.streak.count}</div>
            <div className="text-xs font-bold text-slate-400">ngày liên tiếp</div>
          </div>
          <div className="rounded-2xl bg-[#16232e] p-3 text-center ring-1 ring-white/10">
            <div className="text-2xl font-extrabold text-amber-300">⭐ {engagement.totalStars}</div>
            <div className="text-xs font-bold text-slate-400">tổng sao</div>
          </div>
          <div className="rounded-2xl bg-[#16232e] p-3 text-center ring-1 ring-white/10">
            <div className="text-2xl font-extrabold text-sky-300">{totalAnswered}</div>
            <div className="text-xs font-bold text-slate-400">câu 7 ngày qua</div>
          </div>
        </div>

        {/* Huy hiệu đã mở */}
        <div data-testid="report-badges" className="mt-3 flex flex-wrap gap-2">
          {engagement.stickerIds.length === 0 ? (
            <span className="text-xs font-semibold text-slate-400">Chưa có huy hiệu - hoàn thành bài luyện để mở nhé!</span>
          ) : (
            engagement.stickerIds.map((id) => {
              const sticker = STICKERS.find((s) => s.id === id);
              return sticker ? (
                <span key={id} className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-200 ring-1 ring-amber-400/40">
                  {sticker.emoji} {sticker.nameVi}
                </span>
              ) : null;
            })
          )}
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Số liệu được lưu trên thiết bị này - chưa đồng bộ giữa các máy.
        </p>

        {/* 7 ngày qua */}
        <h2 className="mt-6 font-display text-lg font-extrabold text-white">7 ngày qua</h2>
        {totalAnswered === 0 ? (
          <p data-testid="report-empty-week" className="mt-2 text-sm font-semibold text-slate-400">
            Chưa có hoạt động nào tuần này - bé hãy bắt đầu luyện nhé!
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {report.days.map((d) => (
              <li key={d.dateISO} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-extrabold text-slate-400">
                  {dayLabel(d.dateISO)} {d.dateISO.slice(5)}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    data-testid={`report-day-${d.dateISO}`}
                    className="h-full rounded-full bg-sky-400 transition-all motion-reduce:transition-none"
                    style={{ width: `${(d.total / maxDay) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-300">
                  {d.correct}/{d.total} đúng
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Theo lớp */}
        <h2 className="mt-6 font-display text-lg font-extrabold text-white">Theo lớp</h2>
        <ul className="mt-2 space-y-2">
          {grades.map((grade) => {
            const gp = engagement.grades[grade.id];
            const skills = report.skills[grade.id] ?? [];
            const due = getDueReviewItems(grade.id).length;
            if (!gp && skills.length === 0) return null;
            return (
              <li key={grade.id} data-testid={`report-grade-${grade.id}`} className="rounded-2xl bg-[#16232e] p-3 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white">{grade.name}</span>
                  <span className="text-sm font-bold text-amber-300">
                    ⭐ {gp?.stars ?? 0} - {gp?.batchesCompleted ?? 0} bài luyện
                  </span>
                </div>
                {due > 0 && (
                  <p className="mt-1 text-xs font-bold text-amber-200">
                    📚 {due} câu đang chờ ôn lại
                  </p>
                )}
                {skills.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {skills.map((skill) => (
                      <li key={skill.key} className="flex items-center gap-2">
                        <span className="w-28 shrink-0 truncate text-xs font-bold text-slate-300">
                          {SKILL_LABELS[skill.key] ?? skill.key}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            data-testid={`report-skill-${grade.id}-${skill.key}`}
                            className={`h-full rounded-full ${accuracyColor(skill.accuracy)} transition-all motion-reduce:transition-none`}
                            style={{ width: `${Math.round(skill.accuracy * 100)}%` }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-400">
                          {Math.round(skill.accuracy * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        {Object.keys(report.skills).length === 0 && (
          <p className="mt-2 text-sm font-semibold text-slate-400">
            Chưa có dữ liệu kỹ năng - sẽ hiện sau khi bé làm bài.
          </p>
        )}

        {/* CR-31: weekly parent report email - logged-in only. */}
        {isLoggedIn && (
          <div data-testid="parent-email-section" className="mt-5 rounded-2xl bg-[#16232e] p-4 ring-1 ring-white/10">
            <h2 className="font-display text-lg font-extrabold text-sky-300">✉️ Nhận báo cáo qua email</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Mỗi Chủ nhật, ba mẹ nhận email tóm tắt bé luyện gì trong tuần.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="email"
                data-testid="parent-email-input"
                value={parentEmail}
                onChange={(e) => {
                  setParentEmail(e.target.value);
                  setEmailSaved('idle');
                }}
                placeholder="email-cua-ba-me@example.com"
                className="min-w-0 flex-1 rounded-xl bg-[#0e1a24] px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/15 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                type="button"
                data-testid="parent-email-save"
                onClick={() => void handleSaveEmail()}
                className="shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-sky-500 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Lưu
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <input
                type="checkbox"
                data-testid="parent-email-optin"
                checked={emailOptIn}
                onChange={(e) => setEmailOptIn(e.target.checked)}
                className="h-4 w-4 accent-sky-500"
              />
              Nhận báo cáo mỗi tuần
            </label>
            {emailSaved === 'saved' && (
              <p data-testid="parent-email-saved" className="mt-2 text-sm font-bold text-emerald-400">
                Đã lưu! Ba mẹ sẽ nhận báo cáo vào Chủ nhật.
              </p>
            )}
            {emailSaved === 'error' && (
              <p data-testid="parent-email-error" className="mt-2 text-sm font-bold text-rose-400">
                Email chưa đúng định dạng - ba mẹ kiểm tra lại nhé.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
