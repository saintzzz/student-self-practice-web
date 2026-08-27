import type { Grade } from '../types';

interface GradeSelectProps {
  grades: readonly Grade[];
  onSelectGrade: (gradeId: string) => void;
}

export default function GradeSelect({ grades, onSelectGrade }: GradeSelectProps) {
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
    </div>
  );
}
