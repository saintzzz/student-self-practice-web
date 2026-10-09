-- CR-62 follow-up: multi-key fallback. get_ai_configs emits one row per
-- credential, so N Gemini keys = N attempts before falling through to
-- openrouter/openai. Extra keys are optional - the RPC picks up
-- gemini_api_key_2/_3 only when those vault secrets exist.

create or replace function practice.get_ai_configs()
returns table(provider text, api_key text, model text, base_url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order text;
begin
  select decrypted_secret into v_order
    from vault.decrypted_secrets where name = 'ai_provider' limit 1;
  v_order := lower(coalesce(v_order, 'gemini,openrouter,openai'));

  return query
    with cfg as (
      (select 'gemini'::text as p, s.decrypted_secret as k,
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'gemini_model' limit 1),
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'ai_model' limit 1),
               'gemini-flash-latest') as m,
             null::text as b,
             s.name as rk
      from vault.decrypted_secrets s
      where s.name in ('gemini_api_key','gemini_api_key_2','gemini_api_key_3'))
      union all
      (select 'openrouter',
             (select decrypted_secret from vault.decrypted_secrets
               where name = 'openrouter_api_key' limit 1),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'openrouter_model' limit 1),
               'google/gemini-2.5-flash'),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'openrouter_base_url' limit 1),
               'https://openrouter.ai/api/v1'),
             '')
      union all
      (select 'openai',
             (select decrypted_secret from vault.decrypted_secrets
               where name = 'openai_api_key' limit 1),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'openai_model' limit 1),
               'whisper-1'),
             null::text,
             '')
    )
    select cfg.p, cfg.k, cfg.m, cfg.b
      from cfg
     where cfg.k is not null
     order by coalesce(position(cfg.p in v_order), 99), cfg.p, cfg.rk;
end;
$$;

revoke all on function practice.get_ai_configs() from public, anon, authenticated;
grant execute on function practice.get_ai_configs() to service_role;
