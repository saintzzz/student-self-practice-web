-- CR-08: dedicated `practice` schema on project cxjpgfhqchjoernfmcra.
-- Applied via MCP execute_sql (advisory A-25); this file is the record.
-- Everything is default-deny: RLS on every table, grants only to the
-- roles that need them, nothing to `anon` (guests never reach the API).

create schema if not exists practice;

-- Expose `practice` in the Data API alongside `public` (manual mode;
-- the Dashboard "Exposed schemas" list no longer manages this setting).
alter role authenticator set pgrst.db_schemas = 'public, practice';
notify pgrst, 'reload config';

grant usage on schema practice to authenticated, service_role;

-- ---------------------------------------------------------------------
-- accounts: app-facing mirror of auth.users (created via Edge Function)
-- ---------------------------------------------------------------------
create table practice.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'student')),
  created_at timestamptz not null default now(),
  constraint accounts_username_format check (username ~ '^[a-z0-9_-]{3,20}$')
);

create table practice.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade_id text not null check (grade_id in
    ('grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5')),
  school_year text,
  created_by uuid references practice.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table practice.enrollments (
  class_id uuid not null references practice.classes(id) on delete cascade,
  student_id uuid not null references practice.accounts(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index enrollments_student_idx on practice.enrollments (student_id);

create table practice.class_grade_scopes (
  class_id uuid not null references practice.classes(id) on delete cascade,
  grade_id text not null check (grade_id in
    ('grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5')),
  primary key (class_id, grade_id)
);

-- ---------------------------------------------------------------------
-- is_admin(): one lookup used by every admin policy. security definer
-- avoids the infinite-recursion trap of a policy on `accounts` that
-- reads `accounts` itself.
-- ---------------------------------------------------------------------
create or replace function practice.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from practice.accounts a
    where a.id = (select auth.uid()) and a.role = 'admin'
  );
$$;

-- Only invocable inside policies / by signed-in users; the host app's
-- public REST surface cannot reach a routine in `practice`.
revoke all on function practice.is_admin() from public, anon;
grant execute on function practice.is_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Grants (role reachability) + RLS (row visibility).
-- No default-privilege reliance: explicit revoke then grant minimum.
-- ---------------------------------------------------------------------
alter table practice.accounts enable row level security;
alter table practice.classes enable row level security;
alter table practice.enrollments enable row level security;
alter table practice.class_grade_scopes enable row level security;

revoke all on practice.accounts from anon, authenticated, service_role;
revoke all on practice.classes from anon, authenticated, service_role;
revoke all on practice.enrollments from anon, authenticated, service_role;
revoke all on practice.class_grade_scopes from anon, authenticated, service_role;

grant select on practice.accounts to authenticated;
grant all on practice.accounts to service_role;

grant select, insert, update, delete on practice.classes to authenticated;
grant all on practice.classes to service_role;

grant select, insert, update, delete on practice.enrollments to authenticated;
grant all on practice.enrollments to service_role;

grant select, insert, update, delete on practice.class_grade_scopes to authenticated;
grant all on practice.class_grade_scopes to service_role;

-- Keep future tables in this schema from silently inheriting broad
-- default privileges.
alter default privileges for role postgres in schema practice
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema practice
  revoke all on routines from anon, authenticated;
alter default privileges for role postgres in schema practice
  revoke all on sequences from anon, authenticated;

-- accounts: admin everything; a user may read only their own row.
create policy accounts_admin_all on practice.accounts
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
create policy accounts_self_read on practice.accounts
  for select to authenticated
  using (id = (select auth.uid()));

-- classes: admin everything; students see classes they are enrolled in.
create policy classes_admin_all on practice.classes
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
create policy classes_student_read on practice.classes
  for select to authenticated
  using (exists (
    select 1 from practice.enrollments e
    where e.class_id = classes.id
      and e.student_id = (select auth.uid())
  ));

-- enrollments: admin everything; a student sees only their own rows.
create policy enrollments_admin_all on practice.enrollments
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
create policy enrollments_self_read on practice.enrollments
  for select to authenticated
  using (student_id = (select auth.uid()));

-- scopes: admin everything; a student sees scopes of enrolled classes.
create policy scopes_admin_all on practice.class_grade_scopes
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
create policy scopes_student_read on practice.class_grade_scopes
  for select to authenticated
  using (exists (
    select 1 from practice.enrollments e
    where e.class_id = class_grade_scopes.class_id
      and e.student_id = (select auth.uid())
  ));
