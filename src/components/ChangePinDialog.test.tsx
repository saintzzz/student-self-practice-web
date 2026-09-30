import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChangePinDialog from './ChangePinDialog';

vi.mock('../lib/auth/practiceAuth', () => ({
  changePin: vi.fn(async (pin: string) => (pin === 'failme' ? 'err' : null)),
}));

describe('ChangePinDialog (CR-17)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects PIN shorter than 6 chars', async () => {
    render(<ChangePinDialog onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('new-pin'), { target: { value: '123' } });
    fireEvent.change(screen.getByTestId('confirm-pin'), { target: { value: '123' } });
    fireEvent.click(screen.getByTestId('change-pin-submit'));
    expect(await screen.findByTestId('change-pin-error')).toHaveTextContent('ít nhất 6');
  });

  it('rejects mismatched confirmation', async () => {
    render(<ChangePinDialog onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('new-pin'), { target: { value: 'abc123' } });
    fireEvent.change(screen.getByTestId('confirm-pin'), { target: { value: 'abc124' } });
    fireEvent.click(screen.getByTestId('change-pin-submit'));
    expect(await screen.findByTestId('change-pin-error')).toHaveTextContent('chưa giống nhau');
  });

  it('shows success when changePin resolves', async () => {
    render(<ChangePinDialog onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('new-pin'), { target: { value: 'newpin9' } });
    fireEvent.change(screen.getByTestId('confirm-pin'), { target: { value: 'newpin9' } });
    fireEvent.click(screen.getByTestId('change-pin-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('change-pin-success')).toHaveTextContent('thành công'),
    );
  });
});
