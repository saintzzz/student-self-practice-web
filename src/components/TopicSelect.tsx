import type { Grade, Topic } from '../types';

interface TopicSelectProps {
  grade: Grade;
  topics: readonly Topic[];
  onSelectTopic: (topicId: string) => void;
  onBack: () => void;
}

export default function TopicSelect({ grade, topics, onSelectTopic, onBack }: TopicSelectProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <button
        type="button"
        data-testid="back-to-grades"
        onClick={onBack}
        className="mb-4 text-sm font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Back to grades
      </button>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">{grade.name} topics</h1>
      <p className="mb-6 text-slate-600">Select a topic to start a practice session.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            data-testid={`topic-card-${topic.id}`}
            onClick={() => onSelectTopic(topic.id)}
            className="rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span className="text-lg font-semibold text-slate-900">{topic.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
