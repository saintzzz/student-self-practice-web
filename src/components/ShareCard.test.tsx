import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShareCard } from './ShareCard';

/**
 * kids-UX step 11 (AC-9.2) + dev-review #1/#2: the share button is a
 * GATED parent surface - guests never see it, signed-in viewers pass the
 * ParentGate once, and the live token is re-checked at share time.
 */

const renderPngMock = vi.fn<() => Promise<Blob | null>>();
const loggedInMock = vi.fn<() => boolean>();
const verifiedMock = vi.fn<() => boolean>();

vi.mock('../lib/shareCardImage', () => ({
  renderShareCardPng: () => renderPngMock(),
}));

vi.mock('./SendResultsCard', () => ({
  useLoggedIn: () => loggedInMock(),
}));

/* ParentGate stub: renders a marker; clicking it fires onPass (a real
   arithmetic solve is ParentGate.test's job). */
vi.mock('./ParentGate', () => ({
  isParentVerified: () => verifiedMock(),
  ParentGate: ({ onPass }: { onPass: () => void; onCancel: () => void }) => (
    <button type="button" data-testid="parent-gate" onClick={onPass}>
      gate
    </button>
  ),
}));

function stubShare(share?: (data: ShareData) => Promise<void>, canShare?: (data: ShareData) => boolean) {
  Object.defineProperty(window.navigator, 'share', { value: share, configurable: true, writable: true });
  Object.defineProperty(window.navigator, 'canShare', { value: canShare, configurable: true, writable: true });
}

beforeEach(() => {
  renderPngMock.mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  loggedInMock.mockReset().mockReturnValue(true);
  verifiedMock.mockReset().mockReturnValue(true);
  stubShare(undefined, undefined);
});

describe('buildShareLines (canvas text contract)', () => {
  it('composes [title, ...body, fixed brand footer]', async () => {
    const mod = await vi.importActual<typeof import('../lib/shareCardImage')>('../lib/shareCardImage');
    expect(mod.buildShareLines('Bé An - Lớp 3', ['Thi thử Tiếng Anh: 80 điểm', '8/10 câu đúng']))
      .toEqual(['Bé An - Lớp 3', 'Thi thử Tiếng Anh: 80 điểm', '8/10 câu đúng', 'English Arena - ea.vieschool.com']);
    // Blank lines are dropped; the footer is always last.
    expect(mod.buildShareLines('T', ['', '  '])).toEqual(['T', 'English Arena - ea.vieschool.com']);
    expect(mod.SHARE_CARD_WIDTH).toBe(1200);
    expect(mod.SHARE_CARD_HEIGHT).toBe(630);
  });
});

describe('ShareCard gating (dev-review #1)', () => {
  it('renders nothing for guests and never generates an image', () => {
    loggedInMock.mockReturnValue(false);
    const { container } = render(<ShareCard title="t" lines={[]} />);
    expect(screen.queryByTestId('share-card')).toBeNull();
    expect(container.innerHTML).toBe('');
    expect(renderPngMock).not.toHaveBeenCalled();
  });

  it('unverified signed-in viewer gets the gate, not the image', () => {
    verifiedMock.mockReturnValue(false);
    render(<ShareCard title="t" lines={[]} />);
    fireEvent.click(screen.getByTestId('share-card'));
    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();
    expect(renderPngMock).not.toHaveBeenCalled();
  });

  it('a gate pass shares immediately within the fresh token window', async () => {
    const shareMock = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined);
    stubShare(shareMock, () => true);
    verifiedMock.mockReturnValue(false);
    render(<ShareCard title="Bé An - Lớp 3" lines={['10 điểm']} />);
    fireEvent.click(screen.getByTestId('share-card'));
    // The parent solves the gate - the token goes live.
    verifiedMock.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('parent-gate'));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
  });

  it('an expired token re-gates even when the card was unlocked', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    stubShare(shareMock, () => true);
    render(<ShareCard title="t" lines={[]} />);
    // Token dies between render and tap.
    verifiedMock.mockReturnValue(false);
    fireEvent.click(screen.getByTestId('share-card'));
    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();
    expect(renderPngMock).not.toHaveBeenCalled();
    expect(shareMock).not.toHaveBeenCalled();
  });

  it('dev-review r2 #1: revocation mid-generation cancels the export', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    stubShare(shareMock, () => true);
    // Defer the PNG so the token can die while generation is in flight.
    let resolvePng: (b: Blob | null) => void = () => {};
    renderPngMock.mockReturnValue(new Promise((r) => (resolvePng = r)));
    render(<ShareCard title="t" lines={[]} />);
    fireEvent.click(screen.getByTestId('share-card'));
    await waitFor(() => expect(renderPngMock).toHaveBeenCalled());
    // The parent pass is revoked mid-flight (sign-out / report exit).
    verifiedMock.mockReturnValue(false);
    await act(async () => resolvePng(new Blob(['png'], { type: 'image/png' })));
    expect(shareMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();
  });
});

describe('ShareCard', () => {
  it('renders the default and custom labels', () => {
    render(<ShareCard title="t" lines={[]} />);
    expect(screen.getByTestId('share-card')).toHaveTextContent('Chia sẻ');
  });

  it('uses navigator.share with files when the platform supports it', async () => {
    const shareMock = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined);
    stubShare(shareMock, () => true);
    render(<ShareCard title="Bé An - Lớp 3" lines={['10 điểm']} label="Chia sẻ thành tích" />);
    fireEvent.click(screen.getByTestId('share-card'));
    await waitFor(() => expect(shareMock).toHaveBeenCalledTimes(1));
    const arg = shareMock.mock.calls[0][0];
    expect(arg.files?.[0]?.type).toBe('image/png');
    expect(arg.title).toBe('Bé An - Lớp 3');
    await waitFor(() => expect(screen.getByText('Ảnh đã sẵn sàng!')).toBeInTheDocument());
  });

  it('a dismissed share sheet returns to idle instead of an error', async () => {
    stubShare(vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError')), () => true);
    render(<ShareCard title="t" lines={[]} />);
    const button = screen.getByTestId('share-card');
    fireEvent.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(screen.queryByText(/Chưa tạo được ảnh/)).not.toBeInTheDocument();
  });

  it('shows honest error copy when the image cannot be generated', async () => {
    renderPngMock.mockResolvedValue(null);
    render(<ShareCard title="t" lines={[]} />);
    fireEvent.click(screen.getByTestId('share-card'));
    await waitFor(() => expect(screen.getByText(/Chưa tạo được ảnh/)).toBeInTheDocument());
  });
});
