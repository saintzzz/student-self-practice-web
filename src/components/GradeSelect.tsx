import { useEffect, useRef } from 'react';
import type { Grade } from '../types';
import Mascot from './Mascot';
import EngagementBar from './EngagementBar';
import { getLand } from '../lib/ui/theme';
import { getState } from '../lib/engagement/store';
import { EmojiVisual } from './EmojiVisual';
import { NAV_PILL, H1, PROMPT, SCREEN_ENTER } from '../lib/ui/tokens';

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
}

/**
 * CR-10: the grade picker is now the journey map - each grade is a
 * themed land card (palette + motif + per-grade earned stars), zigzag
 * stacked on wide screens with a dotted path feel. LandScene behind
 * shows the sky land; the card itself carries each land's identity so
 * all five lands are visible at once on the map.
 */
export default function GradeSelect({ grades, onSelectGrade, onOpenCredits, focusCreditsLink, allowedGrades, onSignOut, onLogin }: GradeSelectProps) {
  const creditsRef = useRef<HTMLButtonElement>(null);

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
        <div className="mb-2 flex justify-end">
          {onLogin && (
            <button
              type="button"
              data-testid="login-link"
              onClick={onLogin}
              className={`!min-h-0 px-4 py-2 text-sm ${NAV_PILL}`}
            >
              Đăng nhập
            </button>
          )}
          {onSignOut && (
            <button
              type="button"
              data-testid="signout-button"
              onClick={onSignOut}
              className={`!min-h-0 px-4 py-2 text-sm ${NAV_PILL}`}
            >
              Đăng xuất
            </button>
          )}
        </div>
      )}
      <div className="mb-1 flex justify-center">
        <Mascot mood="greeting" />
      </div>
      <h1 className={`mb-2 ${H1}`}>Hành trình của Bé Heo</h1>
      <p className={`mb-4 ${PROMPT}`}>Chọn một vùng đất để bắt đầu phiêu lưu nhé!</p>
      <div className="mb-8 flex justify-center">
        <EngagementBar />
      </div>
      {visibleGrades.length === 0 ? (
        <div data-testid="no-scope-message" className="rounded-3xl bg-gradient-to-b from-white to-sky-50/60 p-8 text-lg font-bold text-slate-600 shadow-lg ring-1 ring-slate-200">
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
              className={`relative flex min-h-[76px] items-center gap-4 overflow-hidden rounded-3xl border-4 ${land.cardRing.replace('ring-', 'border-')} ${land.cardTint} bg-gradient-to-br from-white/70 via-white/10 to-transparent p-5 pb-16 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-2xl active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-sky-500 sm:px-6 sm:pt-6 ${
                isLoneLast ? 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.75rem)]' : ''
              }`}
            >
              {/* mini scene strip at the card bottom */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 opacity-60">
                <svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice" className="block h-16 w-full">
                  <LandStrip land={land.key} />
                </svg>
              </span>
              <span
                aria-hidden="true"
                className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${land.discBg} font-display text-3xl font-extrabold text-white ring-4 ring-white/80 shadow-[inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-4px_0_rgba(0,0,0,0.18),0_6px_14px_-4px_rgba(15,23,42,0.3)]`}
              >
                {(grade.name.match(/\d+/) ?? ['📖'])[0]}
              </span>
              <span className="relative z-10 flex min-w-0 flex-col">
                <span className={`font-display text-2xl font-extrabold leading-tight ${land.accentText}`}>
                  {grade.name}
                </span>
                <span className="text-base font-bold text-slate-600">
                  {land.nameVi} {land.motif && <EmojiVisual emoji={land.motif} className="inline-block text-sm" />}
                </span>
                <span data-testid={`grade-stars-${grade.id}`} className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-amber-600">
                  <EmojiVisual emoji="⭐" className="text-xs" /> {gp?.stars ?? 0} sao
                </span>
              </span>
            </button>
          );
        })}
      </div>
      )}
      {onOpenCredits && (
        <button
          ref={creditsRef}
          type="button"
          data-testid="credits-link"
          onClick={onOpenCredits}
          className={`mt-12 ${NAV_PILL}`}
        >
          Nguồn hình ảnh
        </button>
      )}
    </div>
  );
}

/** Compact per-land strip rendered inside each map card. */
function LandStrip({ land }: { land: 'sky' | 'playground' | 'town' | 'jungle' | 'city' | 'space' }) {
  switch (land) {
    case 'playground':
      return (
        <g>
          <path d="M0 320 L0 250 Q 300 190 600 240 Q 900 290 1200 230 L1200 320 Z" fill="#84cc16" opacity="0.5" />
          <path d="M0 320 L0 285 Q 400 250 800 285 Q 1000 300 1200 280 L1200 320 Z" fill="#4d7c0f" opacity="0.55" />
          <circle cx="140" cy="288" r="10" fill="#fbbf24" />
          <circle cx="700" cy="296" r="8" fill="#fb7185" />
          <path d="M1000 320 L1020 250 M1060 320 L1040 250 M1020 250 L1040 250" stroke="#92400e" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case 'town':
      return (
        <g>
          {[80, 260, 440, 700, 900, 1060].map((x, i) => (
            <g key={i}>
              <rect x={x} y={238 + (i % 2) * 14} width={90 + (i % 3) * 20} height={82 - (i % 2) * 14} fill={['#fb7185', '#fbbf24', '#60a5fa'][i % 3]} opacity="0.55" />
              <path d={`M${x - 6} ${238 + (i % 2) * 14} L${x + 45 + (i % 3) * 10} ${208 + (i % 2) * 14} L${x + 96 + (i % 3) * 20} ${238 + (i % 2) * 14} Z`} fill={['#e11d48', '#d97706', '#2563eb'][i % 3]} opacity="0.6" />
            </g>
          ))}
          <rect x="0" y="290" width="1200" height="30" fill="#94a3b8" opacity="0.6" />
        </g>
      );
    case 'jungle':
      return (
        <g>
          {[60, 200, 500, 820, 1000].map((x, i) => (
            <g key={i} transform={`translate(${x} 320) scale(${1 + (i % 2) * 0.3})`}>
              <path d="M0 0 Q -50 -70 -18 -130 Q 24 -80 0 0" fill="#15803d" opacity="0.6" />
              <path d="M0 0 Q 50 -66 26 -124 Q -16 -76 0 0" fill="#22c55e" opacity="0.6" />
            </g>
          ))}
          <path d="M0 320 L0 292 Q 400 268 800 292 Q 1040 306 1200 288 L1200 320 Z" fill="#166534" opacity="0.6" />
        </g>
      );
    case 'city':
      return (
        <g>
          {[40, 160, 300, 470, 620, 780, 920, 1080].map((x, i) => (
            <rect key={i} x={x} y={220 + (i % 3) * 18} width={70 + (i % 2) * 30} height={100 - (i % 3) * 18} fill={['#6366f1', '#818cf8', '#a5b4fc'][i % 3]} opacity="0.6" />
          ))}
          <rect x="0" y="292" width="1200" height="28" fill="#334155" opacity="0.7" />
        </g>
      );
    case 'space':
      return (
        <g>
          <rect x="0" y="180" width="1200" height="140" fill="#312e81" opacity="0.7" />
          {Array.from({ length: 26 }).map((_, i) => (
            <circle key={i} cx={(i * 211) % 1200} cy={190 + ((i * 67) % 100)} r={(i % 3) + 1.4} fill="#fefce8" opacity="0.85" />
          ))}
          <circle cx="220" cy="300" r="20" fill="#a78bfa" />
          <circle cx="640" cy="306" r="14" fill="#8b5cf6" />
          <circle cx="1020" cy="298" r="22" fill="#c4b5fd" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M0 320 L0 260 Q 300 210 600 255 Q 900 300 1200 250 L1200 320 Z" fill="#86efac" opacity="0.5" />
        </g>
      );
  }
}
