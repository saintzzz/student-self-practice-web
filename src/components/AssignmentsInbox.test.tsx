import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssignmentsInbox from './AssignmentsInbox';
import { assignmentInbox, type InboxItem } from '../lib/assignments';

vi.mock('../lib/assignments', () => ({
  assignmentInbox: vi.fn(async () => ({ items: [], error: null })),
}));

const ok = (items: InboxItem[]) => ({ items, error: null });

const base: InboxItem = {
  assignmentId: 'a1', title: 'Bai Unit 5', className: 'Lop 3A', formId: 'asg-x',
  gradeId: 'grade-3', programId: 'english',
  opensAt: new Date(Date.now() - 3600e3).toISOString(),
  dueAt: new Date(Date.now() + 24 * 3600e3).toISOString(),
  state: 'open', score: null, total: null, late: null, submittedAt: null,
};

describe('AssignmentsInbox (CR-98)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing for guests or an empty inbox', async () => {
    const { container, rerender } = render(<AssignmentsInbox isGuest={true} onTake={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    vi.mocked(assignmentInbox).mockResolvedValue(ok([]));
    rerender(<AssignmentsInbox isGuest={false} onTake={vi.fn()} />);
    await screen.findByText?.('', {}).catch(() => {});
    expect(container).toBeEmptyDOMElement();
  });

  it('lists actionable items with a take button that fires onTake', async () => {
    vi.mocked(assignmentInbox).mockResolvedValue(ok([base]));
    const onTake = vi.fn();
    render(<AssignmentsInbox isGuest={false} onTake={onTake} />);
    const btn = await screen.findByTestId('assignment-take-a1');
    expect(screen.getByText('Bai Unit 5')).toBeTruthy();
    fireEvent.click(btn);
    expect(onTake).toHaveBeenCalledWith(base);
  });

  it('done items show the score badge instead of a button', async () => {
    vi.mocked(assignmentInbox).mockResolvedValue(ok([
      { ...base, state: 'done', score: 80, total: 100 },
    ]));
    render(<AssignmentsInbox isGuest={false} onTake={vi.fn()} />);
    await screen.findByText('Đã nộp');
    expect(screen.queryByTestId('assignment-take-a1')).toBeNull();
    expect(screen.getByText(/80\/100/)).toBeTruthy();
  });

  it('upcoming/closed items are badge-only', async () => {
    vi.mocked(assignmentInbox).mockResolvedValue(ok([
      { ...base, assignmentId: 'up', state: 'upcoming' },
      { ...base, assignmentId: 'cl', state: 'closed' },
    ]));
    render(<AssignmentsInbox isGuest={false} onTake={vi.fn()} />);
    await screen.findByText('Sắp mở');
    await screen.findByText('Đã đóng');
    expect(screen.queryByTestId('assignment-take-up')).toBeNull();
    expect(screen.queryByTestId('assignment-take-cl')).toBeNull();
  });

  it('surfaces the take error inline', async () => {
    vi.mocked(assignmentInbox).mockResolvedValue(ok([base]));
    render(<AssignmentsInbox isGuest={false} onTake={vi.fn()} error="Bài này đã đóng rồi." />);
    await screen.findByTestId('assignment-error');
    expect(screen.getByText('Bài này đã đóng rồi.')).toBeTruthy();
  });

  it('RPC failure is not "no assignments" - shows error + retry that refetches', async () => {
    vi.mocked(assignmentInbox).mockResolvedValue({ items: [], error: 'network down' });
    render(<AssignmentsInbox isGuest={false} onTake={vi.fn()} />);
    await screen.findByTestId('assignment-load-error');
    expect(screen.queryByTestId('assignment-take-a1')).toBeNull();
    // recover -> retry paints the real inbox
    vi.mocked(assignmentInbox).mockResolvedValue(ok([base]));
    fireEvent.click(screen.getByTestId('assignment-load-retry'));
    await screen.findByTestId('assignment-take-a1');
    expect(assignmentInbox).toHaveBeenCalledTimes(2);
  });
});
