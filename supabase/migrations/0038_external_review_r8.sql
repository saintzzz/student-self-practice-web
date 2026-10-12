-- EXTERNAL-REVIEW-r8 fixes
--
-- 1. verify-token-binding (r8 H): request_parent_verify read the email,
--    generated a token, then updated WHERE account_id - an interleaved
--    contact update could leave a token issued for address A stamped on a
--    row holding address B, and the confirm link would verify B. The
--    contact row is now locked FOR UPDATE for the whole read->send->stamp
--    sequence, so a concurrent email change either precedes the read (row
--    shows the new address) or follows the stamp (reset trigger clears
--    the token).
-- 2. verification-mail-quota (r8 M, new class): the resend throttle lived
--    on the contact row, so an email change (reset trigger) or a
--    delete+reinsert reset it - unlimited verify mails to an arbitrary
--    mailbox. Quota moves to verify_send_log keyed on account_id,
--    consumed atomically under the same row lock.
-- 3. privilege-mutation-compat (r8 M, new class): the client upsert
--    payload includes account_id; PostgREST ON CONFLICT DO UPDATE needs
--    UPDATE on every payload column, and r7 deliberately did not grant
--    UPDATE on account_id - saves 403'd. Saves now go through
--    save_parent_contact which writes only the mutable columns and binds
--    account_id itself.
-- 4. fetch-mode-parity (r8 M): public fetch mapped p_mode='exam' to
--    mockEligible while the authenticated fetch used examEligible - the
--    same mode returned different row sets depending on the auth path.
--    Both RPCs now share the same per-mode eligibility predicate.

-- ---------- 3. save_parent_contact: ownership-bound, mutable cols only ----------
create or replace function practice.save_parent_contact(
  p_email text,
  p_opted_in boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'auth-required');
  end if;
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid-email');
  end if;

  insert into practice.parent_contacts (account_id, email, opted_in, updated_at)
  values (v_uid, v_email, coalesce(p_opted_in, true), now())
  on conflict (account_id) do update
    set email = excluded.email,
        opted_in = excluded.opted_in,
        updated_at = excluded.updated_at;
  -- the email-change trigger resets verified/verify_token automatically.

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function practice.save_parent_contact(text, boolean) from public, anon;
grant execute on function practice.save_parent_contact(text, boolean) to authenticated;
-- With saves routed through the RPC, the client no longer needs to write
-- the table at all - fail closed on any stale direct-write path.
revoke insert (account_id, email, opted_in, updated_at)
  on practice.parent_contacts from authenticated;
revoke update (email, opted_in, updated_at)
  on practice.parent_contacts from authenticated;

-- ---------- 2. row-independent verify-send quota ----------
create table if not exists practice.verify_send_log (
  account_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table practice.verify_send_log enable row level security;
revoke all on practice.verify_send_log from public, anon, authenticated, service_role;

-- ---------- 1+2. request_parent_verify: locked, quota-backed ----------
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
  v_recent int;
  v_token uuid;
  v_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'auth-required');
  end if;

  -- Lock the contact row for the whole read->send->stamp sequence. A
  -- concurrent save_parent_contact / direct update waits; whichever lands
  -- second sees a consistent row (or the reset trigger clears the token).
  perform 1 from practice.parent_contacts
    where account_id = v_uid
    for update;

  select pc.email, pc.verified
    into v_email, v_verified
  from practice.parent_contacts pc
  where pc.account_id = v_uid;
  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'no-contact');
  end if;
  if v_verified then
    return jsonb_build_object('ok', true, 'already_verified', true);
  end if;

  -- Quota lives on account_id, not the contact row - changing the email or
  -- deleting+reinserting the contact no longer resets the send clock.
  select count(*) into v_recent
  from practice.verify_send_log l
  where l.account_id = v_uid
    and l.sent_at > now() - interval '10 minutes';
  if v_recent >= 1 then
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

  insert into practice.verify_send_log (account_id) values (v_uid);

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function practice.request_parent_verify() from public, anon;
grant execute on function practice.request_parent_verify() to authenticated;

-- ---------- 4. fetch_questions_public: per-mode eligibility parity ----------
create or replace function practice.fetch_questions_public(
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
revoke all on function practice.fetch_questions_public(smallint, text, int, text[], smallint, text) from public;
grant execute on function practice.fetch_questions_public(smallint, text, int, text[], smallint, text) to anon, authenticated, service_role;
