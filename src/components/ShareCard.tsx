import { useEffect, useRef, useState } from 'react';
import { NAV_PILL_SM } from '../lib/ui/tokens';
import { trackFunnel } from '../lib/funnel';
import { isParentVerified, ParentGate } from './ParentGate';
import { useLoggedIn } from './SendResultsCard';
import { IconImage, IconLock } from './icons';

export interface ShareCardProps {
  /** Card title drawn in gold display type (e.g. "Bé An - Lớp 3"). */
  title: string;
  /** Body lines (achievement text only - caller composes, no PII beyond
   *  first name + grade per the privacy matrix). */
  lines: string[];
  /** Button label - defaults to "Chia sẻ". */
  label?: string;
}

type ShareState = 'idle' | 'working' | 'done' | 'error';

/**
 * kids-UX step 11 (design s3.8.b, AC-9.2): "Chia sẻ" button that lazily
 * imports the Canvas-2D card generator, then hands the PNG to the native
 * share sheet when the platform supports file sharing, else downloads it.
 * No third-party SDK, no outbound URL - same-origin image only.
 *
 * Dev-review fix (finding #1/#2): the card is a GATED parent surface, not
 * a kid button. Guests never render it; a signed-in viewer must pass the
 * ParentGate, and the live 5-minute token is re-checked inside
 * handleShare so a latched `unlocked` flag or an expired pass can never
 * generate/export an image.
 */
export function ShareCard({ title, lines, label = 'Chia sẻ' }: ShareCardProps) {
  const loggedIn = useLoggedIn();
  const [state, setState] = useState<ShareState>('idle');
  const [gateOpen, setGateOpen] = useState(false);
  // Render hint only - handleShare re-verifies the live token.
  const [unlocked, setUnlocked] = useState(() => isParentVerified());
  /* dev-review r2 #1: image generation crosses two await boundaries -
     a revoked pass (sign-out, report exit, TTL expiry) mid-flight must
     not still export, and no post-await setState may hit a dead card. */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Live-token check shared by entry and post-await boundaries. */
  function passOrGate(): boolean {
    if (isParentVerified()) return true;
    setUnlocked(false);
    setGateOpen(true);
    setState('idle');
    return false;
  }

  async function handleShare(): Promise<void> {
    if (!passOrGate()) return;
    setState('working');
    try {
      const { renderShareCardPng } = await import('../lib/shareCardImage');
      const blob = await renderShareCardPng(title, lines);
      if (!mountedRef.current) return;
      /* The pass may have been revoked while the canvas worked - re-check
         before anything is shared or downloaded. */
      if (!passOrGate()) return;
      if (!blob) {
        setState('error');
        return;
      }
      const file = new File([blob], 'english-arena-thanh-tich.png', { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        // No Web Share Level 2 (desktop browsers) - download the PNG.
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }
      if (!mountedRef.current) return;
      trackFunnel('share_card', 'share-card');
      setState('done');
    } catch (error) {
      if (!mountedRef.current) return;
      // A dismissed share sheet rejects with AbortError - that is the user
      // backing out, not a failure worth an error message.
      setState(error instanceof DOMException && error.name === 'AbortError' ? 'idle' : 'error');
    }
  }

  // Guests see nothing - sharing a child's achievement card requires a
  // real account AND a fresh parent-gate pass (privacy matrix s3.0).
  if (!loggedIn) return null;

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        data-testid="share-card"
        disabled={state === 'working'}
        onClick={() => (unlocked ? void handleShare() : setGateOpen(true))}
        className={`${NAV_PILL_SM} disabled:opacity-60`}
      >
        {state === 'working' ? 'Đang tạo ảnh...' : <span className="inline-flex items-center gap-2">{unlocked ? <IconImage size={18} /> : <IconLock size={18} />} {label}</span>}
      </button>
      <span role="status" aria-live="polite" className="text-xs font-semibold text-slate-400">
        {state === 'done' ? 'Ảnh đã sẵn sàng!' : state === 'error' ? 'Chưa tạo được ảnh - thử lại nhé.' : ''}
      </span>
      {gateOpen && (
        <ParentGate
          title="Chia sẻ thành tích"
          onPass={() => {
            setGateOpen(false);
            setUnlocked(true);
            // One gesture: the pass IS the intent - share right away while
            // the token is fresh.
            void handleShare();
          }}
          onCancel={() => setGateOpen(false)}
        />
      )}
    </span>
  );
}
