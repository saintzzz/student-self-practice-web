-- CR-61: weekly parent report hardening.
-- 1) parent_report_sends: delivery log - one row per queued send with the
--    pg_net request id so a reconcile pass can read the real Resend
--    response status later (pg_net is async; the caller cannot see the
--    outcome inside send_weekly_reports).
-- 2) send_weekly_reports v2: Vietnamese diacritics, per-subject
--    breakdown + total practice minutes, sender read from Vault key
--    'resend_from' (falls back to reports@aal.vn until vieschool.com is
--    verified in Resend), request id recorded into the send log.
-- 3) reconcile_parent_reports() + cron 30 min after the weekly send:
--    failures (4xx/5xx/no response) get logged and last_sent_at is
--    cleared so the next weekly run retries instead of silently
--    skipping the parent.

create table if not exists practice.parent_report_sends (
  id bigint generated always as identity primary key,
  account_id uuid not null references practice.accounts(id) on delete cascade,
  request_id bigint,
  email text not null,
  sent_at timestamptz not null default now(),
  resend_status int,
  resend_error text,
  reconciled_at timestamptz
);

alter table practice.parent_report_sends enable row level security;
revoke all on practice.parent_report_sends from anon, authenticated, service_role;
grant all on practice.parent_report_sends to service_role;

create policy parent_report_sends_admin_all on practice.parent_report_sends
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));

create or replace function practice.send_weekly_reports()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_from text;
  v_row record;
  v_stats record;
  v_sub record;
  v_sent int := 0;
  v_subject text;
  v_html text;
  v_rows text := '';
  v_minutes int;
  v_request_id bigint;
begin
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;

  if v_key is null then
    raise warning 'send_weekly_reports: resend_api_key missing from vault';
    return 0;
  end if;

  -- Sender is configurable so flipping to reports@vieschool.com after
  -- domain verification is a vault edit, not a migration.
  select decrypted_secret into v_from
  from vault.decrypted_secrets
  where name = 'resend_from'
  limit 1;
  v_from := coalesce(v_from, 'VieSchool <reports@aal.vn>');

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
      coalesce(sum(r.total_questions), 0) as questions,
      coalesce(sum(r.time_used_sec), 0) as seconds
    into v_stats
    from practice.results r
    where r.account_id = v_row.account_id
      and r.created_at >= now() - interval '7 days';

    -- No activity this week -> nothing to report.
    continue when v_stats.sessions = 0;

    -- Per-subject rows for the report table.
    v_rows := '';
    for v_sub in
      select r.program,
             count(*) as sessions,
             coalesce(sum(r.correct_count), 0) as correct,
             coalesce(sum(r.total_questions), 0) as questions
      from practice.results r
      where r.account_id = v_row.account_id
        and r.created_at >= now() - interval '7 days'
      group by r.program
      order by r.program
    loop
      v_rows := v_rows
        || '<tr><td style="padding:6px 12px;border:1px solid #e5e7eb">'
        || case v_sub.program
             when 'english' then 'Tiếng Anh'
             when 'math' then 'Toán tiếng Anh'
             when 'science' then 'Khoa học tiếng Anh'
             else initcap(coalesce(v_sub.program, 'Khác')) end
        || '</td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:center">'
        || v_sub.sessions
        || '</td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:center">'
        || v_sub.correct || '/' || v_sub.questions
        || ' (' || case when v_sub.questions > 0
             then round(v_sub.correct::numeric * 100 / v_sub.questions)::text
             else '0' end || '%)'
        || '</td></tr>';
    end loop;

    v_minutes := round(v_stats.seconds / 60.0);
    v_subject := 'VieSchool - Báo cáo tuần của ' || v_row.display_name;
    v_html := '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">'
      || '<h2 style="color:#b45309;margin-bottom:4px">Báo cáo tuần của ' || v_row.display_name || '</h2>'
      || '<p style="color:#555">7 ngày qua bé đã luyện tập trên English Arena:</p>'
      || '<table style="border-collapse:collapse;width:100%;font-size:14px">'
      || '<tr style="background:#fffbeb">'
      || '<th style="padding:6px 12px;border:1px solid #e5e7eb;text-align:left">Môn</th>'
      || '<th style="padding:6px 12px;border:1px solid #e5e7eb">Lượt luyện</th>'
      || '<th style="padding:6px 12px;border:1px solid #e5e7eb">Câu đúng</th></tr>'
      || v_rows || '</table>'
      || '<p style="margin-top:12px">Tổng: <b>' || v_stats.sessions || ' lượt</b>, '
      || v_stats.questions || ' câu hỏi, đúng '
      || case when v_stats.questions > 0
           then round(v_stats.correct::numeric * 100 / v_stats.questions)::text
           else '0' end
      || '%, ' || v_stats.points || ' điểm'
      || case when v_minutes > 0
           then ' - khoảng ' || v_minutes || ' phút luyện tập'
           else '' end
      || '.</p>'
      || '<p>Mở app <a href="https://ea.vieschool.com">ea.vieschool.com</a> để xem báo cáo chi tiết theo kỹ năng của bé.</p>'
      || '<p style="color:#888;font-size:12px">Không muốn nhận email này? '
      || 'Tắt "Nhận báo cáo qua email" trong trang Báo cáo của app.</p>'
      || '</div>';

    select net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', v_from,
        'to', jsonb_build_array(v_row.email::text),
        'subject', v_subject,
        'html', v_html
      )
    ) into v_request_id;

    insert into practice.parent_report_sends (account_id, request_id, email)
    values (v_row.account_id, v_request_id, v_row.email);

    update practice.parent_contacts
    set last_sent_at = now()
    where account_id = v_row.account_id;
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function practice.send_weekly_reports() from public, anon, authenticated, service_role;

-- -------------------------------------------------------------------
-- reconcile_parent_reports(): reads pg_net responses for sends from
-- the last 24h that have no recorded status. Success records the
-- status; failure clears last_sent_at so the next weekly run retries.
-- pg_net keeps responses ~6h, so the reconcile cron runs 30 minutes
-- after the send cron.
-- -------------------------------------------------------------------
create or replace function practice.reconcile_parent_reports()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_fixed int := 0;
begin
  for v_row in
    select s.id, s.account_id, s.request_id, r.status_code, left(r.content, 300) as content
    from practice.parent_report_sends s
    left join net._http_response r on r.id = s.request_id
    where s.reconciled_at is null
      and s.sent_at >= now() - interval '24 hours'
      and s.sent_at <= now() - interval '2 minutes'
  loop
    if v_row.request_id is null or v_row.status_code is null or v_row.status_code >= 400 then
      -- Delivery failed or response vanished - reopen the send slot.
      update practice.parent_report_sends
      set resend_status = v_row.status_code,
          resend_error = coalesce(v_row.content, 'no response recorded'),
          reconciled_at = now()
      where id = v_row.id;
      update practice.parent_contacts
      set last_sent_at = null
      where account_id = v_row.account_id;
    else
      update practice.parent_report_sends
      set resend_status = v_row.status_code,
          reconciled_at = now()
      where id = v_row.id;
    end if;
    v_fixed := v_fixed + 1;
  end loop;
  return v_fixed;
end;
$$;

revoke all on function practice.reconcile_parent_reports() from public, anon, authenticated, service_role;

-- 30 minutes after the weekly send so pg_net responses are available.
do $$
begin
  perform cron.unschedule('weekly-parent-report-reconcile');
exception when others then
  null;
end $$;

select cron.schedule(
  'weekly-parent-report-reconcile',
  '30 12 * * 0',
  $$select practice.reconcile_parent_reports()$$
);
