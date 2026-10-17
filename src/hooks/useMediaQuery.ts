import { useEffect, useState } from 'react';

/**
 * CR-82 (M1): generic media-query subscription used by the mascot sheet
 * perch decision `(max-height: 420px)` - JS-driven (not CSS hiding) so
 * exactly one mascot node exists in the DOM. Missing matchMedia (jsdom,
 * old webviews) reads as "no match" - the same convention as
 * usePrefersReducedMotion.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
