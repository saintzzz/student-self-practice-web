import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SendResultsCard } from './SendResultsCard';
import { clearParentVerification } from './ParentGate';
import type { ParentContact } from '../lib/parentContact';

/**
 * kids-UX step 11 (AC-6.1 + AC-5.1): the "Gửi kết quả cho ba mẹ" card is
 * logged-in only, the email area sits behind the parent gate, and the
 * capture reuses the existing save_parent_contact + request_parent_verify
 * flow - honest sending/sent/error states, no fake success.
 */

const fetchMock = vi.fn<() => Promise<ParentContact | null>>();
const saveMock = vi.fn<(email: string, optedIn: boolean) => Promise<boolean>>();
const verifyMock = vi.fn<() => Promise<'sent' | 'already' | 'throttled' | 'failed'>>();
const getSessionMock = vi.fn<() => Promise<{ user: { id: string } } | null>>();

vi.mock('../lib/parentContact', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/parentContact')>();
  return {
    ...original,
    fetchParentContact: () => fetchMock(),
    saveParentContact: (email: string, optedIn: boolean) => saveMock(email, optedIn),
    requestParentVerify: () => verifyMock(),
  };
});
vi.mock('../lib/auth/practiceAuth', () => ({ getSession: () => getSessionMock() }));

const WORD_TO_DIGIT: Record<string, number> = {
  hai: 2, ba: 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9,
};

/** Opens the parent gate and answers the word-form multiplication. */
async function passGate(): Promise<void> {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fireEvent.click(await screen.findByTestId('send-results-unlock'));
  const q = screen.getByTestId('parent-gate-question').textContent ?? '';
  const m = q.match(/(\p{L}+) nhân (\p{L}+) bằng bao nhiêu\?/u);
  if (!m) throw new Error(`unparseable gate question: ${q}`);
  const answer = WORD_TO_DIGIT[m[1]!.toLowerCase()]! * WORD_TO_DIGIT[m[2]!.toLowerCase()]!;
  for (const ch of String(answer)) {
    fireEvent.click(screen.getByTestId(`parent-gate-key-${ch}`));
  }
  fireEvent.click(screen.getByTestId('parent-gate-ok'));
  // onPass fires after the 300ms "Đã mở" beat.
  await act(async () => {
    vi.advanceTimersByTime(400);
  });
  vi.useRealTimers();
}

beforeEach(() => {
  clearParentVerification();
  fetchMock.mockReset().mockResolvedValue(null);
  saveMock.mockReset().mockResolvedValue(true);
  verifyMock.mockReset().mockResolvedValue('sent');
  getSessionMock.mockReset().mockResolvedValue({ user: { id: 'acc-1' } });
});

describe('SendResultsCard', () => {
  it('renders null for guests (no session)', async () => {
    getSessionMock.mockResolvedValue(null);
    const { container } = render(<SendResultsCard />);
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="send-results-card"]')).toBeNull();
  });

  it('keeps the email area behind the parent gate until a pass', async () => {
    render(<SendResultsCard />);
    const unlock = await screen.findByTestId('send-results-unlock');
    expect(screen.queryByTestId('parent-email-input')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(unlock);
    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();
  });

  it('shows the email capture after the gate and runs save + verify', async () => {
    render(<SendResultsCard />);
    await passGate();
    const input = await screen.findByTestId('parent-email-input');
    fireEvent.change(input, { target: { value: 'ba.me@example.com' } });
    fireEvent.click(screen.getByTestId('parent-email-save'));
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith('ba.me@example.com', true));
    expect(verifyMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('parent-verify-sent')).toBeInTheDocument();
  });

  it('shows the verified email when a contact is already linked', async () => {
    fetchMock.mockResolvedValue({ email: 'me@example.com', opted_in: true, verified: true });
    render(<SendResultsCard />);
    await passGate();
    const verified = await screen.findByTestId('parent-email-verified');
    expect(verified).toHaveTextContent('me@example.com');
    expect(screen.queryByTestId('parent-email-input')).not.toBeInTheDocument();
  });

  it('shows the pending state with resend for a saved-but-unverified contact', async () => {
    fetchMock.mockResolvedValue({ email: 'me@example.com', opted_in: true, verified: false });
    render(<SendResultsCard />);
    await passGate();
    expect(await screen.findByTestId('parent-email-pending')).toHaveTextContent('me@example.com');
    fireEvent.click(screen.getByTestId('parent-email-resend'));
    await waitFor(() => expect(verifyMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('parent-verify-sent')).toBeInTheDocument();
  });

  it('rejects a malformed email without calling the RPC', async () => {
    render(<SendResultsCard />);
    await passGate();
    const input = await screen.findByTestId('parent-email-input');
    fireEvent.change(input, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByTestId('parent-email-save'));
    expect(await screen.findByTestId('parent-email-error')).toBeInTheDocument();
    expect(saveMock).not.toHaveBeenCalled();
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('test-lead gap #2: an expired pass re-locks the card and blocks save', async () => {
    render(<SendResultsCard />);
    await passGate();
    const input = await screen.findByTestId('parent-email-input');
    fireEvent.change(input, { target: { value: 'ba.me@example.com' } });

    // The 5-minute token dies between the gate pass and the save tap.
    clearParentVerification();
    fireEvent.click(screen.getByTestId('parent-email-save'));

    // Neither the write nor the verify email may fire.
    expect(saveMock).not.toHaveBeenCalled();
    expect(verifyMock).not.toHaveBeenCalled();
    // The card re-locks - the gate path is offered again.
    await waitFor(() => expect(screen.getByTestId('send-results-unlock')).toBeInTheDocument());
    expect(screen.queryByTestId('parent-email-input')).not.toBeInTheDocument();
  });

  it('shows a retry affordance when the verify call fails', async () => {
    verifyMock.mockResolvedValue('failed');
    render(<SendResultsCard />);
    await passGate();
    const input = await screen.findByTestId('parent-email-input');
    fireEvent.change(input, { target: { value: 'ba.me@example.com' } });
    fireEvent.click(screen.getByTestId('parent-email-save'));
    expect(await screen.findByTestId('parent-verify-failed')).toBeInTheDocument();
    // Retry re-runs the flow instead of dead-ending.
    verifyMock.mockResolvedValue('sent');
    fireEvent.click(screen.getByTestId('parent-email-retry'));
    await waitFor(() => expect(screen.getByTestId('parent-verify-sent')).toBeInTheDocument());
  });
});
