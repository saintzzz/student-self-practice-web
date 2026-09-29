import { useEffect, useRef } from 'react';
import type { Grade } from '../types';
import Mascot from './Mascot';
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

  return (
    <div className={`mx-auto max-w-2xl px-4 py-12 text-center ${SCREEN_ENTER}`}>
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
      <div className="mb-4 flex justify-center">
        <Mascot mood="greeting" />
      </div>
      <h1 className={`mb-3 ${H1}`}>Chọn lớp của em</h1>
      <p className={`mb-10 ${PROMPT}`}>Bấm vào lớp để bắt đầu luyện tập nhé!</p>
      {visibleGrades.length === 0 ? (
        <div data-testid="no-scope-message" className="rounded-3xl bg-white p-8 text-lg font-bold text-slate-600 shadow-md ring-1 ring-slate-200">
          Cô/Thầy chưa mở nội dung cho bé - hãy hỏi cô nhé!
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {visibleGrades.map((grade) => (
          <button
            key={grade.id}
            type="button"
            data-testid={`grade-card-${grade.id}`}
            onClick={() => onSelectGrade(grade.id)}
            className="flex min-h-[76px] items-center justify-center gap-4 rounded-3xl border-4 border-amber-300 bg-amber-100 p-8 text-center shadow-md transition hover:-translate-y-1 hover:border-amber-500 hover:shadow-lg active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-amber-500"
          >
            <span
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-400 font-display text-3xl font-extrabold text-white shadow-inner"
            >
              {(grade.name.match(/\d+/) ?? ['📖'])[0]}
            </span>
            <span className="font-display text-3xl font-bold text-amber-900">{grade.name}</span>
          </button>
        ))}
      </div>
      )}
      {onOpenCredits && (
        <button
          ref={creditsRef}
          type="button"
          data-testid="credits-link"
          onClick={onOpenCredits}
          className={`mt-10 ${NAV_PILL}`}
        >
          Nguồn hình ảnh
        </button>
      )}
    </div>
  );
}
