import { useEffect, useState } from 'react';

/**
 * Tracks `prefers-reduced-motion` live (ADR-1): when the media query flips
 * to `reduce` mid-play, EmojiVisual switches to the static SVG. Missing
 * matchMedia (old webviews, jsdom without the stub) reads as 'no-preference'.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
