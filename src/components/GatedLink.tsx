import { useState } from 'react';
import { isParentVerified, ParentGate } from './ParentGate';

/**
 * kids-UX step 5 (design-kids-ux s3.0 gated list, ADR KUX-3): every
 * external link reachable from a kid surface goes through the parent
 * gate, then opens in a new tab with noopener+noreferrer. Renders as a
 * <button> because the click may open a dialog instead of navigating.
 */

/** Trusted destinations (design s3.0 privacy matrix). The allowlist is
 *  ENFORCED, not advisory: an href whose origin is not listed renders
 *  nothing and can never be opened (dev-review #14). */
export const GATE_ALLOWED_ORIGINS = [
  'https://zalo.me',
  'https://vieschool.com',
  'https://ea.vieschool.com',
] as const;

function originAllowed(href: string): boolean {
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:') return false;
    return (GATE_ALLOWED_ORIGINS as readonly string[]).includes(url.origin);
  } catch {
    return false;
  }
}

export interface GatedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function GatedLink({ href, children, className }: GatedLinkProps) {
  const [gateOpen, setGateOpen] = useState(false);
  /* Resolve once per href - a non-whitelisted destination never renders a
     clickable control, so there is no code path that could open it. */
  const allowed = originAllowed(href);
  if (!allowed) return null;

  function openLink(): void {
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          if (isParentVerified()) openLink();
          else setGateOpen(true);
        }}
      >
        {children}
      </button>
      {gateOpen && (
        <ParentGate
          onPass={() => {
            setGateOpen(false);
            openLink();
          }}
          onCancel={() => setGateOpen(false)}
        />
      )}
    </>
  );
}
