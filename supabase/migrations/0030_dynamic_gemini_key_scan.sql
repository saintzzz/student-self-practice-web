-- CR-62 follow-up: scan gemini_api_key* vault secrets dynamically so new
-- keys (gemini_api_key_4, _5, ...) are picked up without a migration.
-- Ordering uses the numeric suffix (key, _2, _3, ...) not lexicographic
-- name order, so _10 sorts after _9.

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
             coalesce(nullif(substring(s.name from 'gemini_api_key_([0-9]+)$'), '')::int, 1) as rk
      from vault.decrypted_secrets s
      where s.name ~ '^gemini_api_key(_[0-9]+)?$')
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
             1)
      union all
      (select 'openai',
             (select decrypted_secret from vault.decrypted_secrets
               where name = 'openai_api_key' limit 1),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'openai_model' limit 1),
               'whisper-1'),
             null::text,
             1)
    )
    select cfg.p, cfg.k, cfg.m, cfg.b
      from cfg
     where cfg.k is not null
     order by coalesce(position(cfg.p in v_order), 99), cfg.p, cfg.rk;
end;
$$;

revoke all on function practice.get_ai_configs() from public, anon, authenticated;
grant execute on function practice.get_ai_configs() to service_role;
