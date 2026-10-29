/**
 * CR-109 gtm client helpers: the Outreach admin tab's only door into
 * the gtm schema. Reads go through a `schema('gtm')` scope on the
 * shared practice client; writes are RPC-only (approve/reject/
 * suppress) or column-granted updates (body, review_notes, lead
 * status/needs_human) - messages.status is never client-writable.
 */

import { getSupabase } from '../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any, any, any>;

export type LeadStatus =
  | 'staged' | 'dropped' | 'enriched' | 'cold' | 'queued' | 'sent'
  | 'replied' | 'meeting' | 'customer' | 'bounced' | 'dead' | 'suppressed';

export interface GtmLead {
  id: string;
  campaign_id: string | null;
  name: string;
  segment: 'center' | 'school' | 'unknown';
  city: string | null;
  phone: string | null;
  website: string | null;
  contact_email: string | null;
  source: string;
  source_url: string | null;
  status: LeadStatus;
  fit: number | null;
  fit_reason: string | null;
  needs_human: boolean;
  created_at: string;
}

export interface GtmMessage {
  id: string;
  lead_id: string;
  kind: 'initial' | 'followup';
  subject: string;
  body: string;
  status: 'pending_review' | 'queued' | 'sending' | 'sent' | 'failed' | 'rejected';
  edited: boolean;
  review_notes: string | null;
  created_at: string;
  leads?: { name: string; contact_email: string | null } | null;
}

export interface GtmCampaign {
  id: string;
  name: string;
  segment: string;
  province: string | null;
  status: string;
  created_at: string;
}

export interface GtmSuppression {
  value: string;
  kind: 'email' | 'domain';
  reason: string | null;
  source: string;
  created_at: string;
}

export interface PipelineCounts {
  total: number;
  byStatus: Partial<Record<LeadStatus, number>>;
  needsHuman: number;
  /** true when the page cap was hit - counts are a lower bound, not exact. */
  truncated: boolean;
}

const gtm = (c: Client) => c.schema('gtm');

export async function fetchCampaigns(): Promise<GtmCampaign[]> {
  const c = await getSupabase();
  const { data, error } = await gtm(c)
    .from('campaigns')
    .select('id,name,segment,province,status,created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchLeads(opts: {
  segment?: string;
  status?: string;
  minFit?: number;
  campaignId?: string;
  limit?: number;
}): Promise<GtmLead[]> {
  const c = await getSupabase();
  let q = gtm(c)
    .from('leads')
    .select('id,campaign_id,name,segment,city,phone,website,contact_email,source,source_url,status,fit,fit_reason,needs_human,created_at')
    .order('fit', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.segment && opts.segment !== 'all') q = q.eq('segment', opts.segment);
  if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);
  if (opts.minFit != null) q = q.gte('fit', opts.minFit);
  if (opts.campaignId) q = q.eq('campaign_id', opts.campaignId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchDrafts(): Promise<GtmMessage[]> {
  const c = await getSupabase();
  const { data, error } = await gtm(c)
    .from('messages')
    .select('id,lead_id,kind,subject,body,status,edited,review_notes,created_at,leads(name,contact_email)')
    // 'sending' included so a stranded CAS claim is visible/editable -
    // a body edit demotes it back to pending_review via body_gate
    // (the agent reaper also requeues claims stale > 15min).
    .in('status', ['pending_review', 'queued', 'sending', 'failed'])
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  // supabase-js types the joined `leads` as an array; runtime is a
  // single object for the many-to-one edge.
  return (data ?? []) as unknown as GtmMessage[];
}

const PAGE_CAP = 5000;

export async function fetchPipeline(): Promise<PipelineCounts> {
  const c = await getSupabase();
  const { data, error } = await gtm(c).from('leads').select('status,needs_human').limit(PAGE_CAP);
  if (error) throw new Error(error.message);
  const byStatus: PipelineCounts['byStatus'] = {};
  let needsHuman = 0;
  for (const r of data ?? []) {
    byStatus[r.status as LeadStatus] = (byStatus[r.status as LeadStatus] ?? 0) + 1;
    if (r.needs_human) needsHuman++;
  }
  // Honest bound: at cap the numbers are a lower bound and the UI says so.
  return { total: data?.length ?? 0, byStatus, needsHuman, truncated: (data?.length ?? 0) >= PAGE_CAP };
}

export async function fetchStats(): Promise<{
  sent: number; replies: number; meetings: number; truncated: boolean;
  runs: { agent: string; stats: Record<string, unknown>; llm_calls: number; cost_estimate: number | null; created_at: string }[];
}> {
  const c = await getSupabase();
  const [ev, runs] = await Promise.all([
    gtm(c).from('events').select('kind,payload').in('kind', ['sent', 'reply']).limit(PAGE_CAP),
    gtm(c).from('runs').select('agent,stats,llm_calls,cost_estimate,created_at').order('created_at', { ascending: false }).limit(20),
  ]);
  if (ev.error) throw new Error(ev.error.message);
  if (runs.error) throw new Error(runs.error.message);
  const sent = (ev.data ?? []).filter((e) => e.kind === 'sent').length;
  const replies = (ev.data ?? []).filter(
    (e) => e.kind === 'reply' && ['interested', 'question'].includes(String((e.payload as { classification?: string })?.classification)),
  ).length;
  // Same honest-bound rule as fetchPipeline: at cap the stats are a
  // lower bound and the UI must say so (r145 MAJOR-6).
  return { sent, replies, meetings: 0, truncated: (ev.data?.length ?? 0) >= PAGE_CAP, runs: runs.data ?? [] };
}

export async function approveMessage(id: string): Promise<void> {
  const c = await getSupabase();
  const { error } = await gtm(c).rpc('gtm_approve_message', { p_message_id: id });
  if (error) throw new Error(error.message);
}

export async function rejectMessage(id: string, reason?: string): Promise<void> {
  const c = await getSupabase();
  const { error } = await gtm(c).rpc('gtm_reject_message', { p_message_id: id, p_reason: reason ?? null });
  if (error) throw new Error(error.message);
}

/** Column-granted edit path: body + review_notes only (status is not
 *  client-writable - approve RPC owns the transition). `edited` is
 *  stamped by the body_gate trigger - it is intentionally not granted
 *  so the flag can't be forged from the client. */
export async function editDraft(id: string, body: string): Promise<void> {
  const c = await getSupabase();
  const { error } = await gtm(c).from('messages').update({ body }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setLeadStatus(
  id: string,
  status: LeadStatus,
  opts: { needsHuman?: boolean; from?: LeadStatus } = {},
): Promise<void> {
  const c = await getSupabase();
  const patch: { status: LeadStatus; needs_human?: boolean } = { status };
  if (opts.needsHuman !== undefined) patch.needs_human = opts.needsHuman;
  // CAS: callers pass the status they observed - a concurrent transition
  // (agent run, another admin) silently steals the row otherwise.
  let q = gtm(c).from('leads').update(patch).eq('id', id);
  if (opts.from) q = q.eq('status', opts.from);
  const { data, error } = await q.select('id');
  if (error) throw new Error(error.message);
  if (opts.from && !(data ?? []).length) {
    throw new Error(`Lead đã chuyển trạng thái - tải lại trước khi thao tác.`);
  }
}

export async function fetchSuppression(): Promise<GtmSuppression[]> {
  const c = await getSupabase();
  const { data, error } = await gtm(c).from('suppression').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addSuppression(value: string, kind: 'email' | 'domain', reason?: string): Promise<void> {
  const c = await getSupabase();
  const { error } = await gtm(c).rpc('gtm_suppress', { p_value: value, p_reason: reason ?? null, p_kind: kind });
  if (error) throw new Error(error.message);
}

export async function removeSuppression(value: string): Promise<void> {
  const c = await getSupabase();
  const { error } = await gtm(c).from('suppression').delete().eq('value', value.toLowerCase().trim());
  if (error) throw new Error(error.message);
}
