import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinClassCard from './JoinClassCard';
import type { JoinResult } from '../lib/classJoin';

const fetchMyClassNameMock = vi.fn<() => Promise<string | null>>();
const joinClassByCodeMock = vi.fn<(code: string) => Promise<JoinResult>>();

vi.mock('../lib/classJoin', () => ({
  fetchMyClassName: () => fetchMyClassNameMock(),
  joinClassByCode: (code: string) => joinClassByCodeMock(code),
}));

describe('JoinClassCard (CR-47)', () => {
  beforeEach(() => {
    fetchMyClassNameMock.mockReset();
    joinClassByCodeMock.mockReset();
  });

  it('renders nothing for guests - joining requires a student account', () => {
    const { container } = render(<JoinClassCard isGuest />);
    expect(container.firstChild).toBeNull();
    expect(fetchMyClassNameMock).not.toHaveBeenCalled();
  });

  it('student without a class sees the code input', async () => {
    fetchMyClassNameMock.mockResolvedValue(null);
    render(<JoinClassCard isGuest={false} />);
    await waitFor(() => expect(screen.getByTestId('join-class-input')).toBeTruthy());
  });

  it('student already enrolled sees their class name, not the input', async () => {
    fetchMyClassNameMock.mockResolvedValue('Lớp 4A1');
    render(<JoinClassCard isGuest={false} />);
    await waitFor(() => expect(screen.getByTestId('join-class-current').textContent).toContain('Lớp 4A1'));
    expect(screen.queryByTestId('join-class-input')).toBeNull();
  });

  it('valid code joins the class and shows the returned name', async () => {
    fetchMyClassNameMock.mockResolvedValue(null);
    joinClassByCodeMock.mockResolvedValue({ ok: true, className: 'Lớp Demo VieSchool' });
    render(<JoinClassCard isGuest={false} />);
    await waitFor(() => expect(screen.getByTestId('join-class-input')).toBeTruthy());
    await userEvent.type(screen.getByTestId('join-class-input'), 'r8whyf');
    await userEvent.click(screen.getByTestId('join-class-submit'));
    await waitFor(() => expect(screen.getByTestId('join-class-current').textContent).toContain('Lớp Demo VieSchool'));
    // Input uppercases the code before it reaches the rpc.
    expect(joinClassByCodeMock).toHaveBeenCalledWith('R8WHYF');
  });

  it('calls onJoined after a successful join so the parent can refresh scopes', async () => {
    fetchMyClassNameMock.mockResolvedValue(null);
    joinClassByCodeMock.mockResolvedValue({ ok: true, className: 'Lớp 4' });
    const onJoined = vi.fn();
    render(<JoinClassCard isGuest={false} onJoined={onJoined} />);
    await waitFor(() => expect(screen.getByTestId('join-class-input')).toBeTruthy());
    await userEvent.type(screen.getByTestId('join-class-input'), 'R6R9AD');
    await userEvent.click(screen.getByTestId('join-class-submit'));
    await waitFor(() => expect(onJoined).toHaveBeenCalledTimes(1));
  });

  it('strips ambiguous characters (I, L, O, 0, 1) that the code alphabet never uses', async () => {
    fetchMyClassNameMock.mockResolvedValue(null);
    render(<JoinClassCard isGuest={false} />);
    await waitFor(() => expect(screen.getByTestId('join-class-input')).toBeTruthy());
    await userEvent.type(screen.getByTestId('join-class-input'), 'o1il0r');
    expect((screen.getByTestId('join-class-input') as HTMLInputElement).value).toBe('R');
  });

  it('failed join shows the friendly error and keeps the input', async () => {
    fetchMyClassNameMock.mockResolvedValue(null);
    joinClassByCodeMock.mockResolvedValue({ ok: false, message: 'Mã lớp chưa đúng - em kiểm tra lại với cô nhé.' });
    const onJoined = vi.fn();
    render(<JoinClassCard isGuest={false} onJoined={onJoined} />);
    await waitFor(() => expect(screen.getByTestId('join-class-input')).toBeTruthy());
    await userEvent.type(screen.getByTestId('join-class-input'), 'ZZZZZZ');
    await userEvent.click(screen.getByTestId('join-class-submit'));
    await waitFor(() => expect(screen.getByTestId('join-class-error').textContent).toContain('Mã lớp chưa đúng'));
    expect(screen.getByTestId('join-class-input')).toBeTruthy();
    expect(onJoined).not.toHaveBeenCalled();
  });
});
