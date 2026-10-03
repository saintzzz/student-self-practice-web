-- CR-45: server copy of the per-account engagement state (stars,
-- streak, stickers, daily quest, review queue, pet, badge stats).
-- One row per account; the client stores the whole EngagementState as
-- jsonb - the merge logic lives client-side (max-merge, idempotent).
-- Default-deny RLS like every practice table: self row only, admin all.

create table practice.engagement_state (
  account_id uuid primary key references practice.accounts(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table practice.engagement_state enable row level security;

revoke all on practice.engagement_state from anon, authenticated, service_role;
grant select, insert, update on practice.engagement_state to authenticated;
grant all on practice.engagement_state to service_role;

create policy engagement_admin_all on practice.engagement_state
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
create policy engagement_self_read on practice.engagement_state
  for select to authenticated
  using (account_id = (select auth.uid()));
create policy engagement_self_insert on practice.engagement_state
  for insert to authenticated
  with check (account_id = (select auth.uid()));
create policy engagement_self_update on practice.engagement_state
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

-- keep updated_at honest on upsert (merge churn is client-side).
create or replace function practice.touch_engagement_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger engagement_state_touch
  before update on practice.engagement_state
  for each row execute function practice.touch_engagement_updated_at();
