-- EXTERNAL-REVIEW-r7 fixes
--
-- 1. unverified-recipient (gate miss): column-level revokes in 0036 cannot
--    narrow 0005's TABLE-level insert/update/select on parent_contacts -
--    Postgres unions privileges. A student could still write verified=true
--    and even read their own verify_token to self-confirm. Revoke the
--    table-level grants and re-grant the exact writable/readable columns.
--    verify_token/verify_token_sent_at never reach the client.
-- 2. fetch-gate-parity (gate miss): 0035's authenticated fetch applied
--    requiresHumanApprovalForCommercialRelease only in the mock branch.
--    Move it to the unconditional WHERE in both passes (public parity).
-- 3. cas-transition in SQL: review_question overwrote terminal statuses -
--    a stale approve could resurrect a rejection. Only 'pending'/'flagged'
--    rows transition now; anything else returns {stale}.
-- 4. provider-config-regression (new class): 0036's rewritten mailers read
--    only resend_* vault keys, dropping 0025's email_provider/email_api_key/
--    email_from matrix (brevo/sendgrid/mailersend). All outbound mail now
--    goes through practice.send_email() which holds the provider dispatch.

-- ---------- 1. parent_contacts: real effective privileges ----------
revoke insert, update, select on practice.parent_contacts from authenticated;
-- The client reads back its own row for the report screen: everything
-- except the verification internals.
grant select (account_id, email, opted_in, verified, updated_at, last_sent_at)
  on practice.parent_contacts to authenticated;
grant insert (account_id, email, opted_in, updated_at)
  on practice.parent_contacts to authenticated;
grant update (email, opted_in, updated_at)
  on practice.parent_contacts to authenticated;

-- ---------- 4a. shared provider-aware mail sender ----------
create or replace function practice.send_email(p_to text, p_subject text, p_html text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text;
  v_key text;
  v_from text;
  v_from_name text;
  v_from_addr text;
  v_url text;
  v_headers jsonb;
  v_body jsonb;
  v_request_id bigint;
begin
  select decrypted_secret into v_provider
  from vault.decrypted_secrets where name = 'email_provider' limit 1;
  v_provider := lower(coalesce(v_provider, 'resend'));

  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'email_api_key' limit 1;
  if v_key is null then
    select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  end if;
  if v_key is null then
    raise warning 'send_email: no email_api_key in vault';
    return null;
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

  case v_provider
    when 'brevo' then
      v_url := 'https://api.brevo.com/v3/smtp/email';
      v_headers := jsonb_build_object(
        'api-key', v_key, 'Content-Type', 'application/json');
      v_body := jsonb_build_object(
        'sender', jsonb_build_object('name', v_from_name, 'email', v_from_addr),
        'to', jsonb_build_array(jsonb_build_object('email', p_to)),
        'subject', p_subject,
        'htmlContent', p_html);
    when 'sendgrid' then
      v_url := 'https://api.sendgrid.com/v3/mail/send';
      v_headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json');
      v_body := jsonb_build_object(
        'personalizations', jsonb_build_array(
          jsonb_build_object('to', jsonb_build_array(
            jsonb_build_object('email', p_to)))),
        'from', jsonb_build_object('email', v_from_addr, 'name', v_from_name),
        'subject', p_subject,
        'content', jsonb_build_array(
          jsonb_build_object('type', 'text/html', 'value', p_html)));
    when 'mailersend' then
      v_url := 'https://api.mailersend.com/v1/email';
      v_headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json');
      v_body := jsonb_build_object(
        'from', jsonb_build_object('email', v_from_addr, 'name', v_from_name),
        'to', jsonb_build_array(jsonb_build_object('email', p_to)),
        'subject', p_subject,
        'html', p_html);
    else -- 'resend' and unknown providers -> resend shape
      v_url := 'https://api.resend.com/emails';
      v_headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json');
      v_body := jsonb_build_object(
        'from', v_from,
        'to', jsonb_build_array(p_to),
        'subject', p_subject,
        'html', p_html);
  end case;

  select net.http_post(url := v_url, headers := v_headers, body := v_body)
    into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function practice.send_email(text, text, text) from public, anon, authenticated;
grant execute on function practice.send_email(text, text, text) to service_role;

-- ---------- 2. fetch_questions: commercial gate unconditional ----------
create or replace function practice.fetch_questions(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_skills text[] default null,
  p_min_difficulty smallint default null,
  p_mode text default 'practice'
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = practice, pg_catalog
as $$
declare
  n int := greatest(1, least(p_count, 200));
  got int := 0;
  seen text[] := '{}';
  rec record;
begin
  for rec in
    select t.* from (
      select distinct on (coalesce(q.variant_group_id, q.id)) q.*
      from practice.qb_questions q
      where q.grade = p_grade
        and q.subject = p_subject
        and q.canonical
        and (p_skills is null or q.skill = any(p_skills))
        and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
        and question_type not in ('constructed-response', 'speaking-prompt')
        and q.review_status not in ('rejected', 'draft')
        and (q.publication_policy->>'commercialReleaseEligible')::boolean
        and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
        and case when p_mode = 'exam'
              then (q.publication_policy->>'examEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              when p_mode = 'mock'
              then (q.publication_policy->>'mockEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              else (q.publication_policy->>'practiceEligible')::boolean
            end
        and random() < 0.35
      order by coalesce(q.variant_group_id, q.id), random()
    ) t
    order by random()
    limit n
  loop
    got := got + 1;
    seen := seen || coalesce(rec.variant_group_id, rec.id);
    return next to_jsonb(rec) || jsonb_build_object(
      'asset_paths', coalesce((
        select jsonb_agg(a.file_path order by qa.sort_order)
        from practice.qb_question_assets qa
        join practice.qb_assets a on a.id = qa.asset_id
        where qa.question_id = rec.id), '[]'::jsonb),
      'audio_transcripts', coalesce((
        select jsonb_agg(aa.transcript)
        from practice.qb_question_audio qau
        join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
        where qau.question_id = rec.id), '[]'::jsonb));
  end loop;

  if got < n then
    for rec in
      select t.* from (
        select distinct on (coalesce(q.variant_group_id, q.id)) q.*
        from practice.qb_questions q
        where q.grade = p_grade
          and q.subject = p_subject
          and q.canonical
          and (p_skills is null or q.skill = any(p_skills))
          and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
          and question_type not in ('constructed-response', 'speaking-prompt')
          and q.review_status not in ('rejected', 'draft')
          and (q.publication_policy->>'commercialReleaseEligible')::boolean
          and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
          and case when p_mode = 'exam'
                then (q.publication_policy->>'examEligible')::boolean
                   and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                when p_mode = 'mock'
                then (q.publication_policy->>'mockEligible')::boolean
                   and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                else (q.publication_policy->>'practiceEligible')::boolean
              end
          and not (coalesce(q.variant_group_id, q.id) = any(seen))
        order by coalesce(q.variant_group_id, q.id), random()
      ) t
      order by random()
      limit n - got
    loop
      return next to_jsonb(rec) || jsonb_build_object(
        'asset_paths', coalesce((
          select jsonb_agg(a.file_path order by qa.sort_order)
          from practice.qb_question_assets qa
          join practice.qb_assets a on a.id = qa.asset_id
          where qa.question_id = rec.id), '[]'::jsonb),
        'audio_transcripts', coalesce((
          select jsonb_agg(aa.transcript)
          from practice.qb_question_audio qau
          join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
          where qau.question_id = rec.id), '[]'::jsonb));
    end loop;
  end if;
  return;
end;
$$;
revoke all on function practice.fetch_questions(smallint, text, int, text[], smallint, text) from public, anon;
grant execute on function practice.fetch_questions(smallint, text, int, text[], smallint, text) to authenticated, service_role;

-- ---------- 3. review_question: CAS - terminal states are final ----------
create or replace function practice.review_question(
  p_question_id text,
  p_action text,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  new_status text;
  reason text := btrim(coalesce(p_reason, ''));
  current_status text;
begin
  if not practice.is_admin() then
    raise exception 'admin only';
  end if;
  if p_action not in ('approve','reject','flag') then
    raise exception 'unknown action %', p_action;
  end if;
  if p_action in ('reject','flag') and reason = '' then
    raise exception 'reason required for %', p_action;
  end if;
  new_status := case p_action
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    else 'flagged' end;

  -- CAS: only non-terminal queue rows transition. A stale approve can no
  -- longer overwrite a completed rejection (and vice versa).
  update practice.qb_review_queue
    set review_status = new_status,
        reviewer_id = auth.uid(),
        reviewed_at = now()
    where question_id = p_question_id
      and review_status in ('pending', 'flagged')
  returning review_status into current_status;

  if not found then
    select rq.review_status into current_status
      from practice.qb_review_queue rq
      where rq.question_id = p_question_id;
    return jsonb_build_object(
      'ok', false, 'stale', true,
      'questionId', p_question_id,
      'current', current_status);
  end if;

  if p_action <> 'flag' then
    update practice.qb_questions
      set review_status = new_status,
          publication_policy = case when p_action = 'approve'
            then publication_policy ||
              '{"examEligible": true, "requiresHumanApprovalForExam": false, "requiresHumanApprovalForCommercialRelease": false}'::jsonb
            else publication_policy ||
              '{"examEligible": false, "practiceEligible": false, "mockEligible": false}'::jsonb
          end
      where id = p_question_id;
  else
    update practice.qb_questions
      set review_status = new_status
      where id = p_question_id;
  end if;

  insert into practice.qb_review_events (question_id, action, reason, actor_id)
    values (p_question_id, p_action, reason, auth.uid());
  insert into practice.audit_log (actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'review_' || p_action, 'qb_questions', p_question_id,
            jsonb_build_object('reason', reason, 'status', new_status));

  return jsonb_build_object('ok', true, 'questionId', p_question_id, 'status', new_status);
end;
$$;
revoke all on function practice.review_question(text, text, text) from public, anon;
grant execute on function practice.review_question(text, text, text) to authenticated;

-- ---------- 4b. mailers on the shared provider-aware sender ----------
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

  select a.display_name into v_name
  from practice.accounts a where a.id = v_uid;

  v_token := gen_random_uuid();
  if practice.send_email(
    v_email,
    'VieSchool - Xác nhận email nhận báo cáo',
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">'
      || '<h2 style="color:#b45309">Xác nhận nhận báo cáo học tập</h2>'
      || '<p>Bạn (hoặc bé ' || practice.email_esc(v_name)
      || ') vừa đăng ký nhận báo cáo luyện tập hàng tuần của English Arena tới địa chỉ này.</p>'
      || '<p>Nếu đúng là bạn, bấm link xác nhận (hiệu lực 7 ngày):</p>'
      || '<p><a href="https://ea.vieschool.com/?verify_email=' || v_token::text
      || '" style="display:inline-block;background:#0284c7;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Xác nhận email</a></p>'
      || '<p style="color:#888;font-size:12px">Nếu bạn không đăng ký, hãy bỏ qua email này - bạn sẽ không nhận thêm email nào.</p>'
      || '</div>'
  ) is null then
    return jsonb_build_object('ok', false, 'reason', 'mailer-unconfigured');
  end if;

  update practice.parent_contacts
  set verify_token = v_token,
      verify_token_sent_at = now()
  where account_id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function practice.request_parent_verify() from public, anon;
grant execute on function practice.request_parent_verify() to authenticated;
