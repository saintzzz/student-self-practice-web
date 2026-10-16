import { useCallback, useState } from 'react';

const STORAGE_PREFIX = 'ea-demo-';
/** Module fallback for storage-disabled environments (private mode). */
const seenInMemory = new Set<string>();

/**
 * CR-79 (DESIGN-SPEC-v3 s2.3): first-encounter-per-session gesture demo.
 * `sessionStorage` scopes it to the tab session per the CR wording;
 * storage failures degrade to once-per-page-load via the module Set.
 */
export function useDemoHint(kind: string): { showDemo: boolean; dismiss: () => void } {
  const key = `${STORAGE_PREFIX}${kind}`;
  const [showDemo, setShowDemo] = useState<boolean>(() => {
    try {
      if (sessionStorage.getItem(key)) return false;
    } catch {
      /* storage disabled - fall through to the in-memory set */
    }
    return !seenInMemory.has(key);
  });

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage disabled */
    }
    seenInMemory.add(key);
    setShowDemo(false);
  }, [key]);

  return { showDemo, dismiss };
}
