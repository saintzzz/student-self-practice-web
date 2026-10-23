// CR-108 practice-turnstile: verifies a Cloudflare Turnstile token and
// mints a short-lived guest ticket for fetch_questions_public. Guests are
// otherwise unauthenticated, so this function does its own bot check:
// siteverify secret + ticket signing key stay server-side via
// practice.get_turnstile_config (service_role-only vault RPC).
//
// Ticket = base64url("v1|<client-ip>|<exp_unix>|<nonce>") + "." + hmac hex.
// The RPC re-derives the IP via practice.client_ip() - binding the ticket
// to the caller network so it cannot hop to a different scrape origin.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ALLOWED_ORIGINS = new Set([
  'https://ea.vieschool.com',
  'https://ioe-leduyminh.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  const extra = (Deno.env.get('ALLOWED_ORIGIN') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowed = ALLOWED_ORIGINS.has(origin) || extra.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://ea.vieschool.com',
    Vary: 'Origin',
  };
};
const CORS_HEADERS = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Ticket window: long enough for a whole sitting, short enough that a
// stolen token ages out before a botnet can fan it out.
const TICKET_TTL_S = 600;
const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const HOSTNAMES = new Set([
  'ea.vieschool.com',
  'ioe-leduyminh.vercel.app',
  'localhost',
  '127.0.0.1',
]);

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');

// Supabase edge runtime injects cf-connecting-ip / x-real-ip with the real
// TCP peer (x-forwarded-for is NOT reliably present here). The DB side
// (practice.client_ip) reads the LAST xff entry on PostgREST, which is the
// same real client IP - so the ticket binds to the right network.
function clientIp(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xr = req.headers.get('x-real-ip');
  if (xr) return xr.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return null;
  const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

async function hmacHex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const json = (status: number, body: unknown, req: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsFor(req) },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsFor(req), ...CORS_HEADERS } });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' }, req);
  }

  let token = '';
  try {
    const body = await req.json();
    token = typeof body?.token === 'string' ? body.token : '';
  } catch {
    return json(400, { error: 'bad_request' }, req);
  }
  if (!token || token.length > 4096) {
    return json(400, { error: 'bad_request' }, req);
  }

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'practice' },
  });
  const { data: cfg, error: cfgErr } = await svc.rpc('get_turnstile_config');
  const siteSecret = cfg?.siteverify_secret as string | undefined;
  const ticketSecret = cfg?.ticket_secret as string | undefined;
  if (cfgErr || !siteSecret || !ticketSecret) {
    // Fail closed per CR-108: no secret -> no tickets, guests see the
    // unavailable message instead of a silent open door.
    return json(503, { error: 'challenge_unavailable' }, req);
  }

  const ip = clientIp(req) ?? '';
  let verdict: { success?: boolean; hostname?: string };
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: siteSecret,
        response: token,
        remoteip: ip,
      }),
      signal: AbortSignal.timeout(8000),
    });
    verdict = await res.json();
  } catch {
    return json(503, { error: 'challenge_unavailable' }, req);
  }
  if (
    !verdict.success ||
    (verdict.hostname && !HOSTNAMES.has(verdict.hostname))
  ) {
    return json(403, { error: 'challenge_failed' }, req);
  }

  const exp = Math.floor(Date.now() / 1000) + TICKET_TTL_S;
  const nonce = crypto.randomUUID();
  const payload = `v1|${ip}|${exp}|${nonce}`;
  const ticket =
    b64url(new TextEncoder().encode(payload)) +
    '.' +
    (await hmacHex(ticketSecret, payload));
  return json(200, { ticket, expires_at: exp }, req);
});
