import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'ea-demo-';
/** Module fallback for storage-disabled environments (private mode). */
const seenInMemory = new Set<string>();
/* Mounted-hook notification for rearmDemoHint - persistence alone
   cannot flip a mounted `showDemo` back to true (external review
   r34-A7). */
const rearmListeners = new Set<(kind: string) => void>();

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

  /* A thinking-pose rearm of THIS kind re-shows the demo immediately -
     the spec's "replay" is on the mounted question, not the next mount. */
  useEffect(() => {
    const onRearm = (rearmed: string) => {
      if (rearmed === kind) setShowDemo(true);
    };
    rearmListeners.add(onRearm);
    return () => {
      rearmListeners.delete(onRearm);
    };
  }, [kind]);

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

/**
 * CR-82 (D-15, spec s9.2): the thinking pose "re-arms" the kind's demo
 * hint so it can replay - clears both the sessionStorage flag and the
 * in-memory fallback AND notifies mounted hooks so the current
 * question's demo shows again.
 */
export function rearmDemoHint(kind: string): void {
  const key = `${STORAGE_PREFIX}${kind}`;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* storage disabled */
  }
  seenInMemory.delete(key);
  for (const listener of rearmListeners) listener(kind);
}
