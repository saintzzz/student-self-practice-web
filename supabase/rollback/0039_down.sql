-- Rollback for supabase/migrations/0039_kids_ux_weekly_digest.sql (KUX-12).
--
-- Restores send_weekly_reports() to its 0037 body (self-contained
-- render+send, verbatim) and drops the three helpers the migration added.
-- No tables or grants on tables were touched by 0039, so nothing else to
-- undo. Safe to re-apply 0039 afterwards (all objects are create-or-replace
-- / drop-if-exists).

create or replace function practice.send_weekly_reports()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_stats record;
  v_sub record;
  v_sent int := 0;
  v_subject text;
  v_html text;
  v_rows text := '';
  v_minutes int;
  v_request_id bigint;
  v_name text;
begin
  for v_row in
    select pc.account_id, pc.email, a.display_name
    from practice.parent_contacts pc
    join practice.accounts a on a.id = pc.account_id
    where pc.opted_in
      and pc.verified
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

    continue when v_stats.sessions = 0;

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
             else practice.email_esc(initcap(coalesce(v_sub.program, 'Khác'))) end
        || '</td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:center">'
        || v_sub.sessions
        || '</td><td style="padding:6px 12px;border:1px solid #e5e7eb;text-align:center">'
        || v_sub.correct || '/' || v_sub.questions
        || ' (' || case when v_sub.questions > 0
             then round(v_sub.correct::numeric * 100 / v_sub.questions)::text
             else '0' end || '%)'
        || '</td></tr>';
    end loop;

    v_name := practice.email_esc(v_row.display_name);
    v_minutes := round(v_stats.seconds / 60.0);
    v_subject := 'VieSchool - Báo cáo tuần của ' || v_name;
    v_html := '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">'
      || '<h2 style="color:#b45309;margin-bottom:4px">Báo cáo tuần của ' || v_name || '</h2>'
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

    v_request_id := practice.send_email(v_row.email, v_subject, v_html);
    if v_request_id is null then
      raise warning 'send_weekly_reports: send_email unconfigured';
      continue;
    end if;

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

drop function if exists practice.weekly_report_html(uuid);
drop function if exists practice.skill_label_vi(text);
drop function if exists practice.is_mock_result(text, text, int, text);
