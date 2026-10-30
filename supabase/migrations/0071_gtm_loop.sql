-- CR-110: autonomous outreach loop - inbox reply state + demo accounts.
-- Reply intents drive the loop: consult -> notify owner, trial -> provision
-- a 24h demo teacher account (expires_at enforced by provision script).

create table if not exists gtm.inbox_replies (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references gtm.leads(id) on delete set null,
  gmail_message_id text unique not null,
  thread_id text,
  from_email text not null,
  subject text,
  snippet text,
  intent text not null default 'unclassified'
    check (intent in ('consult','trial','unsubscribe','bounce','unclassified')),
  phone text,
  status text not null default 'new'
    check (status in ('new','notified','answered','suppressed')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inbox_replies_status_idx on gtm.inbox_replies(status, created_at desc);
create index if not exists inbox_replies_lead_idx on gtm.inbox_replies(lead_id);

-- Demo teacher accounts handed out on trial requests. Expiry is a hard
-- cutoff the provision/expire script enforces; the credentials email tells
-- the teacher the window up front.
create table if not exists gtm.demo_accounts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references gtm.leads(id) on delete set null,
  email text not null,
  auth_user_id uuid,
  role text not null default 'demo_teacher',
  expires_at timestamptz not null,
  expired_at timestamptz,
  credentials_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists demo_accounts_expiry_idx on gtm.demo_accounts(expires_at) where expired_at is null;

alter table gtm.inbox_replies enable row level security;
alter table gtm.demo_accounts enable row level security;
grant select, insert, update on gtm.inbox_replies to service_role;
grant select, insert, update on gtm.demo_accounts to service_role;
-- service-role only, same posture as other gtm tables (checked in 0070).
