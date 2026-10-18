import { useEffect, useState } from 'react';
import { getDueReviewItems, getReportSnapshot, getState, STICKERS } from '../lib/engagement/store';
import { skillLabel } from '../lib/engagement/skills';
import { fetchParentContact, isValidParentEmail, requestParentVerify, saveParentContact } from '../lib/parentContact';
import { isParentVerified, ParentGate } from './ParentGate';
import {
  fetchMockTrend,
  fetchWeekMinutes,
  type MockTrendResult,
  type WeekMinutesResult,
} from '../lib/serverReport';
import { trackFunnel } from '../lib/funnel';
import { PricingCard } from './PricingCard';
import {
  SCREEN_ENTER,
  PAPER_PANEL,
  PAPER_PROGRESS_TRACK,
  PAPER_PROGRESS_FILL,
  PAPER_TREND_UP,
} from '../lib/ui/tokens';
import type { Grade } from '../types';
import { IconArrowLeft, IconBook, IconBulb, IconFlame, IconMail, IconStar, IconTrendingUp } from './icons';
import { ArtImg } from './ArtImg';

interface ParentReportScreenProps {
  grades: readonly Grade[];
  onBack: () => void;
  /** CR-31: parent email section only exists for logged-in students. */
  isLoggedIn?: boolean;
}

const DAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** kids-UX s3.7: weakest-skill list is capped at 3 - a wall of red bars
 *  overwhelms parents; the top-3 plus one concrete suggestion is the
 *  actionable slice. */
const WEAKEST_SHOWN = 3;

function dayLabel(iso: string): string {
  return DAY_LABEL[new Date(`${iso}T00:00:00`).getDay()];
}

function accuracyColor(accuracy: number): string {
  if (accuracy >= 0.8) return 'bg-emerald-400';
  if (accuracy >= 0.5) return 'bg-amber-400';
  return 'bg-rose-400';
}

/* Printed-form section header: heading + hairline rule to the right,
   like the section dividers on a school report card. */
function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`flex items-center gap-3 font-display text-lg font-extrabold text-slate-800 ${className}`}>
      <span className="shrink-0">{children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-sky-200/70" />
    </h2>
  );
}

/**
 * CR-29: "Góc ba mẹ" - read-only progress dashboard. kids-UX step 10
 * (design s3.7): converts to the light "paper" parent register, adds the
 * server-sourced sections (minutes/day, mock-score trend) for logged-in
 * accounts, caps weakest skills at 3 with a suggestion, and mounts the
 * pricing card - the parent funnel's last step.
 */
export default function ParentReportScreen({ grades, onBack, isLoggedIn = false }: ParentReportScreenProps) {
  const [report] = useState(() => getReportSnapshot());
  const engagement = getState();
  const [parentEmail, setParentEmail] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [emailSaved, setEmailSaved] = useState<'idle' | 'saved' | 'error'>('idle');
  const [emailVerified, setEmailVerified] = useState(false);
  // r8: the verify enqueue result is its own state - 'saved' only means
  // the contact wrote; a failed/throttled mail must be visible.
  const [verifyState, setVerifyState] = useState<'sent' | 'already' | 'throttled' | 'failed' | 'idle'>('idle');
  /* Server sections keep the whole result object - 'error' must render a
     retry row, not disappear into the empty state (dev-review #13). */
  const [weekResult, setWeekResult] = useState<WeekMinutesResult | null>(null);
  const [mockTrends, setMockTrends] = useState<Record<string, MockTrendResult>>({});
  const [retryTick, setRetryTick] = useState(0);
  /* External-review r1 #1: the 5-minute parent pass can expire while the
     report stays open - contact writes must re-check the live token and
     re-gate instead of silently sending verification mail. */
  const [reGateOpen, setReGateOpen] = useState(false);

  useEffect(() => {
    trackFunnel('report_view', 'parent-report');
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    void fetchParentContact().then((contact) => {
      if (!cancelled && contact) {
        setParentEmail(contact.email);
        setEmailOptIn(contact.opted_in);
        setEmailVerified(contact.verified);
      }
    });
    void fetchWeekMinutes().then((result) => {
      if (!cancelled) setWeekResult(result);
    });
    /* Dev-review #4: trend queries cover EVERY supported grade, not only
       grades with local engagement - an exam-only child has server rows
       but no engagement.grades entry. */
    for (const g of grades) {
      void fetchMockTrend(g.id).then((result) => {
        if (!cancelled) {
          setMockTrends((prev) => ({ ...prev, [g.id]: result }));
        }
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, retryTick]);

  /* Live-token re-check before any protected write - an expired pass
     re-opens the gate rather than mutating the parent contact. */
  function requireLivePass(): boolean {
    if (isParentVerified()) return true;
    setReGateOpen(true);
    return false;
  }

  async function handleSaveEmail(): Promise<void> {
    if (!requireLivePass()) return;
    if (!isValidParentEmail(parentEmail)) {
      setEmailSaved('error');
      return;
    }
    const ok = await saveParentContact(parentEmail, emailOptIn);
    if (ok) {
      // r6: the weekly report only goes to click-confirmed addresses - ask
      // the server to send the verify link right away. r8: surface every
      // outcome - a failed/throttled enqueue is not "saved".
      const verify = await requestParentVerify();
      setEmailVerified(verify === 'already');
      setVerifyState(verify);
    }
    setEmailSaved(ok ? 'saved' : 'error');
  }

  async function handleResendVerify(): Promise<void> {
    if (!requireLivePass()) return;
    const result = await requestParentVerify();
    if (result === 'already') setEmailVerified(true);
    setVerifyState(result);
  }
  const totalAnswered = report.days.reduce((sum, d) => sum + d.total, 0);
  const maxDay = Math.max(1, ...report.days.map((d) => d.total));
  const weekMinutes = weekResult?.days ?? [];
  const maxMinutes = Math.max(1, ...weekMinutes.map((d) => d.minutes));
  const serverSectionsFailed =
    weekResult?.status === 'error' ||
    Object.values(mockTrends).some((r) => r.status === 'error');

  return (
    /* kids-UX s3.7 revised: the parent corner is a light "report sheet"
       resting on the navy land shell - paper-on-desk like the exam
       surface (the old full-page sky-50 read as a different app). A slim
       brand letterhead strip marks it as an official document. */
    <div className={`min-h-screen ${SCREEN_ENTER}`}>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <div className={`${PAPER_PANEL} relative overflow-hidden bg-gradient-to-b from-white to-amber-50/40 text-left shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)]`}>
        {/* Letterhead strip - brand sky -> gold, the "printed report"
            mark at the sheet's top edge. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-500 via-sky-300 to-amber-400" />

        {/* Masthead - document title + gold seal + the Bé Heo stamp art,
            so the sheet reads as an official printed report, not a web
            card. Back pill is a paper-side control (slate ink). */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/images/mascot/be-heo-portrait.webp"
              alt=""
              aria-hidden="true"
              width={56}
              height={56}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="h-14 w-14 shrink-0 rounded-xl bg-amber-50 object-contain p-0.5 ring-1 ring-amber-200/70 shadow-sm"
            />
            <div>
              <h1 className="font-display text-2xl font-extrabold text-sky-800">Góc ba mẹ</h1>
              <p className="text-xs font-bold text-slate-500">Báo cáo học tập 7 ngày qua</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              data-testid="report-back"
              onClick={onBack}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-sky-100 px-4 py-1.5 text-sm font-extrabold text-sky-800 ring-1 ring-sky-300 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <IconArrowLeft size={18} /> Quay lại
            </button>
            <span aria-hidden="true" className="hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-400 text-amber-900 ring-2 ring-amber-500/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_3px_8px_-2px_rgba(146,64,14,0.5)] sm:flex">
              <IconStar size={16} />
            </span>
          </div>
        </div>

        {/* Tổng quan - cream depth tiles (the app's toy-material language
            scaled onto paper), not flat pastel boxes. */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gradient-to-b from-white to-orange-50 p-3 text-center ring-1 ring-orange-200/80 shadow-[inset_0_1px_0_#ffffff,0_3px_0_rgba(194,65,12,0.14)]">
            <div className="flex items-center justify-center gap-1.5 text-2xl font-extrabold text-orange-600"><IconFlame size={22} /> {engagement.streak.count}</div>
            <div className="text-xs font-bold text-slate-500">ngày liên tiếp</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-b from-white to-amber-50 p-3 text-center ring-1 ring-amber-200/80 shadow-[inset_0_1px_0_#ffffff,0_3px_0_rgba(146,64,14,0.16)]">
            <div className="flex items-center justify-center gap-1.5 text-2xl font-extrabold text-amber-600"><IconStar size={22} /> {engagement.totalStars}</div>
            <div className="text-xs font-bold text-slate-500">tổng sao</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-b from-white to-sky-50 p-3 text-center ring-1 ring-sky-200/80 shadow-[inset_0_1px_0_#ffffff,0_3px_0_rgba(3,105,161,0.14)]">
            <div className="text-2xl font-extrabold text-sky-700">{totalAnswered}</div>
            <div className="text-xs font-bold text-slate-500">câu 7 ngày qua</div>
          </div>
        </div>

        {/* Huy hiệu đã mở */}
        <div data-testid="report-badges" className="mt-3 flex flex-wrap gap-2">
          {engagement.stickerIds.length === 0 ? (
            <span className="text-xs font-semibold text-slate-500">Chưa có huy hiệu - hoàn thành bài luyện để mở nhé!</span>
          ) : (
            engagement.stickerIds.map((id) => {
              const sticker = STICKERS.find((s) => s.id === id);
              return sticker ? (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800 ring-1 ring-amber-300 shadow-[inset_0_1px_0_#ffffff,0_2px_0_rgba(146,64,14,0.18)]">
                  <ArtImg key={sticker.art} src={sticker.art} emoji={sticker.emoji} size={18} /> {sticker.nameVi}
                </span>
              ) : null;
            })
          )}
        </div>
        {/* kids-UX: the old "chỉ lưu trên máy này" line was only true for
            guests - logged-in accounts sync engagement_state server-side. */}
        <p className="mt-2 text-xs font-semibold text-slate-500">
          {isLoggedIn
            ? 'Số liệu đã đồng bộ với tài khoản của bé.'
            : 'Số liệu được lưu trên thiết bị này - đăng nhập để đồng bộ giữa các máy.'}
        </p>

        {/* 7 ngày qua */}
        <SectionTitle className="mt-7">7 ngày qua</SectionTitle>
        {totalAnswered === 0 ? (
          <p data-testid="report-empty-week" className="mt-2 text-sm font-semibold text-slate-500">
            Chưa có hoạt động nào tuần này - bé hãy bắt đầu luyện nhé!
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {report.days.map((d) => (
              <li key={d.dateISO} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-extrabold text-slate-500">
                  {dayLabel(d.dateISO)} {d.dateISO.slice(5)}
                </span>
                <div className={PAPER_PROGRESS_TRACK + ' flex-1'}>
                  <div
                    data-testid={`report-day-${d.dateISO}`}
                    className={`${PAPER_PROGRESS_FILL} transition-[width] motion-reduce:transition-none`}
                    style={{ width: `${(d.total / maxDay) * 100}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-600">
                  {d.correct}/{d.total} đúng
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* kids-UX AC-5.2: minutes/day from server time_used_sec. */}
        {isLoggedIn && weekMinutes.length > 0 && (
          <div data-testid="report-minutes" className="mt-6">
            <SectionTitle>Phút luyện mỗi ngày</SectionTitle>
            {weekResult?.truncated && (
              <p data-testid="report-minutes-truncated" className="mt-1 text-xs font-semibold text-amber-700">
                Tuần này có rất nhiều lượt làm bài - số liệu hiển thị là phần gần nhất.
              </p>
            )}
            <ul className="mt-2 space-y-1.5">
              {weekMinutes.map((d) => (
                <li key={d.date} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs font-extrabold text-slate-500">
                    {dayLabel(d.date)} {d.date.slice(5)}
                  </span>
                  <div className={PAPER_PROGRESS_TRACK + ' flex-1'}>
                    <div
                      data-testid={`report-minutes-${d.date}`}
                      className={`${PAPER_PROGRESS_FILL} transition-[width] motion-reduce:transition-none`}
                      style={{ width: `${(d.minutes / maxMinutes) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-600">
                    {d.minutes} phút
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dev-review #13: a failed server query is not "no data" - show a
            section-level retry so a flaky network never silently tells the
            parent their child did nothing. */}
        {isLoggedIn && serverSectionsFailed && (
          <div data-testid="report-server-error" className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-b from-white to-amber-50 p-3 ring-1 ring-amber-200 shadow-[inset_0_1px_0_#ffffff,0_3px_0_rgba(146,64,14,0.14)]">
            <p className="text-xs font-semibold text-amber-800">
              Không tải được số liệu đồng bộ - kiểm tra mạng rồi thử lại.
            </p>
            <button
              type="button"
              data-testid="report-retry"
              onClick={() => setRetryTick((t) => t + 1)}
              className="shrink-0 rounded-xl bg-amber-200 px-3 py-1.5 text-xs font-extrabold text-amber-800 transition hover:bg-amber-300 motion-reduce:transition-none"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Theo lớp */}
        <SectionTitle className="mt-7">Theo lớp</SectionTitle>
        <ul className="mt-2 space-y-2">
          {grades.map((grade) => {
            const gp = engagement.grades[grade.id];
            const skills = (report.skills[grade.id] ?? []).slice(0, WEAKEST_SHOWN);
            const weakest = report.skills[grade.id]?.[0];
            const trend = mockTrends[grade.id]?.points ?? [];
            const due = getDueReviewItems(grade.id).length;
            /* A grade renders when EITHER local play or server exam rows
               exist - exam-only children must still appear (dev-review #4). */
            if (!gp && skills.length === 0 && trend.length === 0) return null;
            return (
              <li key={grade.id} data-testid={`report-grade-${grade.id}`} className="rounded-2xl bg-gradient-to-b from-white to-sky-50/50 p-3 ring-1 ring-sky-200 shadow-[inset_0_1px_0_#ffffff,0_3px_0_rgba(3,105,161,0.10)]">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">{grade.name}</span>
                  {gp && (
                    <span className="text-sm font-bold text-amber-600">
                      <span className="inline-flex items-center gap-1"><IconStar size={14} /> {gp.stars} - {gp.batchesCompleted} bài luyện</span>
                    </span>
                  )}
                </div>
                {due > 0 && (
                  <p className="mt-1 text-xs font-bold text-amber-700">
                    <span className="inline-flex items-center gap-1"><IconBook size={13} /> {due} câu đang chờ ôn lại</span>
                  </p>
                )}
                {/* kids-UX AC-5.2: mock-exam trend, only when rows exist.
                    External-review r1 #5: "lần trước" = the previous sitting
                    (trend[len-2]), not the oldest row in the window. */}
                {trend.length > 0 && (
                  <p data-testid={`report-trend-${grade.id}`} className="mt-2 text-xs font-bold text-slate-600">
                    <IconTrendingUp size={16} className="mr-1 inline-block" /> Thi thử gần nhất:{' '}
                    <span className={trend.length > 1 && trend[trend.length - 1]!.scorePct > trend[trend.length - 2]!.scorePct ? PAPER_TREND_UP : 'text-slate-700'}>
                      {trend[trend.length - 1]!.scorePct}%
                    </span>
                    {trend.length > 1 && ` (lần trước ${trend[trend.length - 2]!.scorePct}%)`}
                  </p>
                )}
                {skills.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {skills.map((skill) => (
                      <li key={skill.key} className="flex items-center gap-2">
                        <span className="w-28 shrink-0 truncate text-xs font-bold text-slate-600">
                          {skillLabel(skill.key)}
                        </span>
                        <div className={PAPER_PROGRESS_TRACK + ' flex-1'}>
                          <div
                            data-testid={`report-skill-${grade.id}-${skill.key}`}
                            className={`h-full rounded-full ${accuracyColor(skill.accuracy)} transition-[width] motion-reduce:transition-none`}
                            style={{ width: `${Math.round(skill.accuracy * 100)}%` }}
                          />
                        </div>
                        <span className="w-16 shrink-0 text-right text-xs font-bold text-slate-500">
                          {Math.round(skill.accuracy * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* kids-UX s3.7: one concrete suggestion, not a wall. */}
                {weakest && (
                  <p data-testid={`report-suggestion-${grade.id}`} className="mt-2 text-xs font-semibold text-sky-700">
                    <IconBulb size={16} className="mr-1 inline-block" /> Gợi ý: cho bé luyện thêm {skillLabel(weakest.key)} ({Math.round(weakest.accuracy * 100)}%).
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {Object.keys(report.skills).length === 0 && (
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Chưa có dữ liệu kỹ năng - sẽ hiện sau khi bé làm bài.
          </p>
        )}

        {/* kids-UX AC-5.2 guest teaser: the server sections are real, the
            guest sees an honest sign-in prompt instead of empty space. */}
        {!isLoggedIn && (
          <p data-testid="report-guest-teaser" className="mt-5 rounded-2xl bg-gradient-to-b from-white to-sky-50 p-3 text-xs font-semibold text-sky-800 ring-1 ring-sky-200 shadow-[inset_0_1px_0_#ffffff,0_3px_0_rgba(3,105,161,0.12)]">
            Đăng nhập để xem thêm: phút luyện mỗi ngày, điểm thi thử theo thời gian và báo cáo qua email hàng tuần.
          </p>
        )}

        {/* CR-31: weekly parent report email - logged-in only. */}
        {isLoggedIn && (
          <div data-testid="parent-email-section" className="mt-5 rounded-2xl bg-gradient-to-b from-white to-sky-50 p-4 ring-1 ring-sky-200 shadow-[inset_0_1px_0_#ffffff,0_3px_0_rgba(3,105,161,0.12)]">
            <h2 className="font-display text-lg font-extrabold text-sky-800"><IconMail size={18} className="mr-1.5 inline-block" /> Nhận báo cáo qua email</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
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
                className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-sky-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                data-testid="parent-email-save"
                onClick={() => void handleSaveEmail()}
                className="shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-sm font-extrabold text-white shadow-[0_3px_0_#075985] transition hover:bg-sky-500 active:translate-y-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:active:translate-y-0"
              >
                Lưu
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
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
              <p data-testid="parent-email-saved" className="mt-2 text-sm font-bold text-emerald-600">
                Đã lưu! Ba mẹ sẽ nhận báo cáo vào Chủ nhật.
              </p>
            )}
            {verifyState === 'sent' && (
              <p data-testid="parent-verify-sent" className="mt-2 text-sm font-bold text-sky-700">
                Đã gửi email xác nhận - ba mẹ bấm link trong hộp thư.
              </p>
            )}
            {verifyState === 'throttled' && (
              <p data-testid="parent-verify-throttled" className="mt-2 text-sm font-bold text-sky-700">
                Email xác nhận đã được gửi gần đây - ba mẹ kiểm tra hộp thư (hoặc thử lại sau ít phút).
              </p>
            )}
            {verifyState === 'failed' && (
              <p data-testid="parent-verify-failed" className="mt-2 text-sm font-bold text-rose-600">
                Không gửi được email xác nhận - thử lại sau nhé.
              </p>
            )}
            {emailVerified ? (
              <p data-testid="parent-email-verified" className="mt-2 text-sm font-bold text-emerald-600">
                Email đã xác nhận.
              </p>
            ) : parentEmail && isValidParentEmail(parentEmail) ? (
              <div data-testid="parent-email-pending" className="mt-2 flex items-center gap-2 text-sm font-bold text-amber-700">
                <span>Chưa xác nhận - ba mẹ bấm link trong email để bắt đầu nhận báo cáo.</span>
                <button
                  type="button"
                  data-testid="parent-email-resend"
                  onClick={() => void handleResendVerify()}
                  className="shrink-0 rounded-lg bg-amber-200 px-2 py-1 text-xs font-extrabold text-amber-800 transition hover:bg-amber-300"
                >
                  Gửi lại email
                </button>
              </div>
            ) : null}
            {emailSaved === 'error' && (
              <p data-testid="parent-email-error" className="mt-2 text-sm font-bold text-rose-600">
                Email chưa đúng định dạng - ba mẹ kiểm tra lại nhé.
              </p>
            )}
          </div>
        )}

        {/* kids-UX AC-9.1: the funnel's last step - real pricing + bank
            transfer, mounted inside the already-gated parent corner. */}
        <div className="mt-6">
          <PricingCard />
        </div>
        </div>
      </div>

      {/* External-review r1 #1: expired pass re-gates inside the report
          (the token TTL can lapse while the parent reads). */}
      {reGateOpen && (
        <ParentGate
          onPass={() => setReGateOpen(false)}
          onCancel={() => setReGateOpen(false)}
        />
      )}
    </div>
  );
}
