-- CR-131: one-tap "Báo lỗi câu này" reports from the explanation panel.
-- Default-deny like every practice table: authenticated insert of own
-- row, self read, admin all. question_id is text so it covers both
-- qb_questions ids and generated question ids.

create table practice.question_reports (
  id bigint generated always as identity primary key,
  question_id text not null,
  account_id uuid not null,
  kind text not null check (kind in ('wrong-answer', 'typo', 'confusing', 'audio', 'other')),
  note text check (note is null or char_length(note) <= 200),
  context text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);

alter table practice.question_reports enable row level security;

revoke all on practice.question_reports from anon, authenticated, service_role;
grant insert, select on practice.question_reports to authenticated;
grant all on practice.question_reports to service_role;

create policy question_reports_self_insert on practice.question_reports
  for insert to authenticated
  with check (account_id = (select auth.uid()));

create policy question_reports_self_read on practice.question_reports
  for select to authenticated
  using (account_id = (select auth.uid()));

create policy question_reports_admin_all on practice.question_reports
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));

create index question_reports_question_idx
  on practice.question_reports (question_id, created_at desc);
