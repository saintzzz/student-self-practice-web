import type { Grade } from '../types';

interface GradeSelectProps {
  grades: readonly Grade[];
  onSelectGrade: (gradeId: string) => void;
}

export default function GradeSelect({ grades, onSelectGrade }: GradeSelectProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Choose your grade</h1>
      <p className="mb-6 text-slate-600">Select a grade level to see practice topics.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {grades.map((grade) => (
          <button
            key={grade.id}
            type="button"
            data-testid={`grade-card-${grade.id}`}
            onClick={() => onSelectGrade(grade.id)}
            className="rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="text-lg font-semibold text-slate-900">{grade.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
