import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// r16 one-shot-effect-replay: the verify_email token is single-use - a
// StrictMode-replayed effect must share the first request's promise, not
// fire a second confirm that sees "already consumed" and shows failure.

const confirmSpy = vi.fn<(token: string) => Promise<boolean>>();
vi.mock('./lib/parentContact', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/parentContact')>()),
  confirmParentEmail: (token: string) => confirmSpy(token),
}));

import App from './App';

afterEach(() => {
  confirmSpy.mockReset();
  window.history.pushState(null, '', '/');
});

describe('App verify_email confirmation', () => {
  it('issues one confirm request per token under StrictMode and shows its result', async () => {
    window.history.pushState(null, '', '/?verify_email=tok-1');
    // First call consumes the token; a replayed effect would call again
    // and (in production) observe false. The cache must prevent call 2.
    confirmSpy.mockResolvedValueOnce(true).mockResolvedValue(false);

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByText(/Đã xác nhận email/)).toBeVisible(),
    );
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledWith('tok-1');
  });

  it('shows the failure notice when the shared request reports failure', async () => {
    window.history.pushState(null, '', '/?verify_email=tok-2');
    confirmSpy.mockResolvedValue(false);

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByText(/Link xác nhận đã hết hạn/)).toBeVisible(),
    );
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });
});
