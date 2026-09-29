import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmojiVisual } from './EmojiVisual';
import {
  isLottieDisabledForSession,
  resetLottieSessionForTests,
} from '../lib/emoji/lottieRuntime';

const SPARKLES = '✨'; // has Noto lottie (key 2728)
const PIG = '🐷'; // no Noto lottie (key 1f437)

function root(emoji = SPARKLES): HTMLElement {
  return document.querySelector(`[data-emoji-visual="${emoji}"]`) as HTMLElement;
}

beforeEach(() => {
  resetLottieSessionForTests();
  window.__lottieMockBehavior = 'ready';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('svg mode (default static path, AC-1.1/1.3/1.5)', () => {
  it('renders a Twemoji img plus one sr-only text node with the emoji', () => {
    render(<EmojiVisual emoji={PIG} />);
    const el = root(PIG);
    expect(el.dataset.emojiMode).toBe('svg');
    const img = el.querySelector('img');
    expect(img).toHaveAttribute('src', '/emoji/svg/1f437.svg');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('alt', '');
    expect(el.querySelector('span.sr-only')).toHaveTextContent('🐷');
    expect(screen.getByText('🐷')).toBeInTheDocument();
  });

  it('count > 1 renders N pictures and a single repeated text node (AC-1.2)', () => {
    render(<EmojiVisual emoji={PIG} count={3} />);
    const el = root(PIG);
    expect(el.dataset.emojiMode).toBe('svg');
    expect(el.querySelectorAll('img')).toHaveLength(3);
    expect(el.querySelector('span.sr-only')).toHaveTextContent('🐷🐷🐷');
    expect(screen.getByText('🐷🐷🐷')).toBeInTheDocument();
  });

  it('count > 1 never renders photo or lottie even if asked (AC-2.3/5.5)', () => {
    render(<EmojiVisual emoji={SPARKLES} count={2} animated imageUrl="/images/vocab/x.webp" />);
    const el = root(SPARKLES);
    expect(el.dataset.emojiMode).toBe('svg');
    expect(el.querySelector('img')).toHaveAttribute('src', '/emoji/svg/2728.svg');
  });

  it('svg load failure falls back to native visible glyph (AC-1.7)', () => {
    render(<EmojiVisual emoji={PIG} />);
    const el = root(PIG);
    fireEvent.error(el.querySelector('img')!);
    expect(el.dataset.emojiMode).toBe('native');
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toBe('🐷');
    expect(el.querySelector('span.sr-only')).toBeNull();
  });
});

describe('image mode (approved photo, AC-5.1/5.3)', () => {
  it('renders the photo with an emoji text layer', () => {
    render(<EmojiVisual emoji={PIG} imageUrl="/images/vocab/pig.webp" loading="lazy" />);
    const el = root(PIG);
    expect(el.dataset.emojiMode).toBe('image');
    const img = el.querySelector('img');
    expect(img).toHaveAttribute('src', '/images/vocab/pig.webp');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(el.querySelector('span.sr-only')).toHaveTextContent('🐷');
  });

  it('photo error falls back down the chain and calls onImageError once', () => {
    const onImageError = vi.fn();
    render(<EmojiVisual emoji={PIG} imageUrl="/x.webp" onImageError={onImageError} />);
    const el = root(PIG);
    fireEvent.error(el.querySelector('img')!);
    expect(el.dataset.emojiMode).toBe('svg');
    expect(onImageError).toHaveBeenCalledTimes(1);
    expect(el.querySelector('img')).toHaveAttribute('src', '/emoji/svg/1f437.svg');
  });

  it('photo error on an animated emoji falls back to lottie (AC-10.5)', async () => {
    render(<EmojiVisual emoji={SPARKLES} imageUrl="/x.webp" animated />);
    const el = root(SPARKLES);
    fireEvent.error(el.querySelector('img')!);
    expect(el.dataset.emojiMode).toBe('lottie');
    expect(await screen.findByTestId('lottie-2728')).toBeInTheDocument();
  });
});

describe('lottie mode (AC-2.x, ADR-1/6)', () => {
  it('animated emoji with a lottie asset mounts the lazy player', async () => {
    render(<EmojiVisual emoji={SPARKLES} animated />);
    const el = root(SPARKLES);
    expect(el.dataset.emojiMode).toBe('lottie');
    expect(await screen.findByTestId('lottie-2728')).toBeInTheDocument();
    await act(async () => {});
    expect(el.dataset.emojiReady).toBe('true');
    // poster unmounts after first frame
    expect(el.querySelectorAll('img')).toHaveLength(0);
  });

  it('animated without a lottie asset stays svg', () => {
    render(<EmojiVisual emoji={PIG} animated />);
    expect(root(PIG).dataset.emojiMode).toBe('svg');
  });

  it('JSON data failure falls back per-mount WITHOUT tripping the breaker (DS-9)', async () => {
    window.__lottieMockBehavior = 'error-data';
    render(<EmojiVisual emoji={SPARKLES} animated />);
    await waitFor(() => expect(root(SPARKLES).dataset.emojiMode).toBe('svg'));
    expect(isLottieDisabledForSession()).toBe(false);
  });

  it('player runtime failure falls back AND trips the breaker', async () => {
    window.__lottieMockBehavior = 'error-runtime';
    render(<EmojiVisual emoji={SPARKLES} animated />);
    await act(async () => {});
    expect(root(SPARKLES).dataset.emojiMode).toBe('svg');
    expect(isLottieDisabledForSession()).toBe(true);
  });

  it('ready timeout before any frame trips the breaker; a timeout after a successful frame does not', async () => {
    // Part 1: a session that has never produced a frame - the 2500 ms
    // ready-timeout means the player/WASM path is almost certainly broken,
    // so it trips the session breaker (DS-9).
    vi.useFakeTimers();
    window.__lottieMockBehavior = 'hang';
    render(<EmojiVisual emoji={SPARKLES} animated />);
    await act(async () => {
      vi.advanceTimersByTime(2600);
    });
    expect(root(SPARKLES).dataset.emojiMode).toBe('svg');
    expect(isLottieDisabledForSession()).toBe(true);
  });

  it('a ready-timeout AFTER a successful frame falls back per-mount only (DS-9 carve-out)', async () => {
    // One healthy mount first -> hasLottieEverRendered() === true.
    window.__lottieMockBehavior = 'ready';
    render(<EmojiVisual emoji={SPARKLES} animated />);
    await act(async () => {});
    expect(isLottieDisabledForSession()).toBe(false);

    // A later mount that hangs hits the timeout but must NOT trip the
    // breaker - a proven-good player path means this is a per-asset stall.
    vi.useFakeTimers();
    window.__lottieMockBehavior = 'hang';
    render(<EmojiVisual emoji={'🎉'} animated />);
    await act(async () => {
      vi.advanceTimersByTime(2600);
    });
    expect(root('🎉').dataset.emojiMode).toBe('svg');
    expect(isLottieDisabledForSession()).toBe(false);
  });
});

describe('reduced motion (AC-2.7)', () => {
  function stubMatchMedia(initial: boolean) {
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    let matches = initial;
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        get matches() {
          return matches;
        },
        addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
        removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      })),
    );
    return {
      /** Flips the media query and notifies listeners, like a real UA. */
      setMatches(next: boolean) {
        matches = next;
        listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
      },
    };
  }

  it('matchMedia reduce at mount -> never mounts lottie', () => {
    stubMatchMedia(true);
    render(<EmojiVisual emoji={SPARKLES} animated />);
    expect(root(SPARKLES).dataset.emojiMode).toBe('svg');
  });

  it('reduced motion flipping on MID-PLAY switches a mounted lottie to svg (C6)', async () => {
    const media = stubMatchMedia(false);
    render(<EmojiVisual emoji={SPARKLES} animated />);
    await waitFor(() => expect(root(SPARKLES).dataset.emojiMode).toBe('lottie'));

    act(() => media.setMatches(true));
    expect(root(SPARKLES).dataset.emojiMode).toBe('svg');
    expect(root(SPARKLES).querySelector('img')).toHaveAttribute('src', '/emoji/svg/2728.svg');
  });
});
