import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicSelect from './TopicSelect';

const GRADE = { id: 'grade-6', name: 'Grade 6' };
const TOPICS = [
  { id: 'g6-present-simple', gradeId: 'grade-6', name: 'Present Simple Tense' },
  { id: 'g6-family-vocab', gradeId: 'grade-6', name: 'Vocabulary: Family and Friends' },
];

describe('TopicSelect', () => {
  it('renders a card for every topic in the selected grade', () => {
    render(
      <TopicSelect grade={GRADE} topics={TOPICS} onSelectTopic={vi.fn()} onBack={vi.fn()} />,
    );

    expect(screen.getByTestId('topic-card-g6-present-simple')).toBeVisible();
    expect(screen.getByTestId('topic-card-g6-family-vocab')).toBeVisible();
    expect(screen.getByText('Grade 6 topics')).toBeVisible();
  });

  it('calls onSelectTopic with the clicked topic id', async () => {
    const user = userEvent.setup();
    const onSelectTopic = vi.fn();
    render(
      <TopicSelect grade={GRADE} topics={TOPICS} onSelectTopic={onSelectTopic} onBack={vi.fn()} />,
    );

    await user.click(screen.getByTestId('topic-card-g6-family-vocab'));

    expect(onSelectTopic).toHaveBeenCalledWith('g6-family-vocab');
  });

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<TopicSelect grade={GRADE} topics={TOPICS} onSelectTopic={vi.fn()} onBack={onBack} />);

    await user.click(screen.getByTestId('back-to-grades'));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
