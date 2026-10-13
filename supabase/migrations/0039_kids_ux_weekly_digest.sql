-- KUX-12 / WP-19b / AC-6.3: weekly parent digest enrichment.
--
-- Purpose: split render from send in the Sunday digest and add the kids-UX
-- sections per design 3.8.c0 - "Tuan nay" (sessions, minutes, per-day
-- minutes, distinct active days), "Thi thu" (latest mock score + delta vs
-- previous), "Nen luyen" (top-3 weakest skills + one suggestion) - plus a
-- home-collection line read defensively from the self-reported
-- engagement_state blob (homeItems / giftGrants; absent keys never error).
--
-- Reversible: yes - supabase/rollback/0039_down.sql restores the 0037
-- send_weekly_reports() body and drops the three helpers created here.
--
-- Dependencies: 0037 (practice.send_email, verified parent_contacts,
-- parent_report_sends), 0017 (results.form_id), 0021
-- (results.time_used_sec), 0008/0009 (engagement_state blob - self-reported,
-- read-only here; digest use ruled OK in adr-kids-ux.md KUX-12: it feeds no
-- ranking, reward or teacher metric). No schema changes, no new PII - the
-- mail still goes only to the verified parent_contacts row of the child's
-- own account.

-- ---------------------------------------------------------------------
-- is_mock_result: a full sitting = total_questions == the grade's exam
-- count (examConfigForGrade: 50/80/120/160/200) on a real program row with
-- no fixed-form id. Mirrors resultKind.ts - FF-12 parity test reads both.
-- ---------------------------------------------------------------------
create or replace function practice.is_mock_result(
  p_grade text,
  p_program text,
  p_total int,
  p_form_id text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_program in ('english', 'math', 'science')
     and p_form_id is null
     and p_total = case p_grade
           when 'grade-1' then 50
           when 'grade-2' then 80
           when 'grade-3' then 120
           when 'grade-4' then 160
           when 'grade-5' then 200
           else -1
         end
$$;

revoke all on function practice.is_mock_result(text, text, int, text)
  from public, anon, authenticated, service_role;
grant execute on function practice.is_mock_result(text, text, int, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- skill_label_vi: whitelist CASE over SKILL_LABELS + QB_SKILL_LABELS
-- (src/lib/engagement/skills.ts). Unknown key -> null so the caller skips
-- the row; raw self-reported keys are never interpolated into the email.
-- ---------------------------------------------------------------------
create or replace function practice.skill_label_vi(p_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_key
    -- SKILL_LABELS (UI buckets)
    when 'grammar' then 'Ngữ pháp'
    when 'wordorder' then 'Sắp xếp câu'
    when 'spelling' then 'Chính tả'
    when 'pronunciation' then 'Phát âm'
    when 'reading' then 'Đọc hiểu'
    when 'textanswer' then 'Điền đáp số'
    when 'vocabulary' then 'Từ vựng'
    when 'listening' then 'Nghe'
    when 'matching' then 'Ghép cặp'
    when 'describing' then 'Mô tả hình'
    when 'speaking' then 'Nói'
    when 'phonics' then 'Phonics'
    -- QB_SKILL_LABELS (bank taxonomy + template-generator skills)
    when 'vocabulary-recognition' then 'Từ vựng'
    when 'vocabulary-in-context' then 'Từ vựng trong câu'
    when 'grammar-use-of-english' then 'Ngữ pháp'
    when 'functional-language' then 'Giao tiếp'
    when 'phonics-pronunciation' then 'Phát âm'
    when 'count-and-name' then 'Đếm và gọi tên'
    when 'math-language' then 'Từ vựng toán'
    when 'number-operations' then 'Phép tính'
    when 'number-sense' then 'Cảm nhận số'
    when 'mathematical-reasoning' then 'Tư duy toán'
    when 'problem-solving' then 'Giải toán có lời văn'
    when 'measurement' then 'Đo lường'
    when 'geometry' then 'Hình học'
    when 'fractions' then 'Phân số'
    when 'data' then 'Dữ liệu và biểu đồ'
    when 'science-vocabulary' then 'Từ vựng khoa học'
    when 'science-concept' then 'Khái niệm khoa học'
    when 'science-application' then 'Vận dụng khoa học'
    when 'science-reasoning' then 'Suy luận khoa học'
    when 'science-reading' then 'Đọc hiểu khoa học'
    when 'scientific-observation' then 'Quan sát khoa học'
    when 'scientific-enquiry' then 'Khám phá khoa học'
    when 'arithmetic' then 'Phép tính'
    when 'word-problem' then 'Giải toán có lời văn'
    when 'concept' then 'Khái niệm khoa học'
    when 'classification' then 'Phân loại khoa học'
    when 'application' then 'Vận dụng khoa học'
    when 'living-things' then 'Sinh vật sống'
    when 'writing' then 'Viết'
    else null
  end
$$;

revoke all on function practice.skill_label_vi(text)
  from public, anon, authenticated, service_role;
grant execute on function practice.skill_label_vi(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- weekly_report_html: renders the full digest body for one account.
-- Returns null when the account does not exist or had no activity in the
-- trailing 7 days (unchanged "nothing to report" rule). Security definer
-- with empty search_path; executed only by send_weekly_reports() and
-- service_role (demo-account preview - render never sends).
--
-- Every hop into the self-reported engagement_state blob checks
-- jsonb_typeof first, and each blob-reading section runs in its own
-- exception block: one malformed blob degrades that section to its empty
-- state instead of aborting the whole email.
-- ---------------------------------------------------------------------
create or replace function practice.weekly_report_html(p_account_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_stats record;
  v_sub record;
  v_day record;
  v_skill record;
  v_rows text := '';
  v_days_line text := '';
  v_minutes int;
  v_active_days int;
  v_mock_pct int;
  v_mock_prev_pct int;
  v_mock_html text;
  v_state jsonb;
  v_skill_days jsonb;
  v_home_count int := 0;
  v_gift_count int := 0;
  v_home_html text := '';
  v_weak_html text := '';
  v_weak_rows int := 0;
  v_first_weak text;
begin
  select a.display_name into v_name
  from practice.accounts a
  where a.id = p_account_id;
  if v_name is null then
    return null;
  end if;
  v_name := practice.email_esc(v_name);

  select
    count(*) as sessions,
    coalesce(sum(r.points), 0) as points,
    coalesce(sum(r.correct_count), 0) as correct,
    coalesce(sum(r.total_questions), 0) as questions,
    coalesce(sum(r.time_used_sec), 0) as seconds,
    count(distinct (r.created_at at time zone 'Asia/Ho_Chi_Minh')::date) as active_days
  into v_stats
  from practice.results r
  where r.account_id = p_account_id
    and r.created_at >= now() - interval '7 days';

  -- No activity this week -> nothing to report (unchanged rule).
  if v_stats.sessions = 0 then
    return null;
  end if;

  -- Per-program table (0037 content, unchanged).
  for v_sub in
    select r.program,
           count(*) as sessions,
           coalesce(sum(r.correct_count), 0) as correct,
           coalesce(sum(r.total_questions), 0) as questions
    from practice.results r
    where r.account_id = p_account_id
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

  v_minutes := round(v_stats.seconds / 60.0);
  v_active_days := v_stats.active_days;

  -- Minutes per practice day (server-side results.time_used_sec on VN
  -- dates; days whose rows predate time_used_sec are skipped).
  for v_day in
    select (r.created_at at time zone 'Asia/Ho_Chi_Minh')::date as d,
           round(coalesce(sum(r.time_used_sec), 0) / 60.0)::int as mins
    from practice.results r
    where r.account_id = p_account_id
      and r.created_at >= now() - interval '7 days'
    group by 1
    order by 1
  loop
    continue when v_day.mins <= 0;
    v_days_line := v_days_line
      || case when v_days_line = '' then '' else ', ' end
      || to_char(v_day.d, 'DD/MM') || ': ' || v_day.mins || ' phút';
  end loop;

  -- Thi thu: latest mock percentage + delta vs the previous sitting.
  select m.pct into v_mock_pct
  from (
    select round(r.correct_count::numeric * 100
             / greatest(r.total_questions, 1))::int as pct
    from practice.results r
    where r.account_id = p_account_id
      and practice.is_mock_result(r.grade_id, r.program,
                                  r.total_questions, r.form_id)
    order by r.created_at desc
    limit 1
  ) m;

  select m.pct into v_mock_prev_pct
  from (
    select round(r.correct_count::numeric * 100
             / greatest(r.total_questions, 1))::int as pct
    from practice.results r
    where r.account_id = p_account_id
      and practice.is_mock_result(r.grade_id, r.program,
                                  r.total_questions, r.form_id)
    order by r.created_at desc
    limit 1 offset 1
  ) m;

  if v_mock_pct is null then
    v_mock_html := '<p style="color:#555;margin:4px 0">Chưa có dữ liệu tuần này.</p>';
  else
    v_mock_html := '<p style="color:#555;margin:4px 0">Bài thi thử gần nhất: <b>'
      || v_mock_pct || '%</b>'
      || case
           when v_mock_prev_pct is null
             then ' - lần thi thử đầu tiên được ghi nhận.'
           when v_mock_pct > v_mock_prev_pct
             then ' - tăng ' || (v_mock_pct - v_mock_prev_pct) || ' điểm so với lần trước.'
           when v_mock_pct < v_mock_prev_pct
             then ' - giảm ' || (v_mock_prev_pct - v_mock_pct) || ' điểm so với lần trước.'
           else ' - giữ nguyên so với lần trước.'
         end
      || '</p>';
  end if;

  -- Self-reported engagement blob (0008/0009). Absent row or absent keys
  -- must never error - every hop type-checks first.
  select es.state into v_state
  from practice.engagement_state es
  where es.account_id = p_account_id;

  -- Home collection / gift info (kids-UX fields homeItems + giftGrants).
  begin
    if jsonb_typeof(v_state -> 'homeItems') = 'array' then
      v_home_count := jsonb_array_length(v_state -> 'homeItems');
    end if;
    if jsonb_typeof(v_state -> 'giftGrants') = 'object' then
      select count(*) into v_gift_count
      from jsonb_object_keys(v_state -> 'giftGrants');
    end if;
    if v_home_count > 0 or v_gift_count > 0 then
      v_home_html := '<p style="color:#555;margin:4px 0">Bé đang xây ngôi nhà trong game: '
        || v_home_count || ' món đồ'
        || case when v_gift_count > 0
             then ' (mở ' || v_gift_count || ' hộp quà)'
             else '' end
        || '.</p>';
    end if;
  exception when others then
    v_home_html := '';
  end;

  -- Nen luyen: top-3 weakest skills over the trailing 7 VN days from
  -- state->stats->skillDays (>=10 answers, <80% accuracy), labeled via the
  -- whitelist - unknown keys are skipped, never rendered raw.
  begin
    if jsonb_typeof(v_state -> 'stats') = 'object'
       and jsonb_typeof(v_state -> 'stats' -> 'skillDays') = 'object' then
      v_skill_days := v_state -> 'stats' -> 'skillDays';
    end if;

    if v_skill_days is not null then
      for v_skill in
        select w.skill_key, w.correct, w.total
        from (
          select sk.skill_key,
                 sum((sk.cnt ->> 'correct')::int) as correct,
                 sum((sk.cnt ->> 'total')::int) as total
          from jsonb_each(v_skill_days) as d(day_key, day_val)
            cross join lateral jsonb_each(d.day_val) as g(grade_key, grade_val)
            cross join lateral jsonb_each(g.grade_val) as sk(skill_key, cnt)
          where jsonb_typeof(d.day_val) = 'object'
            and jsonb_typeof(g.grade_val) = 'object'
            and jsonb_typeof(sk.cnt) = 'object'
            and case when d.day_key ~ '^\d{4}-\d{2}-\d{2}$'
                     then (d.day_key)::date end
                >= ((now() at time zone 'Asia/Ho_Chi_Minh')::date - 6)
            and coalesce(sk.cnt ->> 'correct', '') ~ '^\d{1,9}$'
            and coalesce(sk.cnt ->> 'total', '') ~ '^\d{1,9}$'
          group by sk.skill_key
        ) w
        where w.total >= 10
          and w.correct::numeric / greatest(w.total, 1) < 0.8
          and practice.skill_label_vi(w.skill_key) is not null
        order by w.correct::numeric / greatest(w.total, 1) asc,
                 w.total desc
        limit 3
      loop
        v_weak_rows := v_weak_rows + 1;
        if v_first_weak is null then
          v_first_weak := practice.skill_label_vi(v_skill.skill_key);
        end if;
        v_weak_html := v_weak_html
          || '<li>' || practice.skill_label_vi(v_skill.skill_key)
          || ' - đúng ' || v_skill.correct || '/' || v_skill.total
          || ' (' || round(v_skill.correct::numeric * 100
                 / greatest(v_skill.total, 1))::int || '%)</li>';
      end loop;
    end if;
  exception when others then
    v_weak_rows := 0;
    v_weak_html := '';
    v_first_weak := null;
  end;

  if v_weak_rows = 0 then
    v_weak_html := '<p style="color:#555;margin:4px 0">Chưa có dữ liệu tuần này.</p>';
  else
    v_weak_html := '<ul style="margin:4px 0;padding-left:20px;color:#555">'
      || v_weak_html || '</ul>'
      || '<p style="color:#555;margin:4px 0">Cuối tuần này ba mẹ có thể cho bé luyện thêm '
      || v_first_weak || ' nhé.</p>';
  end if;

  return '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">'
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
    -- KUX-12 sections (design 3.8.c0)
    || '<h3 style="color:#b45309;margin:16px 0 4px">Tuần này</h3>'
    || '<p style="color:#555;margin:4px 0">'
    || v_stats.sessions || ' lượt luyện - '
    || v_active_days || ' ngày có học'
    || case when v_minutes > 0 and v_active_days > 0
         then ' - trung bình khoảng '
              || round(v_minutes::numeric / v_active_days)::int
              || ' phút mỗi ngày'
         else '' end
    || '.</p>'
    || case when v_days_line <> ''
         then '<p style="color:#555;margin:4px 0">Theo ngày: ' || v_days_line || '.</p>'
         else '' end
    || v_home_html
    || '<h3 style="color:#b45309;margin:16px 0 4px">Thi thử</h3>'
    || v_mock_html
    || '<h3 style="color:#b45309;margin:16px 0 4px">Nên luyện</h3>'
    || v_weak_html
    || '<p>Mở app <a href="https://ea.vieschool.com">ea.vieschool.com</a> để xem báo cáo chi tiết theo kỹ năng của bé.</p>'
    || '<p style="color:#888;font-size:12px">Không muốn nhận email này? '
    || 'Tắt "Nhận báo cáo qua email" trong trang Báo cáo của app.</p>'
    || '</div>';
end;
$$;

revoke all on function practice.weekly_report_html(uuid)
  from public, anon, authenticated, service_role;
grant execute on function practice.weekly_report_html(uuid) to service_role;

-- ---------------------------------------------------------------------
-- send_weekly_reports v5: thin loop over weekly_report_html + send_email.
-- Per-parent guard: one contact's build or send failing (malformed blob,
-- bad row, transient error) logs a warning and the run continues - other
-- parents still get their digest. Recipient rules unchanged: opted-in,
-- verified, role 'student', once per UTC day.
-- ---------------------------------------------------------------------
create or replace function practice.send_weekly_reports()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_sent int := 0;
  v_subject text;
  v_html text;
  v_request_id bigint;
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
    begin
      v_html := practice.weekly_report_html(v_row.account_id);
      -- null = no activity this week -> nothing to report.
      continue when v_html is null;

      v_subject := 'VieSchool - Báo cáo tuần của '
        || practice.email_esc(v_row.display_name);
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
    exception when others then
      raise warning 'send_weekly_reports: digest for account % skipped: %',
        v_row.account_id, sqlerrm;
    end;
  end loop;

  return v_sent;
end;
$$;

revoke all on function practice.send_weekly_reports() from public, anon, authenticated, service_role;
