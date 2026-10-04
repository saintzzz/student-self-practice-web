import { useMemo } from 'react';
import { weakSkillsFor } from '../lib/engagement/coach';
import { CARD } from '../lib/ui/tokens';
import type { ExamProgramId } from '../types/exam';
import type { BankFetchFocus } from '../lib/qb/bank';

interface CoachCardProps {
  gradeId: string;
  /** Start a skill-targeted drill in the program the weak skill belongs to. */
  onDrill: (programId: ExamProgramId, focus: BankFetchFocus) => void;
}

function accuracyColor(accuracy: number): string {
  if (accuracy >= 0.7) return 'bg-emerald-400';
  if (accuracy >= 0.4) return 'bg-amber-400';
  return 'bg-rose-400';
}

/**
 * CR-58 - personalized recommendation: analyzes the last 7 days of
 * answers and surfaces the weakest skills with a one-tap drill. Only
 * renders when there is enough answer evidence to trust the ranking.
 */
export default function CoachCard({ gradeId, onDrill }: CoachCardProps) {
  const weak = useMemo(() => weakSkillsFor(gradeId), [gradeId]);
  if (weak.length === 0) return null;

  return (
    <div data-testid="coach-card" className={`mt-4 ${CARD} text-left`}>
      <h2 className="font-display text-xl font-extrabold text-amber-300">🎯 Gợi ý cho em</h2>
      <p className="mt-1 text-sm font-semibold text-slate-300">
        Dựa trên bài làm 7 ngày qua - ôn đúng chỗ còn yếu:
      </p>
      <ul className="mt-3 space-y-2">
        {weak.map((w) => (
          <li
            key={w.skillKey}
            className="flex items-center gap-3 rounded-xl bg-[#16232e] px-3 py-2.5 ring-1 ring-white/10"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-extrabold text-white">{w.label}</span>
                <span
                  data-testid={`coach-acc-${w.skillKey}`}
                  className="shrink-0 text-xs font-bold text-slate-400"
                >
                  đúng {Math.round(w.accuracy * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${accuracyColor(w.accuracy)}`}
                  style={{ width: `${Math.round(w.accuracy * 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              data-testid={`coach-drill-${w.skillKey}`}
              onClick={() => onDrill(w.program, { skills: w.drillSkills })}
              className="shrink-0 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 text-sm font-extrabold text-amber-950 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus:outline-none focus:ring-4 focus:ring-amber-400"
            >
              Ôn ngay
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
