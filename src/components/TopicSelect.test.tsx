import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopicSelect from './TopicSelect';

const GRADE = { id: 'grade-2', name: 'Lớp 2' };
const TOPICS = [
  { id: 'g2-animals', gradeId: 'grade-2', name: 'Con vật' },
  { id: 'g2-colors', gradeId: 'grade-2', name: 'Màu sắc' },
];

describe('TopicSelect', () => {
  it('renders a card for every topic in the selected grade (AC2)', () => {
    render(<TopicSelect grade={GRADE} topics={TOPICS} onSelectTopic={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByTestId('topic-card-g2-animals')).toBeVisible();
    expect(screen.getByTestId('topic-card-g2-colors')).toBeVisible();
    expect(screen.getByText('Con vật')).toBeVisible();
    expect(screen.getByText('Màu sắc')).toBeVisible();
  });

  it('calls onSelectTopic with the clicked topic id', async () => {
    const user = userEvent.setup();
    const onSelectTopic = vi.fn();
    render(
      <TopicSelect grade={GRADE} topics={TOPICS} onSelectTopic={onSelectTopic} onBack={vi.fn()} />,
    );

    await user.click(screen.getByTestId('topic-card-g2-colors'));

    expect(onSelectTopic).toHaveBeenCalledWith('g2-colors');
  });

  it('calls onBack when the back button is clicked (AC2)', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<TopicSelect grade={GRADE} topics={TOPICS} onSelectTopic={vi.fn()} onBack={onBack} />);

    await user.click(screen.getByTestId('back-to-grades'));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
