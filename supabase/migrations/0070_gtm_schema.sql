-- CR-109: gtm schema - outbound lead pipeline for VieSchool B2B.
--
-- Holds organizations (English centers / private schools), outreach
-- drafts pending human approval, send/reply events, suppression list,
-- and agent run telemetry. Org-level business contact data only -
-- never student/parent PII (INTENT ruling: no B2C).
--
-- Access model mirrors practice.*: scripts + webhook use service_role
-- (RLS bypass); the admin UI gets SELECT via `practice.is_admin()`
-- policies plus narrow column UPDATEs for draft editing and pipeline
-- bookkeeping. Status transitions that gate sends are impossible from
-- the client: `messages.status` is not updatable by authenticated
-- role - only the gtm_approve_message / gtm_reject_message RPCs can
-- move it, and the queue trigger requires an approval artifact whose
-- body hash matches the CURRENT body (edit-after-approve must be
-- re-approved).

create extension if not exists pgcrypto;
create schema if not exists gtm;

grant usage on schema gtm to authenticated, service_role;

-- ---------------------------------------------------------------------
-- campaigns: named batches (province x segment x date)
-- ---------------------------------------------------------------------
create table gtm.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text not null check (segment in ('center', 'school', 'mixed')),
  province text,
  status text not null default 'active' check (status in ('active', 'paused', 'done')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- leads: org-level prospects. dedupe_key is the upsert anchor.
-- ---------------------------------------------------------------------
create table gtm.leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references gtm.campaigns(id) on delete set null,
  name text not null,
  segment text not null default 'unknown' check (segment in ('center', 'school', 'unknown')),
  address text,
  city text,
  phone text,
  website text,
  contact_email text,
  source text not null,
  source_url text,
  lawful_basis text check (lawful_basis in ('public_business_contact', 'relationship')),
  status text not null default 'staged' check (status in (
    'staged', 'dropped', 'enriched', 'cold', 'queued', 'sent',
    'replied', 'meeting', 'customer', 'bounced', 'dead', 'suppressed'
  )),
  fit smallint check (fit between 0 and 10),
  fit_reason text,
  signals jsonb,
  drop_reason text,
  needs_human boolean not null default false,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index leads_dedupe_key_key on gtm.leads (dedupe_key);
create index leads_status_idx on gtm.leads (status);
create index leads_campaign_idx on gtm.leads (campaign_id);

-- ---------------------------------------------------------------------
-- messages: outreach drafts + sends. unique(lead_id, kind) enforces the
-- one-initial + one-followup contract (REQ-4.4).
-- ---------------------------------------------------------------------
create table gtm.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references gtm.leads(id) on delete cascade,
  kind text not null check (kind in ('initial', 'followup')),
  subject text not null,
  body text not null,
  status text not null default 'pending_review' check (status in (
    'pending_review', 'queued', 'sending', 'sent', 'failed', 'rejected'
  )),
  edited boolean not null default false,
  review_notes text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  -- stamped by the queued->sending CAS claim; the send agent reaper
  -- requeues 'sending' rows whose stamp is older than 15min.
  updated_at timestamptz not null default now(),
  unique (lead_id, kind)
);
create index messages_status_idx on gtm.messages (status);

-- ---------------------------------------------------------------------
-- message_approvals: the only door to 'queued' (REQ-3.6).
-- ---------------------------------------------------------------------
create table gtm.message_approvals (
  message_id uuid primary key references gtm.messages(id) on delete cascade,
  approver_uid uuid not null,
  body_sha256 text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- suppression: do-not-contact by exact email or domain (REQ-4.1, 5.4/5.5)
-- ---------------------------------------------------------------------
create table gtm.suppression (
  value text primary key,           -- lower(email) or domain
  kind text not null check (kind in ('email', 'domain')),
  reason text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- events: send/reply/classify/bounce audit trail. provider_event_id is
-- the webhook idempotency key (REQ-5.2b).
-- ---------------------------------------------------------------------
create table gtm.events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references gtm.leads(id) on delete set null,
  message_id uuid references gtm.messages(id) on delete set null,
  kind text not null,
  payload jsonb,
  provider_event_id text unique,
  created_at timestamptz not null default now()
);
create index events_lead_idx on gtm.events (lead_id);
create index events_kind_idx on gtm.events (kind);

-- ---------------------------------------------------------------------
-- runs: one row per agent run (REQ-7.1)
-- ---------------------------------------------------------------------
create table gtm.runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  campaign_id uuid references gtm.campaigns(id) on delete set null,
  stats jsonb not null default '{}'::jsonb,
  llm_calls int not null default 0,
  cost_estimate numeric(10,4),
  duration_ms int,
  errors jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------

-- has_footer(body): mandated opt-out footer sentinel check (REQ-3.5).
create or replace function gtm.has_footer(p_body text)
returns boolean
language sql
immutable
set search_path = ''
as $function$
  select coalesce(p_body, '') like '%VieSchool - nền tảng luyện tiếng Anh tiểu học%'
     and coalesce(p_body, '') like '%trả lời "KHÔNG"%';
$function$;

-- is_suppressed(email): exact email or domain match (REQ-4.1).
create or replace function gtm.is_suppressed(p_email text)
returns boolean
language sql
stable
set search_path = ''
as $function$
  select exists (
    select 1
    from gtm.suppression s
    where (s.kind = 'email' and s.value = lower(p_email))
       or (s.kind = 'domain' and s.value = lower(split_part(p_email, '@', 2)))
  );
$function$;

revoke all on function gtm.has_footer(text) from public, anon;
revoke all on function gtm.is_suppressed(text) from public, anon;
grant execute on function gtm.has_footer(text) to authenticated, service_role;
grant execute on function gtm.is_suppressed(text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- queue gate trigger (REQ-3.6, AC-109.13)
-- ---------------------------------------------------------------------
create or replace function gtm.messages_queue_gate()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status = 'queued' and (TG_OP = 'INSERT' or old.status is distinct from 'queued') then
    if not exists (
      select 1
      from gtm.message_approvals a
      where a.message_id = new.id
        and a.body_sha256 = encode(extensions.digest(new.body, 'sha256'), 'hex')
    ) then
      raise exception 'queue_gate_denied: message % has no approval matching its current body', new.id
        using errcode = 'P0001';
    end if;
    if not (select gtm.has_footer(new.body)) then
      raise exception 'queue_gate_denied: message % lacks the mandated opt-out footer', new.id
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$function$;

-- INSERT OR UPDATE of status: a direct INSERT with status='queued'
-- must hit the same approval/footer gate (review finding r109-1).
drop trigger if exists messages_queue_gate on gtm.messages;
create trigger messages_queue_gate
  before insert or update of status on gtm.messages
  for each row
  execute function gtm.messages_queue_gate();

revoke all on function gtm.messages_queue_gate() from public, anon;

-- Editing a queued/sending body voids the approval: the row falls back
-- to pending_review and needs a fresh approval whose hash matches the
-- NEW body (edit-after-approve cannot smuggle content past the gate).
create or replace function gtm.messages_body_gate()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.body is distinct from old.body then
    new.edited := true;
    if old.status in ('queued', 'sending') then
      new.status := 'pending_review';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists messages_body_gate on gtm.messages;
create trigger messages_body_gate
  before update of body on gtm.messages
  for each row
  execute function gtm.messages_body_gate();

revoke all on function gtm.messages_body_gate() from public, anon;

-- ---------------------------------------------------------------------
-- RPCs (security definer + is_admin guard)
-- ---------------------------------------------------------------------
create or replace function gtm.gtm_approve_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_body text;
  v_status text;
begin
  if not (select practice.is_admin()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  select body, status into v_body, v_status
  from gtm.messages where id = p_message_id for update;
  if v_body is null then
    raise exception 'message_not_found' using errcode = 'P0002';
  end if;
  if v_status <> 'pending_review' then
    raise exception 'invalid_status: %', v_status using errcode = 'P0001';
  end if;
  if not (select gtm.has_footer(v_body)) then
    raise exception 'footer_missing' using errcode = 'P0001';
  end if;
  insert into gtm.message_approvals (message_id, approver_uid, body_sha256)
  values (p_message_id, auth.uid(), encode(extensions.digest(v_body, 'sha256'), 'hex'))
  on conflict (message_id) do update
    set approver_uid = excluded.approver_uid,
        body_sha256 = excluded.body_sha256,
        created_at = now();
  update gtm.messages set status = 'queued' where id = p_message_id;
  update gtm.leads set status = 'queued', updated_at = now()
  where id = (select lead_id from gtm.messages where id = p_message_id)
    and status = 'enriched';
end;
$function$;

create or replace function gtm.gtm_reject_message(p_message_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not (select practice.is_admin()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  update gtm.messages
  set status = 'rejected', review_notes = coalesce(p_reason, review_notes)
  where id = p_message_id and status in ('pending_review', 'queued');
  if not found then
    raise exception 'invalid_status_or_missing' using errcode = 'P0002';
  end if;
  delete from gtm.message_approvals where message_id = p_message_id;
end;
$function$;

create or replace function gtm.gtm_suppress(p_value text, p_reason text default null, p_kind text default 'email')
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_value text := lower(trim(p_value));
begin
  if not (select practice.is_admin()) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if v_value = '' or position('@' in v_value) = 0 and p_kind = 'email' then
    raise exception 'invalid_value' using errcode = 'P0001';
  end if;
  insert into gtm.suppression (value, kind, reason, source)
  values (v_value, p_kind, p_reason, 'admin')
  on conflict (value) do nothing;
  update gtm.leads
  set status = 'suppressed', updated_at = now()
  where status not in ('customer', 'dead', 'suppressed')
    and (
      lower(coalesce(contact_email, '')) = v_value
      or lower(split_part(coalesce(contact_email, ''), '@', 2)) = v_value
    );
  update gtm.messages m
  set status = 'rejected', review_notes = 'suppressed: ' || v_value
  from gtm.leads l
  where m.lead_id = l.id
    and m.status in ('pending_review', 'queued')
    and (
      lower(coalesce(l.contact_email, '')) = v_value
      or lower(split_part(coalesce(l.contact_email, ''), '@', 2)) = v_value
    );
end;
$function$;

revoke all on function gtm.gtm_approve_message(uuid) from public, anon;
revoke all on function gtm.gtm_reject_message(uuid, text) from public, anon;
revoke all on function gtm.gtm_suppress(text, text, text) from public, anon;
grant execute on function gtm.gtm_approve_message(uuid) to authenticated, service_role;
grant execute on function gtm.gtm_reject_message(uuid, text) to authenticated, service_role;
grant execute on function gtm.gtm_suppress(text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------
alter table gtm.campaigns enable row level security;
alter table gtm.leads enable row level security;
alter table gtm.messages enable row level security;
alter table gtm.message_approvals enable row level security;
alter table gtm.suppression enable row level security;
alter table gtm.events enable row level security;
alter table gtm.runs enable row level security;

create policy gtm_admin_read on gtm.campaigns for select to authenticated
  using ((select practice.is_admin()));
create policy gtm_admin_read on gtm.leads for select to authenticated
  using ((select practice.is_admin()));
create policy gtm_admin_read on gtm.messages for select to authenticated
  using ((select practice.is_admin()));
create policy gtm_admin_read on gtm.message_approvals for select to authenticated
  using ((select practice.is_admin()));
create policy gtm_admin_read on gtm.suppression for select to authenticated
  using ((select practice.is_admin()));
create policy gtm_admin_read on gtm.events for select to authenticated
  using ((select practice.is_admin()));
create policy gtm_admin_read on gtm.runs for select to authenticated
  using ((select practice.is_admin()));

-- Update policies limited to the columns the UI legitimately edits.
create policy gtm_admin_update_body on gtm.messages for update to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
create policy gtm_admin_update_lead on gtm.leads for update to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
-- Column grants without a matching DML policy silently no-op (the
-- delete below is what the UI's "Bỏ" button needs).
create policy gtm_admin_delete_suppression on gtm.suppression for delete to authenticated
  using ((select practice.is_admin()));

grant select on gtm.campaigns, gtm.leads, gtm.message_approvals,
  gtm.suppression, gtm.events, gtm.runs to authenticated;
grant select, update (body, review_notes) on gtm.messages to authenticated;
grant select, update (status, needs_human) on gtm.leads to authenticated;
-- delete-only client path: inserts go through gtm_suppress (security
-- definer), so an unexercisable insert grant is just noise (r145-13).
grant select, delete on gtm.suppression to authenticated;

-- service_role bypasses RLS but still needs table privileges.
grant all on gtm.campaigns, gtm.leads, gtm.messages, gtm.message_approvals,
  gtm.suppression, gtm.events, gtm.runs to service_role;

-- PostgREST must expose the gtm schema for both REST callers and the
-- browser client (`.schema('gtm')`); reload cache so it takes effect.
alter role authenticator set pgrst.db_schemas = 'public, practice, gtm';
notify pgrst, 'reload schema';

revoke all on gtm.campaigns, gtm.leads, gtm.messages, gtm.message_approvals,
  gtm.suppression, gtm.events, gtm.runs from public, anon;
