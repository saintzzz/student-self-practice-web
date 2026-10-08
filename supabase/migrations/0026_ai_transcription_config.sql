-- CR-62: mobile pronunciation recording -> MediaRecorder + server STT.
--
-- iOS/iPadOS webkitSpeechRecognition exists but is unusable in practice
-- (Siri/dictation dependency, network/service-not-allowed errors, silent
-- retries lose the user gesture). The new path records audio with
-- MediaRecorder and calls edge function `practice-transcribe`, which
-- needs AI provider keys. Keys live in Vault - same pattern as
-- email_provider/email_api_key (CR-25/CR-61) - read via this SECURITY
-- DEFINER RPC granted to service_role only (edge functions hold the
-- service key; PostgREST never exposes vault to clients).
--
-- Vault keys (any subset - each provider tried in order):
--   gemini_api_key / openai_api_key : provider API key
--   ai_provider                     : force single provider order, e.g.
--                                   'openai,gemini' (default gemini,openai)
--   ai_model / openai_model         : optional model overrides
--
-- A shared Gemini free-tier key hits 429s - the fallback chain lets a
-- second provider absorb the load without a redeploy.

create or replace function practice.get_ai_configs()
returns table(provider text, api_key text, model text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order text;
begin
  select decrypted_secret into v_order
    from vault.decrypted_secrets where name = 'ai_provider' limit 1;
  v_order := lower(coalesce(v_order, 'gemini,openai'));

  return query
    with cfg as (
      select 'gemini'::text as p,
             (select decrypted_secret from vault.decrypted_secrets
               where name = 'gemini_api_key' limit 1) as k,
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'gemini_model' limit 1),
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'ai_model' limit 1),
               'gemini-2.5-flash') as m
      union all
      select 'openai',
             (select decrypted_secret from vault.decrypted_secrets
               where name = 'openai_api_key' limit 1),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'openai_model' limit 1),
               'whisper-1')
    )
    select cfg.p, cfg.k, cfg.m
      from cfg
     where cfg.k is not null
     order by coalesce(position(cfg.p in v_order), 99), cfg.p;
end;
$$;

-- Edge functions hold the service key; nobody else may read keys.
revoke all on function practice.get_ai_configs() from public, anon, authenticated;
grant execute on function practice.get_ai_configs() to service_role;
