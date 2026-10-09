// CR-62 practice-transcribe: server-side speech-to-text for the Round 3
// pronunciation-recording questions. iOS/iPadOS webkitSpeechRecognition
// is unusable in practice, so the client records real audio via
// MediaRecorder and posts it here; we transcribe with the AI provider
// configured in vault (gemini_api_key/openai_api_key/..., read through
// practice.get_ai_configs - same vault-RPC pattern as email config).
//
// verify_jwt=false: guests play without accounts. Abuse surface is
// small - audio payloads are capped and the function only transcribes.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ~10s of compressed audio; hard cap regardless of mime type.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

// Each provider/key gets a short shot; the whole chain must answer well
// inside the client's ~60s patience, so per-attempt is tight and the loop
// stops once the overall budget is spent rather than grinding through all
// credentials while the caller has already given up.
const ATTEMPT_TIMEOUT_MS = 12000;
const OVERALL_BUDGET_MS = 45000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Gemini transcribes audio sent as inline_data; OpenRouter uses
// chat/completions with input_audio (OpenAI-compatible); OpenAI uses
// the whisper transcription endpoint (multipart upload).
async function transcribeOpenRouter(
  key: string,
  model: string,
  baseUrl: string,
  audioB64: string,
  mimeType: string,
  _targetWord: string,
): Promise<string | null> {
  const format = mimeType.includes('mp4') || mimeType.includes('aac') || mimeType.includes('m4a')
    ? 'mp4'
    : mimeType.includes('wav')
      ? 'wav'
      : 'webm';
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'A Vietnamese primary-school child is practicing English pronunciation. ' +
                'Transcribe exactly what the child actually said in English - ' +
                'the closest English words you hear, even if the pronunciation ' +
                'is wrong or different from any expected answer. ' +
                'Reply with only the transcript - no quotes, no explanation. ' +
                'If the audio is silent or unintelligible, reply with an empty string.',
            },
            {
              type: 'input_audio',
              input_audio: { data: audioB64, format },
            },
          ],
        },
      ],
      max_tokens: 64,
      temperature: 0,
    }),
  });
  if (!res.ok) return `__ERR_${res.status}:${(await res.text()).slice(0, 200)}`;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}
async function transcribeGemini(
  key: string,
  model: string,
  audioB64: string,
  mimeType: string,
  _targetWord: string,
): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'A Vietnamese primary-school child is practicing English pronunciation. ' +
                  'Transcribe exactly what the child actually said in English - ' +
                  'the closest English words you hear, even if the pronunciation ' +
                  'is wrong or different from any expected answer. ' +
                  'Reply with only the transcript - no quotes, no explanation. ' +
                  'If the audio is silent or unintelligible, reply with an empty string.',
              },
              {
                inline_data: { mime_type: mimeType, data: audioB64 },
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 128,
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );
  if (!res.ok) return `__ERR_${res.status}:${(await res.text()).slice(0, 200)}`;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();
  return text ?? null;
}

async function transcribeOpenAI(
  key: string,
  model: string,
  audioB64: string,
  mimeType: string,
  _targetWord: string,
): Promise<string | null> {
  const bytes = Uint8Array.from(atob(audioB64), (c) => c.charCodeAt(0));
  const ext = mimeType.includes('mp4') || mimeType.includes('aac')
    ? 'mp4'
    : mimeType.includes('ogg')
      ? 'ogg'
      : 'webm';
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeType }), `audio.${ext}`);
  form.append('model', model);
  // CR-64: khong dua targetWord vao prompt - Whisper bias manh theo no
  // nen se "nghe" ra dap an mong doi du em noi sai.
  form.append('prompt', 'A child speaking English.');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) return `__ERR_${res.status}:${(await res.text()).slice(0, 200)}`;
  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const audioB64 = String(body?.audio ?? '');
    const mimeType = String(body?.mimeType ?? 'audio/webm');
    const targetWord = String(body?.targetWord ?? '').slice(0, 200);

    if (!audioB64 || !targetWord) {
      return json({ error: 'missing audio or targetWord' }, 400);
    }
    // base64 inflates ~4/3 - compare decoded size.
    if (audioB64.length > MAX_AUDIO_BYTES * 1.4) {
      return json({ error: 'audio too large' }, 413);
    }

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      db: { schema: 'practice' },
    });
    const { data: cfg, error: cfgErr } = await svc.rpc('get_ai_configs');
    const ais = (Array.isArray(cfg) ? cfg : cfg ? [cfg] : []).filter(
      (c) => c?.api_key,
    );
    if (cfgErr || ais.length === 0) {
      return json({ error: 'transcription not configured' }, 503);
    }

    // Try each configured row in vault order - get_ai_configs emits one row
    // per credential (gemini_api_key, gemini_api_key_2, ...), so a 4xx/5xx,
    // timeout, or empty transcript falls through to the next key/provider.
    const details: string[] = [];
    const deadline = Date.now() + OVERALL_BUDGET_MS;
    for (const ai of ais) {
      if (Date.now() >= deadline) {
        details.push('timeout:budget');
        break;
      }
      const provider = String(ai.provider ?? 'gemini').toLowerCase();
      const model =
        ai.model ?? (provider === 'openai' ? 'whisper-1' : 'gemini-2.5-flash');
      let transcript: string | null;
      try {
        transcript =
          provider === 'openai'
            ? await transcribeOpenAI(ai.api_key, model, audioB64, mimeType, targetWord)
            : provider === 'openrouter'
              ? await transcribeOpenRouter(
                  ai.api_key,
                  model,
                  ai.base_url ?? 'https://openrouter.ai/api/v1',
                  audioB64,
                  mimeType,
                  targetWord,
                )
              : await transcribeGemini(ai.api_key, model, audioB64, mimeType, targetWord);
      } catch {
        transcript = null;
      }
      if (transcript !== null && !transcript.startsWith('__ERR_') && transcript !== '') {
        return json({ transcript });
      }
      details.push(transcript ?? `${provider}:null`);
      if (details.length > 8) break;
    }
    return json(
      { error: 'all providers failed', detail: details.map((d) => d.slice(0, 160)) },
      502,
    );
  } catch (err) {
    console.error('practice-transcribe error', err);
    return json({ error: 'internal error' }, 500);
  }
});
