import type { Grade, Topic } from '../types';

interface TopicSelectProps {
  grade: Grade;
  topics: readonly Topic[];
  onSelectTopic: (topicId: string) => void;
  onBack: () => void;
}

export default function TopicSelect({ grade, topics, onSelectTopic, onBack }: TopicSelectProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <button
        type="button"
        data-testid="back-to-grades"
        onClick={onBack}
        className="mb-6 rounded-full bg-sky-100 px-6 py-3 text-lg font-bold text-sky-700 transition hover:bg-sky-200 focus:outline-none focus:ring-4 focus:ring-sky-500"
      >
        ← Quay lại chọn lớp
      </button>
      <h1 className="mb-3 text-4xl font-extrabold text-sky-900">{grade.name}: Chọn chủ đề</h1>
      <p className="mb-10 text-xl text-sky-700">Bấm vào chủ đề em muốn luyện tập.</p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            data-testid={`topic-card-${topic.id}`}
            onClick={() => onSelectTopic(topic.id)}
            className="rounded-3xl border-4 border-emerald-300 bg-emerald-100 p-10 text-center shadow-md transition hover:scale-105 hover:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500"
          >
            <span className="text-3xl font-bold text-emerald-900">{topic.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
