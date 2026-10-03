-- CR-31: weekly parent report email.
-- 1) parent_contacts: one real email per student account. Default-deny
--    RLS like every practice table - self row only, admin all.
-- 2) send_weekly_reports(): SECURITY DEFINER, callable only by the cron
--    step. Aggregates 7 days of practice.results per opted-in contact
--    and queues a Resend send via pg_net. Key lives in Vault, never in
--    this file.
-- 3) cron job: Sundays 12:00 UTC = 19:00 Asia/Ho_Chi_Minh.

create table practice.parent_contacts (
  account_id uuid primary key references practice.accounts(id) on delete cascade,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  opted_in boolean not null default true,
  updated_at timestamptz not null default now(),
  last_sent_at timestamptz
);

alter table practice.parent_contacts enable row level security;

revoke all on practice.parent_contacts from anon, authenticated, service_role;
grant select, insert, update, delete on practice.parent_contacts to authenticated;
grant all on practice.parent_contacts to service_role;

create policy parent_contacts_admin_all on practice.parent_contacts
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
create policy parent_contacts_self_read on practice.parent_contacts
  for select to authenticated
  using (account_id = (select auth.uid()));
create policy parent_contacts_self_insert on practice.parent_contacts
  for insert to authenticated
  with check (account_id = (select auth.uid()));
create policy parent_contacts_self_update on practice.parent_contacts
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));
create policy parent_contacts_self_delete on practice.parent_contacts
  for delete to authenticated
  using (account_id = (select auth.uid()));

-- -------------------------------------------------------------------
-- send_weekly_reports(): one Resend call per opted-in contact with
-- any activity in the trailing 7 days. Idempotent per UTC day via
-- last_sent_at.
-- -------------------------------------------------------------------
create or replace function practice.send_weekly_reports()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_row record;
  v_stats record;
  v_sent int := 0;
  v_subject text;
  v_html text;
begin
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;

  if v_key is null then
    raise warning 'send_weekly_reports: resend_api_key missing from vault';
    return 0;
  end if;

  for v_row in
    select pc.account_id, pc.email, a.display_name
    from practice.parent_contacts pc
    join practice.accounts a on a.id = pc.account_id
    where pc.opted_in
      and a.role = 'student'
      and (pc.last_sent_at is null
           or pc.last_sent_at::date < now()::date)
  loop
    select
      count(*) as sessions,
      coalesce(sum(r.points), 0) as points,
      coalesce(sum(r.correct_count), 0) as correct,
      coalesce(sum(r.total_questions), 0) as questions
    into v_stats
    from practice.results r
    where r.account_id = v_row.account_id
      and r.created_at >= now() - interval '7 days';

    -- No activity this week -> nothing to report.
    continue when v_stats.sessions = 0;

    v_subject := 'VieSchool - Bao cao tuan cua ' || v_row.display_name;
    v_html := '<h2>Bao cao tuan - ' || v_row.display_name || '</h2>'
      || '<p>7 ngay qua be da luyen:</p><ul>'
      || '<li>So lan luyen: ' || v_stats.sessions || '</li>'
      || '<li>Cau hoi da lam: ' || v_stats.questions || '</li>'
      || '<li>Cau dung: ' || v_stats.correct
      || ' (' || case when v_stats.questions > 0
        then round(v_stats.correct::numeric * 100 / v_stats.questions)::text
        else '0' end || '%)</li>'
      || '<li>Diem tich luy: ' || v_stats.points || '</li>'
      || '</ul><p>Mo app de xem bao cao chi tiet theo ky nang.</p>'
      || '<p style="color:#888;font-size:12px">Khong muon nhan email nay? '
      || 'Tat "Nhan bao cao qua email" trong trang Bao cao cua app.</p>';

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', 'VieSchool <reports@aal.vn>',
        'to', jsonb_build_array(v_row.email::text),
        'subject', v_subject,
        'html', v_html
      )
    );

    update practice.parent_contacts
    set last_sent_at = now()
    where account_id = v_row.account_id;
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function practice.send_weekly_reports() from public, anon, authenticated, service_role;

-- Sundays 12:00 UTC = 19:00 VN. Idempotent schedule: unschedule first
-- if the job already exists.
do $$
begin
  perform cron.unschedule('weekly-parent-report');
exception when others then
  null;
end $$;

select cron.schedule(
  'weekly-parent-report',
  '0 12 * * 0',
  $$select practice.send_weekly_reports()$$
);
