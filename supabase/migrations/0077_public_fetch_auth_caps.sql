-- CR-134 follow-up (0077): fetch_questions_public serves BOTH guests
-- and authenticated callers. 0076 raised the authed caps on
-- fetch_questions/fetch_questions_adaptive but left the public wrapper
-- at guest sizing (60 calls / 2500 rows per IP) - an authenticated
-- classroom routed through it would still hit PT429 mid-lesson.
--
-- Split the IP bucket by caller identity: authenticated callers share
-- the classroom-scale 400/30000 budget introduced in 0076; guests keep
-- the strict 60/2500 budget that guards the anonymous scraping surface.
-- The global public pool (fq_pub_*) is unchanged.

create or replace function practice.fetch_questions_public(
  p_grade smallint, p_subject text, p_count integer default 20,
  p_skills text[] default null::text[], p_min_difficulty smallint default null::smallint,
  p_mode text default 'practice'::text, p_guest_ticket text default null::text
)
returns setof jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  v_ip text := practice.client_ip();
  v_rows int := greatest(1, least(p_count, 200));
  v_actor text := coalesce(auth.uid()::text, 'guest:' || coalesce(practice.client_ip(), 'unknown'));
  v_secret text;
  v_ids text[] := '{}';
  rec record;
begin
  if auth.uid() is null and not practice.verify_guest_ticket(p_guest_ticket) then
    raise exception 'guest_challenge_required' using errcode = 'PT401';
  end if;
  if v_ip is not null then
    if auth.uid() is not null then
      -- Authenticated classroom: school-NAT caps from 0076.
      if practice.check_rate_limit('fq_ip_calls:' || v_ip, 400, 3600) < 0
         or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 30000, 3600) < 0 then
        raise exception 'rate_limited' using errcode = 'PT429';
      end if;
    elsif practice.check_rate_limit('fq_ip_calls:' || v_ip, 60, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 2500, 3600) < 0 then
      raise exception 'rate_limited' using errcode = 'PT429';
    end if;
  end if;
  -- Authenticated callers keep their per-uid budget here too: without
  -- this charge the public wrapper would bypass the 4000-row uid cap on
  -- the authed path and become the stronger scraping route. Charging
  -- the SHARED fq_uid_* keys also blocks uid double-draw across the two
  -- paths (the 0049 anti-splitting design).
  if auth.uid() is not null
     and (practice.check_rate_limit('fq_uid_calls:' || auth.uid()::text, 60, 3600) < 0
       or practice.check_rate_limit_weighted('fq_uid_rows:' || auth.uid()::text, v_rows, 4000, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  -- The shared public pool bounds the anonymous surface; authenticated
  -- callers are already bounded by per-uid caps elsewhere and must not
  -- drain the guest budget (a classroom would starve every guest).
  if auth.uid() is null
     and (practice.check_rate_limit('fq_pub_calls', 300, 3600) < 0
       or practice.check_rate_limit_weighted('fq_pub_rows', v_rows, 8000, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'leak_wm_secret' limit 1;
  for rec in
    select practice.strip_bank_row(j) as r
    from practice.fetch_questions_public__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j
  loop
    v_ids := v_ids || (rec.r->>'id');
    return next rec.r || practice.leak_wm_tag(rec.r->>'id', v_actor, v_secret);
  end loop;
  perform practice.log_fetch_audit('fetch_questions_public', v_ids, v_actor);
end;
$$;

grant execute on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text, text)
  to anon, authenticated, service_role;
