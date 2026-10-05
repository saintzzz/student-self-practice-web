-- CR-61 follow-up: provider-agnostic email sending.
-- Resend shares its quota with the AAL Fast Track project and hit the
-- cap. The send path now reads provider config from Vault so any HTTP
-- email API can act as fallback with zero deploys:
--
--   email_provider : 'resend' (default) | 'brevo' | 'sendgrid' | 'mailersend'
--   email_api_key  : provider API key (falls back to resend_api_key)
--   email_from     : 'Name <addr@domain>' or bare addr
--                    (falls back to resend_from, then reports@aal.vn)
--
-- Cloudflare is deliberately NOT a provider: free outbound mail via
-- Workers ended 08/2024 (MailChannels sunset); Email Routing only
-- receives. Brevo (300/day free) is the recommended fallback.
--
-- Replaces send_weekly_reports() wholesale; reconcile + cron are
-- unchanged because they only look at the send log.

create or replace function practice.send_weekly_reports()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_provider text;
  v_from text;
  v_from_name text;
  v_from_addr text;
  v_url text;
  v_headers jsonb;
  v_body jsonb;
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
  select decrypted_secret into v_provider
  from vault.decrypted_secrets where name = 'email_provider' limit 1;
  v_provider := lower(coalesce(v_provider, 'resend'));

  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'email_api_key' limit 1;
  if v_key is null then
    -- Backward compat: the original vault key name.
    select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  end if;
  if v_key is null then
    raise warning 'send_weekly_reports: no email_api_key in vault';
    return 0;
  end if;

  select decrypted_secret into v_from
  from vault.decrypted_secrets where name = 'email_from' limit 1;
  if v_from is null then
    select decrypted_secret into v_from
    from vault.decrypted_secrets where name = 'resend_from' limit 1;
  end if;
  v_from := coalesce(v_from, 'VieSchool <reports@aal.vn>');

  -- 'Name <addr>' -> parts for providers that want them split.
  if v_from ~ '<' then
    v_from_name := trim(regexp_replace(v_from, '<[^>]*>', ''));
    v_from_addr := substring(v_from from '<([^>]+)>');
  else
    v_from_name := 'VieSchool';
    v_from_addr := v_from;
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

    -- Per-provider request shape.
    case v_provider
      when 'brevo' then
        v_url := 'https://api.brevo.com/v3/smtp/email';
        v_headers := jsonb_build_object(
          'api-key', v_key, 'Content-Type', 'application/json');
        v_body := jsonb_build_object(
          'sender', jsonb_build_object('name', v_from_name, 'email', v_from_addr),
          'to', jsonb_build_array(jsonb_build_object('email', v_row.email)),
          'subject', v_subject,
          'htmlContent', v_html);
      when 'sendgrid' then
        v_url := 'https://api.sendgrid.com/v3/mail/send';
        v_headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'Content-Type', 'application/json');
        v_body := jsonb_build_object(
          'personalizations', jsonb_build_array(
            jsonb_build_object('to', jsonb_build_array(
              jsonb_build_object('email', v_row.email)))),
          'from', jsonb_build_object('email', v_from_addr, 'name', v_from_name),
          'subject', v_subject,
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text/html', 'value', v_html)));
      when 'mailersend' then
        v_url := 'https://api.mailersend.com/v1/email';
        v_headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'Content-Type', 'application/json');
        v_body := jsonb_build_object(
          'from', jsonb_build_object('email', v_from_addr, 'name', v_from_name),
          'to', jsonb_build_array(jsonb_build_object('email', v_row.email)),
          'subject', v_subject,
          'html', v_html);
      else -- 'resend' and any unknown provider -> resend shape
        v_url := 'https://api.resend.com/emails';
        v_headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_key,
          'Content-Type', 'application/json');
        v_body := jsonb_build_object(
          'from', v_from,
          'to', jsonb_build_array(v_row.email::text),
          'subject', v_subject,
          'html', v_html);
    end case;

    select net.http_post(
      url := v_url, headers := v_headers, body := v_body
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

-- Interim quota fix: the free Resend key is shared across three
-- products (AAL Fast Track bookings, So Chu Nhiem reports, English
-- Arena) and hits its daily cap early. Resend resets quota at 00:00
-- UTC, so the weekly send moved to 00:15 UTC Sunday (07:15 VN) -
-- right after reset - with reconcile 30 min later. The real fix is a
-- dedicated provider key via the vault config above.
do $$
begin
  perform cron.unschedule('weekly-parent-report');
  perform cron.unschedule('weekly-parent-report-reconcile');
exception when others then
  null;
end $$;

select cron.schedule(
  'weekly-parent-report',
  '15 0 * * 0',
  $$select practice.send_weekly_reports()$$
);
select cron.schedule(
  'weekly-parent-report-reconcile',
  '45 0 * * 0',
  $$select practice.reconcile_parent_reports()$$
);
