import { useCallback, useState } from 'react';

const STORAGE_KEY = 'ea-gap-input-mode';
export type GapInputMode = 'bank' | 'type';

/** Module fallback for storage-disabled environments (private mode) -
 *  the exact degradation pattern of useDemoHint. */
let memoryMode: GapInputMode | null = null;

function readMode(): GapInputMode {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'bank' || stored === 'type') return stored;
    /* Storage works but is empty - fresh session, default 'bank'. The
       module fallback is only for when storage THROWS (D-14). */
    return 'bank';
  } catch {
    return memoryMode ?? 'bank';
  }
}

/**
 * CR-82 (ARCHITECTURE-v5 D-14, spec s13.7): the G1-2 gap dual-input
 * preference. `bank` (word chips) is the default/primary input; the
 * child's last choice persists for the tab session and applies to the
 * next gap item. V8 audio failure forces 'type' at the COMPONENT level
 * without writing this preference.
 */
export function useGapInputMode(): { mode: GapInputMode; setMode: (mode: GapInputMode) => void } {
  const [mode, setModeState] = useState<GapInputMode>(readMode);

  const setMode = useCallback((next: GapInputMode) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage disabled */
    }
    memoryMode = next;
    setModeState(next);
  }, []);

  return { mode, setMode };
}
