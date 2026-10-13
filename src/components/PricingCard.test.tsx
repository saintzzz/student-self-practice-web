import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PricingCard } from './PricingCard';

/**
 * kids-UX step 11 (AC-9.1, OM-1=B): honest pricing card - real prices only,
 * no anchoring/urgency, transfer note copy, manual-activation honesty, and
 * a Zalo button that exists only when VITE_ZALO_URL is configured.
 */

const writeTextMock = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  writeTextMock.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: (t: string) => writeTextMock(t) },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('PricingCard', () => {
  it('lists the three real offers with truthful name/price/duration', () => {
    render(<PricingCard />);
    expect(screen.getByTestId('pricing-card')).toBeInTheDocument();
    for (const code of ['MUATHI', 'NAMHOC', 'FOUNDING']) {
      expect(screen.getByTestId(`pricing-offer-${code}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('pricing-offer-MUATHI')).toHaveTextContent('249.000đ');
    expect(screen.getByTestId('pricing-offer-MUATHI')).toHaveTextContent('6 tháng');
    expect(screen.getByTestId('pricing-offer-NAMHOC')).toHaveTextContent('399.000đ');
    expect(screen.getByTestId('pricing-offer-NAMHOC')).toHaveTextContent('12 tháng');
    expect(screen.getByTestId('pricing-offer-FOUNDING')).toHaveTextContent('299.000đ');
    expect(screen.getByTestId('pricing-offer-FOUNDING')).toHaveTextContent('300 gia đình');
  });

  it('has no urgency, per-day anchoring or "best value" framing', () => {
    render(<PricingCard />);
    const card = screen.getByTestId('pricing-card');
    for (const banned of [/đ\/ngày/i, /phổ biến nhất/i, /best value/i, /chỉ còn/i, /giờ nữa/i, /đếm ngược/i]) {
      expect(card.textContent).not.toMatch(banned);
    }
    // No plan is preselected (Ruling R-23).
    for (const code of ['MUATHI', 'NAMHOC', 'FOUNDING']) {
      expect(screen.getByTestId(`pricing-offer-${code}`)).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('selecting a plan fills the transfer note code; copy uses the clipboard', async () => {
    render(<PricingCard />);
    expect(screen.getByTestId('pricing-note')).toHaveTextContent('VS <so dien thoai> <ma goi>');
    fireEvent.click(screen.getByTestId('pricing-offer-NAMHOC'));
    expect(screen.getByTestId('pricing-note')).toHaveTextContent('VS <so dien thoai> NAMHOC');
    fireEvent.click(screen.getByTestId('pricing-copy'));
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith('VS <so dien thoai> NAMHOC'));
    expect(await screen.findByText(/Đã chép/)).toBeInTheDocument();
  });

  it('shows honest manual fallback copy when the clipboard fails', async () => {
    writeTextMock.mockRejectedValue(new Error('denied'));
    render(<PricingCard />);
    fireEvent.click(screen.getByTestId('pricing-copy'));
    expect(await screen.findByText(/Không chép được - ba mẹ chép tay nhé/)).toBeInTheDocument();
  });

  it('states manual activation honestly (no instant-unlock claim)', () => {
    render(<PricingCard />);
    expect(screen.getByTestId('pricing-card')).toHaveTextContent('chuyển khoản thủ công');
    expect(screen.getByTestId('pricing-card')).toHaveTextContent('Gói không tự mở ngay sau khi chuyển');
    expect(screen.getByTestId('pricing-card')).toHaveTextContent('TPBank');
    expect(screen.getByTestId('pricing-card')).toHaveTextContent('0157 9495 001');
  });

  it('hides the Zalo button unless VITE_ZALO_URL is configured', () => {
    render(<PricingCard />);
    expect(screen.queryByTestId('pricing-zalo')).not.toBeInTheDocument();
  });

  it('renders the gated Zalo button when VITE_ZALO_URL is configured', () => {
    vi.stubEnv('VITE_ZALO_URL', 'https://zalo.me/example');
    render(<PricingCard />);
    const wrap = screen.getByTestId('pricing-zalo');
    // AC-5.1: the external link renders through GatedLink - a button that
    // opens the parent gate first, never a bare anchor.
    const button = wrap.querySelector('button');
    expect(button).not.toBeNull();
    expect(button).toHaveTextContent('Nhắn Zalo tư vấn');
    fireEvent.click(button!);
    expect(screen.getByTestId('parent-gate')).toBeInTheDocument();
  });
});
