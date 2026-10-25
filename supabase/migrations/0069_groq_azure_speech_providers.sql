-- Pronunciation-scoring provider expansion: two free-tier lanes.
--
--   groq   : Whisper large-v3-turbo on GroqCloud's free tier (~8 audio
--            hours/day). OpenAI-compatible /audio/transcriptions - the
--            edge function reuses the openai call shape with a different
--            base_url. Transcribe-only (no assess) - Whisper cannot
--            grade, it hears.
--   azure  : Azure AI Speech Pronunciation Assessment - the purpose-built
--            phoneme grader (Accuracy/Fluency/Prosody/Completeness per
--            word AND over a scripted paragraph). F0 free tier gives 5
--            audio hours/month. Key + region come from vault; the full
--            endpoint is derivable from the region.
--
-- Vault keys:
--   groq_api_key                        : console.groq.com key
--   groq_model        (opt)             : default whisper-large-v3-turbo
--   groq_base_url     (opt)             : default https://api.groq.com/openai/v1
--   azure_speech_key                    : Azure Speech resource key
--   azure_speech_region (opt)           : default southeastasia (nearest VN)
--   azure_speech_locale (opt)           : default en-US
--   azure_speech_endpoint (opt)         : full URL override
--   ai_provider                         : order, default
--                                        'gemini,groq,azure,openrouter,openai'

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
  v_order := lower(coalesce(v_order, 'gemini,groq,azure,openrouter,openai'));

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
      (select 'groq',
             (select decrypted_secret from vault.decrypted_secrets
               where name = 'groq_api_key' limit 1),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'groq_model' limit 1),
               'whisper-large-v3-turbo'),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'groq_base_url' limit 1),
               'https://api.groq.com/openai/v1'),
             1)
      union all
      (select 'azure',
             (select decrypted_secret from vault.decrypted_secrets
               where name = 'azure_speech_key' limit 1),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'azure_speech_locale' limit 1),
               'en-US'),
             coalesce(
               (select decrypted_secret from vault.decrypted_secrets
                 where name = 'azure_speech_endpoint' limit 1),
               'https://' || coalesce(
                 (select decrypted_secret from vault.decrypted_secrets
                   where name = 'azure_speech_region' limit 1),
                 'southeastasia') ||
                 '.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1'),
             1)
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
