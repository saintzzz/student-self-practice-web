// CR-109 send agent: human-approved queue -> Resend.
//
//   node scripts/gtm/send.mjs [--limit 20]
//
// Gates (REQ-4.x, AC-109.4/109.12):
//   GTM_SEND_ENABLED=1 required - else dry-run, zero provider calls.
//   Per message: footer sentinel + lead.contact_email + lawful_basis +
//   provenance + suppression (re-checked at send time) + daily cap +
//   CAS claim queued->sent (two runners can't double-send).

import { basename } from 'node:path';
import {
  arg, gtmAll, gtmCount, gtmPatch, gtmPost, H, hasFlag, recordRun, URL_,
} from './lib.mjs';

const redact = (e) => e.replace(/^(.{1,2}).*(@.*)$/, '$1***$2');

const t0 = Date.now();
const ENABLED = process.env.GTM_SEND_ENABLED === '1';
const CAP = Number(process.env.GTM_DAILY_CAP ?? 20);
const limit = Math.min(Number(arg('--limit', CAP)), CAP);
const FROM = process.env.GTM_FROM ?? 'VieSchool <hello@go.vieschool.com>';
const RESEND_KEY = process.env.GTM_RESEND_API_KEY ?? process.env.RESEND_API_KEY ?? '';
const FORCE = hasFlag('--dry');

async function resendSend({ to, subject, body }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, text: body }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`resend ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.id ?? null;
}

async function rpcIsSuppressed(email) {
  const res = await fetch(`${URL_()}/rest/v1/rpc/is_suppressed`, {
    method: 'POST',
    headers: H(),
    body: JSON.stringify({ p_email: email }),
  });
  if (!res.ok) throw new Error(`is_suppressed rpc: ${res.status}`);
  return res.json();
}

// PostgREST filter values ride inside the URL query - a `+` in an ISO
// offset decodes as a space and corrupts the filter (r146 MAJOR-1).
const FV = (v) => encodeURIComponent(v);

async function main() {
  // Reap stranded claims first: a runner that died between the CAS flip
  // and the status patch left rows in 'sending' forever (r145 MAJOR-5).
  // 15min > the longest resend timeout + patch latency. Rows carrying a
  // provider_message_id are EXCLUDED: the mail was already delivered,
  // requeueing would double-send (r146 MINOR-2).
  const staleBefore = FV(new Date(Date.now() - 15 * 60e3).toISOString());
  await gtmPatch('messages', `status=eq.sending&provider_message_id=is.null&updated_at=lt.${staleBefore}`, { status: 'queued' })
    .catch(() => null);
  // Daily-cap day = Asia/Ho_Chi_Minh (UTC+7, no DST), not UTC - a UTC
  // boundary lets one VN day send ~2x the cap across the 07:00 edge
  // (r145 MINOR-10).
  const vnToday = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
  const sentToday = await gtmCount('events', `kind=eq.sent&created_at=gte.${FV(`${vnToday}T00:00:00+07:00`)}`);
  const budget = Math.max(0, Math.min(limit, CAP - sentToday));
  const rows = await gtmAll(
    'messages',
    'id,lead_id,kind,subject,body,leads!inner(id,name,contact_email,lawful_basis,source,source_url,status)',
    'status=eq.queued',
    'created_at',
  );
  const queue = rows.slice(0, budget);
  const stats = {
    enabled: ENABLED && !FORCE, queued_total: rows.length, budget,
    sent: 0, skipped: 0, failed: 0, reasons: {},
  };
  const errors = [];
  for (const m of queue) {
    const lead = m.leads;
    const skip = (reason) => { stats.skipped++; stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1; };
    if (!lead?.contact_email) { skip('no_email'); continue; }
    if (!lead.lawful_basis || !lead.source || !lead.source_url) { skip('no_lawful_basis'); continue; }
    if (lead.status === 'suppressed') { skip('lead_suppressed'); continue; }
    if (!m.body?.includes('VieSchool - nền tảng luyện tiếng Anh tiểu học') || !m.body?.includes('trả lời "KHÔNG"')) {
      skip('footer_missing'); continue;
    }
    if (await rpcIsSuppressed(lead.contact_email)) { skip('suppressed'); continue; }
    if (!(stats.enabled)) {
      console.log(`[dry] would send -> ${redact(lead.contact_email)} | ${m.subject.slice(0, 60)}`);
      stats.sent++;
      continue;
    }
    // CAS claim: only the runner that flips queued->sending proceeds.
    // updated_at stamps claim time so the reaper can tell a crashed
    // claim from a fresh one.
    const claimed = await gtmPatch(
      'messages',
      `id=eq.${m.id}&status=eq.queued`,
      { status: 'sending', updated_at: new Date().toISOString() },
      'return=representation',
    ).catch(() => null);
    if (!claimed?.length) { skip('claim_lost'); continue; }
    try {
      const pid = await resendSend({ to: lead.contact_email, subject: m.subject, body: m.body });
      // Provider accepted the mail - a bookkeeping blip must NOT mark it
      // 'failed' or a re-approve sends a duplicate (r145 MINOR-9).
      try {
        await gtmPatch('messages', `id=eq.${m.id}`, { status: 'sent', provider_message_id: pid, sent_at: new Date().toISOString() });
        await gtmPatch('leads', `id=eq.${lead.id}&status=in.(enriched,queued)`, { status: 'sent' });
        await gtmPost('events', [{ lead_id: lead.id, message_id: m.id, kind: 'sent', payload: { provider_message_id: pid, to_domain: lead.contact_email.split('@')[1] ?? null } }]);
      } catch (be) {
        // Best-effort: force the message row to 'sent' WITH the provider
        // id - a surviving pid keeps the reaper from ever requeueing a
        // delivered mail even if this patch is the only write that lands
        // (r146 MINOR-2). The pid also goes into the run error so a fully
        // down DB still leaves a recoverable record.
        await gtmPatch('messages', `id=eq.${m.id}`, {
          status: 'sent', provider_message_id: pid, sent_at: new Date().toISOString(),
        }).catch(() => null);
        errors.push({ msg_id: m.id, provider_message_id: pid, err: `bookkeeping after send: ${be.message}` });
      }
      stats.sent++;
    } catch (e) {
      await gtmPatch('messages', `id=eq.${m.id}`, { status: 'failed' });
      errors.push({ msg_id: m.id, err: e.message });
      stats.failed++;
    }
  }
  await recordRun('send', stats, { ms: Date.now() - t0, errors: errors.length ? errors : null });
  console.log(`send: queued=${rows.length} sent=${stats.sent} skipped=${stats.skipped} failed=${stats.failed} dry=${!stats.enabled}`);
}

// Run only as a direct script - tests import the pure helpers.
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]));
if (invokedDirectly) {
  main().catch(async (e) => {
    await recordRun('send', { fatal: e.message }, { ms: Date.now() - t0, errors: [{ msg: e.message }] });
    console.error(`send failed: ${e.message}`);
    process.exit(1);
  });
}