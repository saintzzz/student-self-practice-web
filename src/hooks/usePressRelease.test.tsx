import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { usePressRelease, PRESS_RELEASE_CLASS } from './usePressRelease';

/**
 * CR-82 (spec s16.1): press-release micro-interaction hook contract.
 * Pointer release springs, pointercancel adds nothing, Enter/Space use
 * data-pressed + release, reduced motion never adds the class, disabled
 * controls are no-ops.
 */

function TestButton({ disabled = false }: { disabled?: boolean }) {
  const press = usePressRelease({ disabled });
  return (
    <button type="button" data-testid="press-target" disabled={disabled} {...press}>
      go
    </button>
  );
}

function installMatchMedia(matches: Record<string, boolean>) {
  const mql = (query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: () => false,
  });
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: mql });
}

function uninstallMatchMedia() {
  // @ts-expect-error restore jsdom's absent matchMedia
  delete window.matchMedia;
}

afterEach(() => {
  uninstallMatchMedia();
});

describe('usePressRelease (CR-82 s16.1)', () => {
  it('pointerup after pointerdown adds the release class; animationend removes it', () => {
    render(<TestButton />);
    const btn = screen.getByTestId('press-target');
    fireEvent.pointerDown(btn, { button: 0 });
    fireEvent.pointerUp(btn);
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(true);
    /* jsdom has no AnimationEvent - set the name property manually. */
    const evt = new Event('animationend', { bubbles: true });
    Object.defineProperty(evt, 'animationName', { value: 'press-release' });
    fireEvent(btn, evt);
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(false);
  });

  it('pointerup without a preceding pointerdown adds nothing', () => {
    render(<TestButton />);
    const btn = screen.getByTestId('press-target');
    fireEvent.pointerUp(btn);
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(false);
  });

  it('pointercancel after pointerdown adds nothing', () => {
    render(<TestButton />);
    const btn = screen.getByTestId('press-target');
    fireEvent.pointerDown(btn, { button: 0 });
    fireEvent.pointerCancel(btn);
    fireEvent.pointerUp(btn);
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(false);
  });

  it('non-primary pointer buttons do not arm the release', () => {
    render(<TestButton />);
    const btn = screen.getByTestId('press-target');
    fireEvent.pointerDown(btn, { button: 2 });
    fireEvent.pointerUp(btn);
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(false);
  });

  it('Space keydown sets data-pressed; Space keyup clears it and releases', () => {
    render(<TestButton />);
    const btn = screen.getByTestId('press-target');
    fireEvent.keyDown(btn, { key: ' ' });
    expect(btn).toHaveAttribute('data-pressed');
    fireEvent.keyUp(btn, { key: ' ' });
    expect(btn).not.toHaveAttribute('data-pressed');
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(true);
  });

  it('Enter keydown sets data-pressed; the 100ms timer releases', () => {
    vi.useFakeTimers();
    try {
      render(<TestButton />);
      const btn = screen.getByTestId('press-target');
      fireEvent.keyDown(btn, { key: 'Enter' });
      expect(btn).toHaveAttribute('data-pressed');
      act(() => {
        vi.advanceTimersByTime(120);
      });
      expect(btn).not.toHaveAttribute('data-pressed');
      expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('key repeat does not re-arm data-pressed or release', () => {
    render(<TestButton />);
    const btn = screen.getByTestId('press-target');
    fireEvent.keyDown(btn, { key: 'Enter', repeat: true });
    expect(btn).not.toHaveAttribute('data-pressed');
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(false);
  });

  it('unrelated keys do nothing', () => {
    render(<TestButton />);
    const btn = screen.getByTestId('press-target');
    fireEvent.keyDown(btn, { key: 'a' });
    expect(btn).not.toHaveAttribute('data-pressed');
  });

  it('reduced motion never adds the release class but still mirrors data-pressed', () => {
    installMatchMedia({ '(prefers-reduced-motion: reduce)': true });
    render(<TestButton />);
    const btn = screen.getByTestId('press-target');
    fireEvent.pointerDown(btn, { button: 0 });
    fireEvent.pointerUp(btn);
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(false);
    fireEvent.keyDown(btn, { key: ' ' });
    expect(btn).toHaveAttribute('data-pressed');
    fireEvent.keyUp(btn, { key: ' ' });
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(false);
  });

  it('disabled controls are complete no-ops', () => {
    render(<TestButton disabled />);
    const btn = screen.getByTestId('press-target');
    fireEvent.pointerDown(btn, { button: 0 });
    fireEvent.pointerUp(btn);
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(btn).not.toHaveAttribute('data-pressed');
    expect(btn.classList.contains(PRESS_RELEASE_CLASS)).toBe(false);
  });
});
