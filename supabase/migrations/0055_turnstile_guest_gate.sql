-- CR-108: Turnstile guest gate for fetch_questions_public. A distributed
-- botnet stays under the per-IP caps, so guests now need a single-signed
-- ticket minted by the practice-turnstile edge function AFTER a Cloudflare
-- Turnstile challenge. Authed callers (auth.uid() not null) are exempt -
-- their uid caps already bind.
--
-- Ticket = base64url("v1|<ip>|<exp_unix>|<nonce>") .. "." .. hmac_sha256
-- Signed payload carries the client IP so a ticket cannot hop networks;
-- verify_guest_ticket re-derives the IP via practice.client_ip().

-- practice.get_turnstile_config: service_role-only vault read used by the
-- edge function to fetch the siteverify secret + ticket signing secret.
create or replace function practice.get_turnstile_config()
returns jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
begin
  return jsonb_build_object(
    'siteverify_secret',
      (select decrypted_secret from vault.decrypted_secrets
        where name = 'turnstile_secret' limit 1),
    'ticket_secret',
      (select decrypted_secret from vault.decrypted_secrets
        where name = 'guest_ticket_secret' limit 1));
end;
$function$;
revoke all on function practice.get_turnstile_config() from public, anon, authenticated;
grant execute on function practice.get_turnstile_config() to service_role;

-- practice.verify_guest_ticket: validates the HMAC ticket. SECURITY DEFINER
-- because vault.decrypted_secrets is not readable by anon; the function is
-- not granted to anyone - it is only invoked inside the definer chain of
-- fetch_questions_public, which runs as its owner.
create or replace function practice.verify_guest_ticket(p_ticket text)
returns boolean
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog', 'extensions'
as $function$
declare
  v_payload text;
  v_sig text;
  v_parts text[];
  v_secret text;
  v_ip text := practice.client_ip();
begin
  if p_ticket is null or position('.' in p_ticket) = 0 then
    return false;
  end if;
  v_payload := convert_from(
    decode(
      translate(split_part(p_ticket, '.', 1), '-_', '+/')
      || repeat('=', (4 - length(split_part(p_ticket, '.', 1)) % 4) % 4),
      'base64'),
    'utf8');
  v_sig := split_part(p_ticket, '.', 2);
  v_parts := string_to_array(v_payload, '|');
  if coalesce(array_length(v_parts, 1), 0) <> 4 or v_parts[1] <> 'v1' then
    return false;
  end if;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'guest_ticket_secret' limit 1;
  if v_secret is null then
    return false;
  end if;
  if encode(extensions.hmac(v_payload::bytea, v_secret::bytea, 'sha256'), 'hex')
     <> v_sig then
    return false;
  end if;
  if v_parts[3]::bigint < extract(epoch from now())::bigint then
    return false;
  end if;
  -- IP binding: skip only when the caller context has no XFF (non-PostgREST
  -- path, same fail-open convention as the per-IP caps).
  if v_ip is not null and v_parts[2] <> v_ip then
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$function$;
revoke all on function practice.verify_guest_ticket(text) from public, anon, authenticated, service_role;

-- fetch_questions_public: guests (auth.uid() is null) need a valid ticket;
-- authed callers unchanged. All existing caps keep running after the gate.
drop function if exists practice.fetch_questions_public(smallint, text, integer, text[], smallint, text);
create or replace function practice.fetch_questions_public(
  p_grade smallint, p_subject text, p_count integer default 20,
  p_skills text[] default null::text[], p_min_difficulty smallint default null::smallint,
  p_mode text default 'practice'::text,
  p_guest_ticket text default null::text
)
returns setof jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_ip text := practice.client_ip();
  v_rows int := greatest(1, least(p_count, 200));
begin
  if auth.uid() is null and not practice.verify_guest_ticket(p_guest_ticket) then
    raise exception 'guest_challenge_required' using errcode = 'PT401';
  end if;
  -- fail-open: no XFF (non-PostgREST path) -> skip per-IP, global pool
  -- still applies, never worse than the pre-0049 state.
  if v_ip is not null
     and (practice.check_rate_limit('fq_ip_calls:' || v_ip, 60, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 2500, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if practice.check_rate_limit('fq_pub_calls', 300, 3600) < 0
     or practice.check_rate_limit_weighted('fq_pub_rows', v_rows, 8000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  -- CR-102: keyless rows - strip_bank_row removes answer + explanation_vi.
  return query
    select practice.strip_bank_row(j)
    from practice.fetch_questions_public__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
end;
$function$;
revoke all on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text, text) from public;
grant execute on function practice.fetch_questions_public(smallint, text, integer, text[], smallint, text, text) to anon, authenticated;
