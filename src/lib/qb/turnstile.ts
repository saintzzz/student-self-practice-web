/**
 * CR-108 - guest Turnstile ticket flow. Guests (no session) must present a
 * short-lived ticket to `fetch_questions_public`; the ticket is minted by
 * the `practice-turnstile` edge function after an invisible Cloudflare
 * Turnstile challenge. Everything here lazy-loads - the ~15 kB widget
 * script never enters the entry chunk (CR-105 budget law), and authed
 * callers never touch this module.
 *
 * UX: `appearance: 'interaction-only'` hides the widget entirely; a
 * checkbox only appears if Cloudflare decides the visitor is suspicious.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: Record<string, unknown>,
      ) => string;
      execute: (el: HTMLElement | string) => void;
      reset: (el: HTMLElement | string) => void;
    };
  }
}

// Public site key - designed to ship in the client bundle (same class of
// value as the Supabase publishable key). Env override keeps it swappable.
const SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ??
  '0x4AAAAAAFisJ_RLESi1cfgw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const GATE_URL = `${SUPABASE_URL}/functions/v1/practice-turnstile`;

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error('turnstile_unavailable'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

function runChallenge(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      await loadScript();
    } catch (e) {
      reject(e);
      return;
    }
    const holder = document.createElement('div');
    holder.style.display = 'none';
    document.body.appendChild(holder);
    window.turnstile?.render(holder, {
      sitekey: SITE_KEY,
      appearance: 'interaction-only',
      execution: 'execute',
      callback: (token: string) => {
        holder.remove();
        resolve(token);
      },
      'error-callback': () => {
        holder.remove();
        reject(new Error('turnstile_failed'));
      },
    });
    window.turnstile?.execute(holder);
  });
}

interface Ticket {
  token: string;
  expiresAt: number; // unix seconds
}
let cached: Ticket | null = null;
let inflight: Promise<string> | null = null;

async function mintTicket(): Promise<string> {
  const cfToken = await runChallenge();
  const res = await fetch(GATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: cfToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? 'challenge_unavailable');
  }
  const body = (await res.json()) as { ticket: string; expires_at: number };
  cached = { token: body.ticket, expiresAt: body.expires_at };
  return body.ticket;
}

/**
 * Returns a valid guest ticket, re-minting 60 s before expiry. One retry
 * at the call site is enough: a PT401 means the ticket expired between
 * cache check and RPC, so `refresh()` forces a new challenge.
 */
export async function guestTicket(refresh = false): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (!refresh && cached && cached.expiresAt - 60 > now) {
    return cached.token;
  }
  if (!refresh && inflight) return inflight;
  cached = null;
  inflight = mintTicket().finally(() => {
    inflight = null;
  });
  return inflight;
}
