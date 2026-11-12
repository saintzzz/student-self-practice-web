import { useEffect, useState } from 'react';
import type { Screen } from '../App';
import {
  ADULT_SURFACES,
  PROMPT_SAFE_SCREENS,
  applyUpdate,
  installPromptPending,
  isRoundInFlight,
  onInstallPrompt,
  onSwUpdate,
  promptInstall,
  swUpdatePending,
} from '../lib/pwa';

const DISMISS_KEY = 'pwa-install-dismissed';

// sessionStorage can throw in locked-down embeds (Safari ITP, third-party
// iframes) - this component sits in App's root render, so a throw would
// blank the whole app. Fail closed instead.
function safeGet(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function safeSet(key: string): void {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* dismissal is best-effort */
  }
}

/** CR-141: update toast + install chip.
 *  - update toast: only on PROMPT_SAFE_SCREENS and never during the
 *    assignment submit flush (a reload must never interrupt a round).
 *  - install chip: only on adult surfaces (parent report / admin). */
export default function PwaUi({ screen }: { screen: Screen }) {
  const [updateReady, setUpdateReady] = useState(swUpdatePending());
  const [installReady, setInstallReady] = useState(installPromptPending());
  const [installDismissed, setInstallDismissed] = useState(() =>
    safeGet(DISMISS_KEY),
  );

  useEffect(() => onSwUpdate(() => setUpdateReady(true)), []);
  useEffect(() => onInstallPrompt(() => setInstallReady(true)), []);

  const showUpdate =
    updateReady && PROMPT_SAFE_SCREENS.has(screen) && !isRoundInFlight();
  const showInstall =
    installReady && !installDismissed && ADULT_SURFACES.has(screen) && !showUpdate;

  const dismissInstall = () => {
    safeSet(DISMISS_KEY);
    setInstallDismissed(true);
  };
  if (!showUpdate && !showInstall) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      {showUpdate ? (
        <button
          type="button"
          onClick={applyUpdate}
          aria-label="Cập nhật phiên bản mới"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-amber-200 shadow-md ring-1 ring-amber-300/50 backdrop-blur-md transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-amber-300/60"
        >
          Có bản mới - cập nhật
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 shadow-md ring-1 ring-white/15 backdrop-blur-md">
          <button
            type="button"
            onClick={() =>
              // The event is consumed once - clear readiness so the
              // chip can't be tapped into an 'unavailable' prompt,
              // even if promptInstall() itself rejects.
              void promptInstall().finally(() => setInstallReady(false))
            }
            aria-label="Cài app lên màn hình chính"
            className="inline-flex min-h-[44px] items-center px-2 text-sm font-bold text-amber-200 transition hover:text-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-300/60 rounded-full"
          >
            Cài app lên màn hình chính
          </button>
          <button
            type="button"
            onClick={dismissInstall}
            aria-label="Đóng"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-sm font-bold text-slate-300 transition hover:text-white focus:outline-none focus:ring-4 focus:ring-amber-300/60"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
