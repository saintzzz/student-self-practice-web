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
import { IconChevronRight, IconFamily, IconFlag, IconStar } from './icons';

/**
 * CR-82 redesign (journey map): the grade list is a treasure-map trail -
 * numbered waypoint markers sit ON a winding dotted gold path while the
 * land postcards zigzag left/right off the path's edge (Reading Eggs /
 * Lingokids map idiom). The first grade with no stars earned pulses as
 * "next"; a finish flag closes the trail after the last land.
 * The trail is drawn as DOM dots along a cubic bezier (x in % of the map
 * column, y in px) - no SVG, so dots stay perfectly round at any width.
 */
const TRAIL_X = { left: 11, right: 89 } as const;

function trailDots(from: number, to: number, h: number) {
  const N = 11;
  const c = h * 0.55;
  return Array.from({ length: N }, (_, k) => {
    const t = k / (N - 1);
    const u = 1 - t;
    return {
      x: u * u * u * from + 3 * u * u * t * from + 3 * u * t * t * to + t * t * t * to,
      y: 3 * u * u * t * c + 3 * u * t * t * c + t * t * t * h,
    };
  });
}

/** Dotted gold connector between two waypoints - absolutely fills the
 *  56px (h-14) gap the parent <li> reserves above its card. It lands on
 *  the marker column's top edge, where TrailColumn picks it up. */
function TrailDots({ from, to }: { from: number; to: number }) {
  return (
    <span aria-hidden="true" data-testid="trail-dots" className="pointer-events-none absolute inset-x-0 top-0 block h-14">
      {trailDots(from, to, 56).map((d, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-amber-300/90 shadow-[0_0_8px_rgba(252,211,77,0.55)]"
          style={{ left: `${d.x}%`, top: d.y, transform: 'translate(-50%,-50%)' }}
        />
      ))}
    </span>
  );
}

/** Vertical dotted run inside a marker column - the trail enters at the
 *  column top, disappears behind the opaque disc, and exits at the
 *  bottom, so the path reads as one continuous line through every
 *  waypoint (review fix: connectors previously floated in the row gap,
 *  never touching the markers). */
function TrailColumn({ above, below }: { above: boolean; below: boolean }) {
  const run = (top: boolean) => (
    <span className={`flex h-1/2 flex-col items-center justify-evenly ${top ? 'pb-9' : 'pt-9'}`}>
      {[0, 1, 2].map((k) => (
        <span key={k} className="h-1.5 w-1.5 rounded-full bg-amber-300/90 shadow-[0_0_8px_rgba(252,211,77,0.55)]" />
      ))}
    </span>
  );
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col">
      {above ? run(true) : <span className="h-1/2" />}
      {below ? run(false) : <span className="h-1/2" />}
    </span>
  );
}

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
  // The first land with no stars is the pulsing "next" waypoint on the
  // trail (Lingokids "pulsing next" idiom); all-complete => no pulse.
  const nextId = visibleGrades.find((g) => !(engagement.grades[g.id]?.stars > 0))?.id;

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
      <ol className="mx-auto max-w-md">
        {visibleGrades.map((grade, i) => {
          const land = getLand(grade.id);
          const gp = engagement.grades[grade.id];
          const stars = gp?.stars ?? 0;
          const cardLeft = i % 2 === 0;
          const curX = cardLeft ? TRAIL_X.right : TRAIL_X.left;
          const isNext = grade.id === nextId;
          const marker = (
            <div className="relative flex w-[22%] flex-col items-center justify-center gap-1.5 self-stretch" data-testid={`grade-waypoint-${grade.id}`}>
              {/* The trail threads through the column: in from the top
                  (except the first waypoint), out at the bottom into the
                  next gap curve / the finish tail. */}
              <TrailColumn above={i > 0} below />
              <span className="relative z-10 flex flex-col items-center gap-1.5">
              {isNext && (
                <span className="flex items-center gap-1 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-amber-950 shadow-md ring-1 ring-amber-200/80">
                  <IconFlag size={11} /> Tiếp theo
                </span>
              )}
              <span className="relative flex">
                {isNext && (
                  /* Review fix (WCAG 2.2.2): the ping runs 3 sweeps then
                     dies, leaving the static halo - no infinite motion. */
                  <span aria-hidden="true" className="absolute -inset-1.5 rounded-full bg-amber-300/40 motion-safe:animate-ping motion-safe:[animation-iteration-count:3]" />
                )}
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${land.discBg} font-display text-2xl font-extrabold text-white ring-4 ring-white/80 shadow-[inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-4px_0_rgba(0,0,0,0.18),0_6px_14px_-4px_rgba(15,23,42,0.4)]`}
                >
                  {(grade.name.match(/\d+/) ?? ['?'])[0]}
                </span>
              </span>
              {stars > 0 && (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-300/90 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-950 shadow">
                  <IconStar size={10} /> {stars}
                </span>
              )}
              </span>
            </div>
          );
          const card = (
            <button
              type="button"
              data-testid={`grade-card-${grade.id}`}
              onClick={() => onSelectGrade(grade.id)}
              className={`relative flex w-full items-center gap-4 overflow-hidden rounded-3xl border-4 ${land.cardRing.replace('ring-', 'border-')} ${land.cardTint} bg-gradient-to-br from-white/70 via-white/10 to-transparent p-4 pb-4 pt-[104px] text-left shadow-lg transition hover:-translate-y-1 hover:shadow-2xl active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-amber-400/60 ${
                cardLeft ? '' : 'flex-row-reverse text-right'
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
              <span className="relative z-10 flex min-w-0 flex-1 flex-col">
                <span className={`font-display text-2xl font-extrabold leading-tight ${land.accentText}`}>
                  {grade.name}
                </span>
                <span className="text-base font-bold text-slate-600">
                  {land.nameVi} {land.motif && <EmojiVisual emoji={land.motif} className="inline-block text-sm" />}
                </span>
                <span data-testid={`grade-stars-${grade.id}`} className={`mt-1 flex items-center gap-1 text-sm font-bold text-amber-700 ${cardLeft ? '' : 'justify-end'}`}>
                  <IconStar size={13} className="text-amber-500" /> {stars} sao
                </span>
              </span>
              <IconChevronRight
                size={20}
                className={`relative z-10 shrink-0 text-slate-400 ${cardLeft ? '' : 'rotate-180'}`}
              />
            </button>
          );
          return (
            <li key={grade.id} className={`relative flex items-center ${i > 0 ? 'pt-14' : ''}`}>
              {i > 0 && <TrailDots from={100 - curX} to={curX} />}
              {cardLeft ? (
                <>
                  <div className="w-[78%]">{card}</div>
                  {marker}
                </>
              ) : (
                <>
                  {marker}
                  <div className="w-[78%]">{card}</div>
                </>
              )}
            </li>
          );
        })}
      </ol>
      )}
      {/* Trail tail: the path keeps winding past the last land to a
          finish flag centered under the map - the journey's "Đích". */}
      {visibleGrades.length > 0 && (
        <div aria-hidden="true" className="relative mx-auto h-20 max-w-md">
          {trailDots(visibleGrades.length % 2 === 1 ? TRAIL_X.right : TRAIL_X.left, 50, 56).map((d, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-amber-300/90 shadow-[0_0_8px_rgba(252,211,77,0.55)]"
              style={{ left: `${d.x}%`, top: d.y, transform: 'translate(-50%,-50%)' }}
            />
          ))}
          <span className="absolute left-1/2 top-[60px] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-1 text-xs font-extrabold text-amber-950 shadow-lg ring-2 ring-amber-200/70">
            <IconFlag size={13} /> Đích đến
          </span>
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
