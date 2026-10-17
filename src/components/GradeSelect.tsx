import { useEffect, useRef, useState } from 'react';
import type { Grade } from '../types';
import Mascot from './Mascot';
import EngagementBar from './EngagementBar';
import ChangePinDialog from './ChangePinDialog';
import { getLand } from '../lib/ui/theme';
import LandScene from './scene/LandScene';
import { getState } from '../lib/engagement/store';
import { EmojiVisual } from './EmojiVisual';
import { ParentGate, isParentVerified } from './ParentGate';
import { GatedLink } from './GatedLink';
import { NAV_PILL, NAV_PILL_SM, H1, PROMPT, SCREEN_ENTER } from '../lib/ui/tokens';
import { IconFamily, IconStar } from './icons';

interface GradeSelectProps {
  grades: readonly Grade[];
  onSelectGrade: (gradeId: string) => void;
  /** When provided, shows the "Nguồn hình ảnh" pill below the grid (DS-6). */
  onOpenCredits?: () => void;
  /** Refocus the credits pill when returning from the Credits screen (AC-7.10). */
  focusCreditsLink?: boolean;
  /** CR-08: when provided, only these grade ids render (student RBAC scope). */
  allowedGrades?: readonly string[];
  /** CR-08: sign-out chip (signed-in users). */
  onSignOut?: () => void;
  /** CR-08: "Đăng nhập" chip for guests when Supabase is configured. */
  onLogin?: () => void;
  /** CR-13: guest trial - show the "1 vong moi lop" trial hint. */
  guestTrial?: boolean;
  /** CR-23: mo bai kiem tra dau vao (placement). */
  onPlacement?: () => void;
  /** CR-29: mo man hinh bao cao cho ba me. */
  onReport?: () => void;
  /** CR-41: signed-in student's name - the journey title personalizes to them. */
  studentName?: string;
  /** CR-47: class join card rendered below the grade grid (students). */
  joinClassSlot?: React.ReactNode;
}

/**
 * CR-10: the grade picker is now the journey map - each grade is a
 * themed land card (palette + motif + per-grade earned stars), zigzag
 * stacked on wide screens with a dotted path feel. LandScene behind
 * shows the sky land; the card itself carries each land's identity so
 * all five lands are visible at once on the map.
 */
export default function GradeSelect({ grades, onSelectGrade, onOpenCredits, focusCreditsLink, allowedGrades, onSignOut, onLogin, guestTrial, onPlacement, onReport, studentName, joinClassSlot }: GradeSelectProps) {
  const creditsRef = useRef<HTMLButtonElement>(null);
  const [changePinOpen, setChangePinOpen] = useState(false);
  // kids-UX step 10 (AC-5.1): the parent report sits behind the arithmetic
  // ParentGate. A passed gate holds a 5-minute in-memory token
  // (isParentVerified), so a parent mid-session is not re-challenged.
  const [reportGateOpen, setReportGateOpen] = useState(false);

  useEffect(() => {
    if (focusCreditsLink) {
      creditsRef.current?.focus();
    }
  }, [focusCreditsLink]);

  const visibleGrades = allowedGrades
    ? grades.filter((g) => allowedGrades.includes(g.id))
    : grades;

  const engagement = getState();
  // CR-11 DS-P1: a lone trailing card in the 2-col grid centers itself
  // (odd counts happen with 5 grades and with scoped class subsets).
  const lastIsLone = visibleGrades.length % 2 === 1;

  return (
    <div className={`mx-auto max-w-3xl px-4 py-6 text-center sm:py-8 ${SCREEN_ENTER}`}>
      {(onSignOut || onLogin) && (
        <div className="mb-2 flex justify-end gap-2">
          {onSignOut && (
            <button
              type="button"
              data-testid="change-pin-button"
              onClick={() => setChangePinOpen(true)}
              className={NAV_PILL_SM}
            >
              Đổi mã PIN
            </button>
          )}
          {onLogin && (
            <button
              type="button"
              data-testid="login-link"
              onClick={onLogin}
              className={NAV_PILL_SM}
            >
              Đăng nhập
            </button>
          )}
          {onSignOut && (
            <button
              type="button"
              data-testid="signout-button"
              onClick={onSignOut}
              className={NAV_PILL_SM}
            >
              Đăng xuất
            </button>
          )}
        </div>
      )}
      {/* CR-82 polish: mascot medallion + title share one row - the
          header drops ~110px so the land postcards enter the first
          viewport, and the pig reads as a badge of the journey instead
          of a floating emoji. */}
      <div className="mb-2 flex items-center justify-center gap-4 text-left sm:gap-5">
        <div className="relative shrink-0">
          {/* Golden medallion frame - bright rim + inner navy bezel so
              the pig sits IN an artifact, not on the navy. */}
          <div className="rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 p-[5px] shadow-[0_0_30px_rgba(251,191,36,0.35),0_10px_24px_-10px_rgba(0,0,0,0.7)]">
            <div className="rounded-full bg-gradient-to-b from-navy-700 to-navy-850 p-1.5 ring-1 ring-inset ring-white/15">
              <Mascot mood="greeting" />
            </div>
          </div>
          {/* Star charm dangling off the ring - the badge's pendant. */}
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-md ring-2 ring-amber-100/70"
          >
            <IconStar size={13} className="text-amber-950" />
          </span>
        </div>
        <div className="min-w-0">
          <h1 className={H1}>
            {/* nbsp keeps "Bé {name}" together so the wrap reads
                "Hành trình của / Bé Heo" instead of orphaning "Heo";
                the name carries the gold accent - it is THE child's. */}
            Hành trình của{' '}
            <span className="text-amber-300">
              Bé {studentName?.trim().replace(/^bé\s+/i, '') || 'Heo'}
            </span>
          </h1>
          <p className={PROMPT + ' mt-0.5'}>Chọn một vùng đất để bắt đầu phiêu lưu nhé!</p>
        </div>
      </div>
      {/* CR-72 + CR-82 polish: placement CTA + guest hint + engagement
          chips + the parent pill share ONE wrap row - kills the stacked
          dead space that pushed the map off-screen on phones. */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {onPlacement && (
          <button
            type="button"
            data-testid="placement-start"
            onClick={onPlacement}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 px-5 py-2 text-sm font-extrabold text-amber-950 shadow-[inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-2px_0_rgba(146,64,14,0.3),0_10px_22px_-8px_rgba(245,158,11,0.6)] ring-1 ring-amber-300/80 transition hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-4 focus:ring-amber-300"
          >
            Làm bài kiểm tra đầu vào
          </button>
        )}
        <EngagementBar />
        {guestTrial && (
          <p
            data-testid="guest-trial-hint"
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-1.5 text-sm font-bold text-sky-200 backdrop-blur"
          >
            Chơi thử: mỗi lớp 1 vòng miễn phí - đăng nhập để mở đủ 4 vòng
          </p>
        )}
        {onReport && (
          <button
            type="button"
            data-testid="open-parent-report"
            onClick={() => (isParentVerified() ? onReport() : setReportGateOpen(true))}
            className={`${NAV_PILL_SM} inline-flex items-center gap-1`}
          >
            <IconFamily size={14} className="text-slate-300" /> Góc ba mẹ
          </button>
        )}
      </div>
      {reportGateOpen && (
        <ParentGate
          title="Dành cho ba mẹ"
          onPass={() => {
            setReportGateOpen(false);
            onReport?.();
          }}
          onCancel={() => setReportGateOpen(false)}
        />
      )}
      {visibleGrades.length === 0 ? (
        <div data-testid="no-scope-message" className="rounded-3xl bg-gradient-to-b from-navy-800 to-navy-850 p-8 text-lg font-bold text-slate-300 shadow-lg ring-1 ring-white/15">
          Cô/Thầy chưa mở nội dung cho bé - hãy hỏi cô nhé!
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {visibleGrades.map((grade, i) => {
          const land = getLand(grade.id);
          const gp = engagement.grades[grade.id];
          const isLoneLast = lastIsLone && i === visibleGrades.length - 1;
          return (
            <button
              key={grade.id}
              type="button"
              data-testid={`grade-card-${grade.id}`}
              onClick={() => onSelectGrade(grade.id)}
              className={`relative flex min-h-[76px] items-center gap-4 overflow-hidden rounded-3xl border-4 ${land.cardRing.replace('ring-', 'border-')} ${land.cardTint} bg-gradient-to-br from-white/70 via-white/10 to-transparent p-5 pb-5 pt-[104px] text-left shadow-lg transition hover:-translate-y-1 hover:shadow-2xl active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-amber-400/60 sm:px-6 ${
                isLoneLast ? 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.75rem)]' : ''
              }`}
            >
              {/* CR-82 (spec s6.6): 96px day-tone land postcard header -
                  the same LandScene strip art, clipped to the card
                  radius by the parent's overflow-hidden. */}
              <span
                aria-hidden="true"
                data-testid={`grade-postcard-${grade.id}`}
                className="pointer-events-none absolute inset-x-0 top-0 block h-24 overflow-hidden"
              >
                <LandScene land={land.key} variant="strip" tone="day" />
              </span>
              <span
                aria-hidden="true"
                className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${land.discBg} font-display text-3xl font-extrabold text-white ring-4 ring-white/80 shadow-[inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-4px_0_rgba(0,0,0,0.18),0_6px_14px_-4px_rgba(15,23,42,0.3)]`}
              >
                {(grade.name.match(/\d+/) ?? ['?'])[0]}
              </span>
              <span className="relative z-10 flex min-w-0 flex-col">
                <span className={`font-display text-2xl font-extrabold leading-tight ${land.accentText}`}>
                  {grade.name}
                </span>
                <span className="text-base font-bold text-slate-600">
                  {land.nameVi} {land.motif && <EmojiVisual emoji={land.motif} className="inline-block text-sm" />}
                </span>
                <span data-testid={`grade-stars-${grade.id}`} className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-amber-700">
                  <IconStar size={13} className="text-amber-500" /> {gp?.stars ?? 0} sao
                </span>
              </span>
            </button>
          );
        })}
      </div>
      )}
      {joinClassSlot}
      {/* CR-43: footer stacks vertically - the old inline elements
          rendered glued together on one line. */}
      <footer className="mt-12 flex flex-col items-center gap-3">
        {onOpenCredits && (
          <button
            ref={creditsRef}
            type="button"
            data-testid="credits-link"
            onClick={onOpenCredits}
            className={NAV_PILL}
          >
            Nguồn hình ảnh
          </button>
        )}
        <GatedLink href="https://vieschool.com" className="text-xs font-bold text-slate-400 underline-offset-2 transition hover:text-slate-300 hover:underline">          English Arena - sản phẩm của VieSchool</GatedLink>
      </footer>
      {changePinOpen && <ChangePinDialog onClose={() => setChangePinOpen(false)} />}
    </div>
  );
}
