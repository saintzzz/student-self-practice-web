import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import ExploreSheet from './ExploreSheet';

/** Harness mirroring StartBatchScreen usage: a toggle button + sheet. */
function Harness() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        type="button"
        ref={toggleRef}
        data-testid="explore-toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Khám phá
      </button>
      <ExploreSheet open={open} onClose={() => setOpen(false)} returnFocusRef={toggleRef}>
        <div data-testid="sheet-child">Nội dung</div>
      </ExploreSheet>
    </>
  );
}

describe('ExploreSheet', () => {
  it('renders nothing while closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a modal dialog and moves focus into it', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId('explore-toggle'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('sheet-child')).toBeInTheDocument();
    await vi.waitFor(() => expect(document.activeElement).toBe(dialog));
  });

  it('closes via the Đóng button and restores focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId('explore-toggle'));
    await screen.findByRole('dialog');
    await user.click(screen.getByTestId('explore-close'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId('explore-toggle'));
  });

  it('closes via backdrop tap', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId('explore-toggle'));
    await screen.findByRole('dialog');
    await user.click(screen.getByTestId('explore-backdrop'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes via Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId('explore-toggle'));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId('explore-toggle'));
  });

  it('dev-review #11: Tab/Shift+Tab from the container focus never escapes the sheet', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByTestId('explore-toggle'));
    const dialog = await screen.findByRole('dialog');
    // Focus lands on the sheet container (tabIndex=-1) - outside the
    // tabbable list. Tab must route to the first control inside.
    await vi.waitFor(() => expect(document.activeElement).toBe(dialog));

    fireEvent.keyDown(document, { key: 'Tab' });
    // CR-72: the headless instruction speaker is gone - the sheet's only
    // control is Đóng, so first === last here.
    const first = screen.getByTestId('explore-close');
    const last = screen.getByTestId('explore-close');
    expect(document.activeElement).toBe(first);

    // Shift+Tab from the container wraps to the LAST control.
    dialog.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    // Tab past the last control wraps to the first.
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });
});
