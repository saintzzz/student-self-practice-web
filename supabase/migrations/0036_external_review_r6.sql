-- External review r6: outbound child-data emails need verified recipients and
-- escaped user content.
--
-- 1) unverified-recipient: a logged-in student could store ANY email in
--    parent_contacts (RLS only bound account_id = auth.uid()) and the weekly
--    job mailed child progress to that address. Now the weekly send is gated
--    on a click-confirmed verified flag: request_parent_verify() mails a
--    signed-token link, confirm_parent_email(token) flips verified, an
--    email-change trigger resets it, and clients cannot write the
--    verification columns directly.
-- 2) email-html-injection: display_name was concatenated raw into the email
--    subject + HTML body (practice-admin accepts arbitrary names). All
--    interpolated text now goes through practice.email_esc().
-- 3) xff-spoofable rate-limit bucket lives in the transcribe edge fn, not SQL.

-- ------------------------------------------------------------------
-- columns + client-write lockdown
-- ------------------------------------------------------------------
alter table practice.parent_contacts
  add column if not exists verified boolean not null default false,
  add column if not exists verify_token uuid,
  add column if not exists verify_token_sent_at timestamptz;

-- Verification state is server-owned: the client can upsert email/opted_in
-- but never set or clear these columns directly.
revoke insert (verified, verify_token, verify_token_sent_at)
  on practice.parent_contacts from authenticated;
revoke update (verified, verify_token, verify_token_sent_at)
  on practice.parent_contacts from authenticated;

-- Changing the email (by ANY writer, including admin/service role) requires
-- the new address to be confirmed again.
create or replace function practice.parent_contact_email_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    new.verified := false;
    new.verify_token := null;
    new.verify_token_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_parent_contact_email on practice.parent_contacts;
create trigger trg_parent_contact_email
  before update on practice.parent_contacts
  for each row execute function practice.parent_contact_email_changed();

-- ------------------------------------------------------------------
-- HTML escaping helper for outbound mail bodies
-- ------------------------------------------------------------------
create or replace function practice.email_esc(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(coalesce(p, ''),
    '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

revoke all on function practice.email_esc(text) from public;
grant execute on function practice.email_esc(text) to anon, authenticated, service_role;

-- ------------------------------------------------------------------
-- send_weekly_reports v3: verified recipients + escaped interpolation
-- ------------------------------------------------------------------
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
  v_name text;
begin
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;

  if v_key is null then
    raise warning 'send_weekly_reports: resend_api_key missing from vault';
    return 0;
  end if;

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

-- ------------------------------------------------------------------
-- request_parent_verify(): send the signed-token confirm link to the
-- email on the caller's own parent_contacts row. Throttled 10 min.
-- ------------------------------------------------------------------
create or replace function practice.request_parent_verify()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_verified boolean;
  v_last_sent timestamptz;
  v_key text;
  v_from text;
  v_token uuid;
  v_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'auth-required');
  end if;
  select pc.email, pc.verified, pc.verify_token_sent_at
    into v_email, v_verified, v_last_sent
  from practice.parent_contacts pc
  where pc.account_id = v_uid;
  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'no-contact');
  end if;
  if v_verified then
    return jsonb_build_object('ok', true, 'already_verified', true);
  end if;
  if v_last_sent is not null and v_last_sent > now() - interval '10 minutes' then
    return jsonb_build_object('ok', true, 'throttled', true);
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;
  if v_key is null then
    return jsonb_build_object('ok', false, 'reason', 'mailer-unconfigured');
  end if;
  select decrypted_secret into v_from
  from vault.decrypted_secrets
  where name = 'resend_from'
  limit 1;
  v_from := coalesce(v_from, 'VieSchool <reports@aal.vn>');

  select a.display_name into v_name
  from practice.accounts a where a.id = v_uid;

  v_token := gen_random_uuid();
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', v_from,
      'to', jsonb_build_array(v_email),
      'subject', 'VieSchool - Xác nhận email nhận báo cáo',
      'html', '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">'
        || '<h2 style="color:#b45309">Xác nhận nhận báo cáo học tập</h2>'
        || '<p>Bạn (hoặc bé ' || practice.email_esc(v_name)
        || ') vừa đăng ký nhận báo cáo luyện tập hàng tuần của English Arena tới địa chỉ này.</p>'
        || '<p>Nếu đúng là bạn, bấm link xác nhận (hiệu lực 7 ngày):</p>'
        || '<p><a href="https://ea.vieschool.com/?verify_email=' || v_token::text
        || '" style="display:inline-block;background:#0284c7;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Xác nhận email</a></p>'
        || '<p style="color:#888;font-size:12px">Nếu bạn không đăng ký, hãy bỏ qua email này - bạn sẽ không nhận thêm email nào.</p>'
        || '</div>'
    )
  );

  update practice.parent_contacts
  set verify_token = v_token,
      verify_token_sent_at = now()
  where account_id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function practice.request_parent_verify() from public, anon;
grant execute on function practice.request_parent_verify() to authenticated;

-- ------------------------------------------------------------------
-- confirm_parent_email(token): link target. Callable by anon - the token
-- IS the capability. 7-day expiry, one-shot (token cleared on success).
-- ------------------------------------------------------------------
create or replace function practice.confirm_parent_email(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
begin
  if p_token is null then
    return jsonb_build_object('ok', false);
  end if;
  update practice.parent_contacts
  set verified = true,
      verify_token = null
  where verify_token = p_token
    and verify_token_sent_at is not null
    and verify_token_sent_at > now() - interval '7 days'
  returning account_id into v_account;
  return jsonb_build_object('ok', v_account is not null);
end;
$$;

revoke all on function practice.confirm_parent_email(uuid) from public;
grant execute on function practice.confirm_parent_email(uuid) to anon, authenticated;
