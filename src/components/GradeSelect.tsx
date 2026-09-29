import { useEffect, useRef } from 'react';
import type { Grade } from '../types';

interface GradeSelectProps {
  grades: readonly Grade[];
  onSelectGrade: (gradeId: string) => void;
  /** When provided, shows the "Nguồn hình ảnh" pill below the grid (DS-6). */
  onOpenCredits?: () => void;
  /** Refocus the credits pill when returning from the Credits screen (AC-7.10). */
  focusCreditsLink?: boolean;
}

export default function GradeSelect({ grades, onSelectGrade, onOpenCredits, focusCreditsLink }: GradeSelectProps) {
  const creditsRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusCreditsLink) {
      creditsRef.current?.focus();
    }
  }, [focusCreditsLink]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="mb-3 text-4xl font-extrabold text-sky-900">Chọn lớp của em</h1>
      <p className="mb-10 text-xl text-sky-700">Bấm vào lớp để bắt đầu luyện tập nhé!</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {grades.map((grade) => (
          <button
            key={grade.id}
            type="button"
            data-testid={`grade-card-${grade.id}`}
            onClick={() => onSelectGrade(grade.id)}
            className="rounded-3xl border-4 border-amber-300 bg-amber-100 p-10 text-center shadow-md transition hover:scale-105 hover:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500"
          >
            <span className="text-3xl font-bold text-amber-900">{grade.name}</span>
          </button>
        ))}
      </div>
      {onOpenCredits && (
        <button
          ref={creditsRef}
          type="button"
          data-testid="credits-link"
          onClick={onOpenCredits}
          className="mt-10 rounded-full bg-sky-100 px-6 py-3 text-lg font-bold text-sky-700 transition hover:bg-sky-200 focus:outline-none focus:ring-4 focus:ring-sky-500"
        >
          Nguồn hình ảnh
        </button>
      )}
    </div>
  );
}
