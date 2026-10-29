// CR-109 gtm-reply-webhook: Resend inbound.email.received intake.
//
// Flow per REQ-5.x:
//   1. Verify svix signature (whsec_ secret, HMAC-SHA256 over
//      `${svix-id}.${svix-timestamp}.${rawBody}`, 5min tolerance).
//   2. Idempotency: svix-id -> gtm.events.provider_event_id unique;
//      a replayed delivery = 200 no-op (REQ-5.2b).
//   3. Correlate: In-Reply-To / References provider id ->
//      messages.provider_message_id, else from-address -> latest sent
//      message; unmatched parks as 'reply_unmatched'.
//   4. Classify: rule pass (bounce markers, KHÔNG opt-out, question
//      marks) -> LLM fallback -> record event + move lead status;
//      'no'/opt-out language -> suppression; hard bounce suppresses the
//      intended RECIPIENT only (REQ-5.5); any human reply upgrades
//      lawful_basis='relationship'.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WHSEC = Deno.env.get('GTM_REPLY_SECRET') ?? '';
const TOLERANCE_S = 300;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verifySvix(req: Request, rawBody: string): Promise<boolean> {
  const id = req.headers.get('svix-id');
  const ts = req.headers.get('svix-timestamp');
  const sigHeader = req.headers.get('svix-signature') ?? '';
  if (!id || !ts || !sigHeader || !WHSEC) return false;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > TOLERANCE_S) return false;
  const keyBytes = WHSEC.startsWith('whsec_') ? b64decode(WHSEC.slice(6)) : new TextEncoder().encode(WHSEC);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${rawBody}`));
  const expected = new Uint8Array(sig);
  // Constant-time compare over decoded signature bytes - a plain
  // `===` on the b64 string leaks prefix-match timing (r109-6).
  return sigHeader.split(' ').some((candidate) => {
    const b64 = candidate.startsWith('v1,') ? candidate.slice(3) : '';
    let theirs: Uint8Array;
    try {
      theirs = b64decode(b64);
    } catch {
      return false;
    }
    if (theirs.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= theirs[i] ^ expected[i];
    return diff === 0;
  });
}

type Class =
  | 'interested' | 'question' | 'not_now' | 'no' | 'wrong_contact' | 'bounce';

const MAILER_DAEMON = /mailer-daemon|postmaster|noreply|no-reply@|delivery.*(fail|subsystem)/i;
const OPT_OUT = /\bkhong\b.*(nhan|gui|email|thong tin)|unsubscribe|dung lai|stop|remove me|opt.?out/i;
const QUESTION_HINT = /\?|gia ca|gia\b|cost|phi|how much|demo|dung thu|trial/i;
const INTEREST_HINT = /quan tam|muon.*(xem|thu|demo|tim hieu)|gui.*(thong tin|tai khoan)|hen.*(goi|call|trao doi)|dang ky/i;
const NOTNOW_HINT = /chua can|de sau|luc khac|not now|bay gio chua/i;

function classifyRule(fromAddr: string, subject: string, text: string): Class | null {
  const blob = `${subject}\n${text}`;
  if (MAILER_DAEMON.test(fromAddr) || /undeliverable|delivery (status )?notification|returned mail|bounce/i.test(subject)) {
    return 'bounce';
  }
  if (OPT_OUT.test(blob)) return 'no';
  if (INTEREST_HINT.test(blob)) return 'interested';
  if (NOTNOW_HINT.test(blob)) return 'not_now';
  if (QUESTION_HINT.test(blob)) return 'question';
  return null;
}

async function llmClassify(subject: string, text: string): Promise<Class | null> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `Phan loai email tra loi cho chien dich B2B (mot trong: interested|question|not_now|no|wrong_contact|bounce). Chi tra ve DUY NHAT mot tu khoa.\n\nSubject: ${subject}\n\n${text.slice(0, 2000)}`,
            }],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 20, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const j = await res.json();
    const raw = (j.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().toLowerCase();
    return (['interested', 'question', 'not_now', 'no', 'wrong_contact', 'bounce'] as Class[])
      .find((c) => raw.includes(c)) ?? null;
  } catch {
    return null;
  }
}

// The ONLY address a bounce may suppress is the intended recipient of
// the correlated message (REQ-5.5). Bounce texts quote many addresses
// (mailer-daemon, provider hops, forwarded headers) - picking the first
// email found would poison suppression, so we only accept a payload `to`
// entry or a body email that EXACTLY equals the lead's contact_email.
function bouncedRecipient(
  payload: Record<string, unknown>,
  text: string,
  intended: string | null,
): string | null {
  if (!intended) return null;
  const want = intended.toLowerCase();
  const to = payload?.to;
  if (Array.isArray(to)) {
    const hit = to.find((t) => typeof t === 'string' && t.toLowerCase() === want);
    if (hit) return want;
  }
  const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  return emails.some((e) => e.toLowerCase() === want) ? want : null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const rawBody = await req.text();
  if (!(await verifySvix(req, rawBody))) {
    return json(401, { error: 'bad_signature' });
  }
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: 'gtm' } });
  const svixId = req.headers.get('svix-id')!;

  // Idempotency: claim the provider event id first (REQ-5.2b).
  const { error: claimErr } = await svc.from('events').insert({
    kind: 'webhook_received',
    provider_event_id: svixId,
    payload: { raw_bytes: rawBody.length },
  });
  if (claimErr) {
    // Unique violation = replay -> acknowledge without reprocessing.
    if (claimErr.code === '23505') return json(200, { ok: true, deduped: true });
    return json(500, { error: 'event_claim_failed' });
  }

  // Any failure AFTER the claim must release the svix-id: returning 500
  // lets Resend redeliver, and the retry must NOT be answered `deduped`
  // or the reply is lost (r144-15).
  const releaseClaim = () =>
    svc.from('events').delete().eq('provider_event_id', svixId);

  try {
    return await handle(svc, svixId, rawBody);
  } catch (e) {
    await releaseClaim().catch(() => undefined);
    console.error('gtm-reply-webhook failed:', e);
    return json(500, { error: 'processing_failed' });
  }
});

// postgrest-js resolves DB/network errors into `{ error }` instead of
// throwing - without this gate every post-claim write failure would be
// swallowed and a 200 returned with the claim retained (r145 BLOCKER-2).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function orThrow<T extends { data: any; error: any }>(r: T, what: string) {
  if (r.error) throw new Error(`${what}: ${r.error.message ?? JSON.stringify(r.error)}`);
  return r.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Svc = { from: (t: string) => any };

async function handle(svc: Svc, svixId: string, rawBody: string): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json(200, { ok: true, note: 'unparseable_body' });
  }
  const data = (body.data ?? body) as Record<string, unknown>;
  // From can carry a display name ("Acme <info@acme.vn>") - strip the
  // bracketed form before any correlation/domain work (r145 MAJOR-3).
  const fromRaw = String(data.from ?? '');
  const fromAddr = (fromRaw.match(/<([^>]+)>/)?.[1] ?? fromRaw).trim().toLowerCase();
  const subject = String(data.subject ?? '');
  // `||` not `??`: a present-but-empty text field must fall back to the
  // HTML body or bounces/opt-outs classify blind (r145 MINOR-8).
  const text = String(data.text || data.html || '').slice(0, 8000);
  const inReplyTo = String(data.in_reply_to ?? data['in-reply-to'] ?? '');
  const headers = (data.headers ?? {}) as Record<string, string>;
  const refs = `${inReplyTo} ${headers['in-reply-to'] ?? ''} ${headers['references'] ?? ''}`;

  // Correlate to the original message.
  let message: Record<string, unknown> | null = null;
  const refIds = [...refs.matchAll(/[0-9a-f-]{20,}|<?[\w.+-]+@[\w.-]+>?/gi)].map((m) => m[0].replace(/[<>]/g, ''));
  if (refIds.length) {
    const found = orThrow(
      await svc
        .from('messages')
        .select('id, lead_id, provider_message_id')
        .in('provider_message_id', refIds),
      'ref correlation',
    );
    message = found?.[0] ?? null;
  }
  if (!message && fromAddr) {
    // Per-address correlation (ADR-4): lead by exact contact_email first,
    // then its latest sent message. The old shape read the 25 globally-
    // newest messages and lost any reply older than ~1 day (r145 MAJOR-4).
    const leads = orThrow(
      await svc.from('leads').select('id').eq('contact_email', fromAddr).limit(5),
      'lead lookup',
    );
    const ids = (leads ?? []).map((r) => r.id);
    if (ids.length) {
      const found = orThrow(
        await svc
          .from('messages')
          .select('id, lead_id, provider_message_id')
          .in('lead_id', ids)
          .eq('status', 'sent')
          .order('sent_at', { ascending: false })
          .limit(1),
        'from correlation',
      );
      message = found?.[0] ?? null;
    }
  }
  if (!message) {
    // Redact PII: domain keeps debug signal without storing addresses
    // or content in an admin-readable table (r109-8). Unique event id
    // makes a redelivery after a partial failure a safe no-op.
    const { error } = await svc.from('events').insert({
      kind: 'reply_unmatched',
      provider_event_id: `${svixId}:unmatched`,
      payload: { from_domain: fromAddr.split('@')[1] ?? null },
    });
    if (error && error.code !== '23505') throw new Error(`unmatched event: ${error.message}`);
    return json(200, { ok: true, unmatched: true });
  }

  const cls = classifyRule(fromAddr, subject, text)
    ?? (await llmClassify(subject, text))
    ?? 'question';
  const leadId = message.lead_id as string;

  // `provider_event_id` stamps the processing event: a redelivery after
  // a partial failure hits 23505 and continues - every remaining write
  // is itself idempotent so the retry COMPLETES the work instead of
  // duplicating an event (r145 MINOR-7).
  const { error: evErr } = await svc.from('events').insert({
    lead_id: leadId,
    message_id: message.id,
    kind: 'reply',
    provider_event_id: `${svixId}:reply`,
    payload: {
      classification: cls,
      from_domain: fromAddr.split('@')[1] ?? null,
      text_len: text.length,
    },
  });
  if (evErr && evErr.code !== '23505') throw new Error(`reply event: ${evErr.message}`);

  const statusMap: Record<Class, string> = {
    interested: 'replied', question: 'replied', not_now: 'sent',
    no: 'dead', wrong_contact: 'dead', bounce: 'bounced',
  };
  const needsHuman = cls === 'interested' || cls === 'question';
  const patch: Record<string, unknown> = {
    status: statusMap[cls],
    needs_human: needsHuman,
    updated_at: new Date().toISOString(),
  };
  // A human reply upgrades lawful_basis to 'relationship'; a bounce is
  // not a human reply and leaves the basis untouched.
  if (cls !== 'bounce') patch.lawful_basis = 'relationship';
  orThrow(await svc.from('leads').update(patch).eq('id', leadId), 'lead patch');

  if (cls === 'no' && fromAddr && !MAILER_DAEMON.test(fromAddr)) {
    orThrow(
      await svc.from('suppression').upsert(
        { value: fromAddr, kind: 'email', reason: 'opt-out reply', source: 'webhook' },
        { onConflict: 'value' },
      ),
      'opt-out suppression',
    );
    orThrow(
      await svc.from('leads').update({ status: 'suppressed' }).eq('id', leadId),
      'suppressed lead patch',
    );
  }
  if (cls === 'bounce') {
    const leadRow = orThrow(
      await svc.from('leads').select('contact_email').eq('id', leadId).limit(1),
      'lead lookup',
    );
    const recip = bouncedRecipient(data, text, leadRow?.[0]?.contact_email ?? null);
    if (recip && !MAILER_DAEMON.test(recip)) {
      orThrow(
        await svc.from('suppression').upsert(
          { value: recip, kind: 'email', reason: 'hard bounce', source: 'webhook' },
          { onConflict: 'value' },
        ),
        'bounce suppression',
      );
    }
  }
  return json(200, { ok: true, classification: cls });
}
