import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useDemoHint } from './useDemoHint';

function Probe({ kind }: { kind: string }) {
  const { showDemo, dismiss } = useDemoHint(kind);
  return (
    <div>
      <span data-testid="flag">{showDemo ? 'show' : 'hidden'}</span>
      <button onClick={dismiss}>dismiss</button>
    </div>
  );
}

describe('useDemoHint (CR-79 A4)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('shows on first encounter of a kind', () => {
    render(<Probe kind="image-choice" />);
    expect(screen.getByTestId('flag').textContent).toBe('show');
  });

  it('hides after dismiss and stays hidden for the session', () => {
    const { unmount } = render(<Probe kind="image-choice" />);
    fireEvent.click(screen.getByText('dismiss'));
    expect(screen.getByTestId('flag').textContent).toBe('hidden');
    unmount();
    // remount (next question of the same kind) - still hidden
    render(<Probe kind="image-choice" />);
    expect(screen.getByTestId('flag').textContent).toBe('hidden');
  });

  it('scopes per kind', () => {
    sessionStorage.setItem('ea-demo-image-choice', '1');
    render(<Probe kind="extra-letter" />);
    expect(screen.getByTestId('flag').textContent).toBe('show');
  });
});
