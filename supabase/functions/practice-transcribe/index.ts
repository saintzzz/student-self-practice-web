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

const ALLOWED_ORIGINS = new Set([
  'https://ea.vieschool.com',
  'https://ioe-leduyminh.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  const extra = (Deno.env.get('ALLOWED_ORIGIN') ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  const allowed = ALLOWED_ORIGINS.has(origin) || extra.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://ea.vieschool.com',
    Vary: 'Origin',
  };
};
const CORS = {
  'Access-Control-Allow-Origin': 'https://ea.vieschool.com',
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
// CR-90 r49: assess gets its own sub-budget and attempt cap so a slow
// grader chain cannot eat the whole window - the plain-transcription
// fallback below must always get real time to run.
const ASSESS_BUDGET_MS = 20000;
const ASSESS_MAX_ATTEMPTS = 3;

// External-review r3: verify_jwt=false means guests can call us - an
// unauthenticated POST burns real AI quota per attempt. The limiter is a
// shared atomic DB counter (practice.check_rate_limit) so isolates and
// restarts cannot multiply the allowance; Cloudflare/Supabase WAF rules
// cover the rest.
const RATE_WINDOW_S = 60;
const RATE_MAX_PER_IP = 10;
async function rateLimited(
  svc: ReturnType<typeof createClient>,
  ip: string,
): Promise<boolean> {
  const { data, error } = await svc.rpc('check_rate_limit', {
    p_bucket: `stt:${ip}`,
    p_max: RATE_MAX_PER_IP,
    p_window_seconds: RATE_WINDOW_S,
  });
  // Fail closed: a broken limiter means no quota guard at all.
  if (error) return true;
  return (data as number) < 0;
}

function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, ...(req ? corsFor(req) : {}), 'Content-Type': 'application/json' },
  });
}

// CR-90 assess mode: instead of guessing the words, the provider listens
// to the audio and grades it against the known target directly - the same
// judgment a teacher makes. Transcript-based scoring can never tell
// "cat" said correctly from "cat" spelled wrong ("Kate"); accuracy can.
// Returns {heard, accuracy 0-100} or an __ERR_/null like the transcribe
// helpers. Providers that cannot grade audio (Whisper) are skipped in
// assess mode - the caller falls back to plain transcription and scores
// the transcript client-side.
interface AssessResult {
  heard: string;
  accuracy: number;
  /* CR-90 follow-up: other plausible readings when the audio was
     ambiguous (minimal pairs like hen/pen). The client rescues an
     attempt whose true word the grader buried at rank 2. */
  heardAlt: string[];
}

const ASSESS_PROMPT =
  'You are grading an English pronunciation attempt by a Vietnamese primary-school child. ' +
  'The child was asked to say this word or phrase: "__TARGET__". ' +
  'Listen to the audio carefully. Reply with ONLY a JSON object, no markdown: ' +
  '{"heard": "<the closest English words the child actually said>", ' +
  '"heard_alt": ["<up to 2 other plausible English words if the audio was ambiguous, else empty>"], ' +
  '"accuracy": <0-100>}. ' +
  'accuracy scores how close the sounds are to the target pronunciation: ' +
  '90-100 clearly correct (a child accent is fine), 70-89 recognizable as the target ' +
  'with minor distortion, 40-69 badly distorted or a different-sounding attempt, ' +
  '0-39 a clearly different English word, silence, or unintelligible. ' +
  'Do not assume the child said the target - judge what you actually hear.';

function parseAssessJson(text: string | null): AssessResult | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as { heard?: unknown; heard_alt?: unknown; accuracy?: unknown };
    const heard = typeof j.heard === 'string' ? j.heard.trim() : '';
    const heardAlt = Array.isArray(j.heard_alt)
      ? j.heard_alt
          .filter((a): a is string => typeof a === 'string')
          .map((a) => a.trim())
          .filter((a) => a.length > 0 && a.toLowerCase() !== heard.toLowerCase())
          .slice(0, 2)
      : [];
    const accuracy =
      typeof j.accuracy === 'number' ? Math.max(0, Math.min(100, Math.round(j.accuracy))) : NaN;
    if (Number.isNaN(accuracy)) return null;
    return { heard, accuracy, heardAlt };
  } catch {
    return null;
  }
}

async function assessGemini(
  key: string,
  model: string,
  audioB64: string,
  mimeType: string,
  targetWord: string,
): Promise<AssessResult | null | string> {
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
              { text: ASSESS_PROMPT.replace('__TARGET__', targetWord) },
              { inline_data: { mime_type: mimeType, data: audioB64 } },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 128,
          temperature: 0,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );
  if (!res.ok) return `__ERR_${res.status}:${(await res.text()).slice(0, 200)}`;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? null;
  return parseAssessJson(text);
}

async function assessOpenRouter(
  key: string,
  model: string,
  baseUrl: string,
  audioB64: string,
  mimeType: string,
  targetWord: string,
): Promise<AssessResult | null | string> {
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
            { type: 'text', text: ASSESS_PROMPT.replace('__TARGET__', targetWord) },
            { type: 'input_audio', input_audio: { data: audioB64, format } },
          ],
        },
      ],
      max_tokens: 96,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) return `__ERR_${res.status}:${(await res.text()).slice(0, 200)}`;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return parseAssessJson(data.choices?.[0]?.message?.content?.trim() ?? null);
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...CORS, ...corsFor(req) } });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405, req);

  // Rate-limit bucket identity must come from the LAST x-forwarded-for entry -
  // the ingress proxy appends the real peer there. The first entries and
  // cf-connecting-ip are caller-supplied headers a client can rotate to
  // escape the bucket (external review r6).
  const xff = req.headers.get('x-forwarded-for');
  const ip =
    xff?.split(',').pop()?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'practice' },
  });
  if (await rateLimited(svc, ip)) {
    return json({ error: 'rate limited' }, 429, req);
  }

  try {
    // Config + body parse overlap each other (one RTT saved) but only
    // AFTER the limiter passed - firing them earlier let rate-limited
    // callers still burn an RPC + a large-payload parse (r87).
    // Promise.resolve assimilates the PostgrestBuilder thenable - rpc()
    // does not expose .catch on every client version.
    const cfgPromise = Promise.resolve(svc.rpc('get_ai_configs')).catch(
      (e: unknown) => ({ data: null, error: e }),
    );
    const body = await req.json().catch(() => ({}));
    const audioB64 = String(body?.audio ?? '');
    const mimeType = String(body?.mimeType ?? 'audio/webm');
    const targetWord = String(body?.targetWord ?? '').slice(0, 200);
    // CR-90: 'assess' asks providers to grade the audio against the
    // target directly; anything else keeps the plain transcript path.
    const mode = String(body?.mode ?? 'transcribe');

    if (!audioB64 || !targetWord) {
      return json({ error: 'missing audio or targetWord' }, 400, req);
    }
    // base64 inflates ~4/3 - compare decoded size.
    if (audioB64.length > MAX_AUDIO_BYTES * 1.4) {
      return json({ error: 'audio too large' }, 413, req);
    }

    const { data: cfg, error: cfgErr } = await cfgPromise;
    const ais = (Array.isArray(cfg) ? cfg : cfg ? [cfg] : []).filter(
      (c) => c?.api_key,
    );
    if (cfgErr || ais.length === 0) {
      return json({ error: 'transcription not configured' }, 503, req);
    }

    // Try each configured row - get_ai_configs emits one row per credential
    // (gemini_api_key, gemini_api_key_2, ...), so a 4xx/5xx, timeout, or
    // empty transcript falls through to the next key/provider. The first
    // two rows race in parallel: whichever answers first wins, so a slow
    // or 503-ing head key never serializes the whole chain.
    const details: string[] = [];
    const deadline = Date.now() + OVERALL_BUDGET_MS;

    // CR-90 assess pass: only providers that can hear + grade (gemini,
    // openrouter). A success returns {transcript, accuracy} and ends the
    // request; total failure falls through to the plain transcribe chain
    // below so the client can still score a transcript locally.
    if (mode === 'assess') {
      const graders = ais
        .filter((ai) =>
          ['gemini', 'openrouter'].includes(String(ai.provider ?? 'gemini').toLowerCase()),
        )
        .slice(0, ASSESS_MAX_ATTEMPTS);
      const assessDeadline = Math.min(deadline, Date.now() + ASSESS_BUDGET_MS);
      const assessAttempt = async (
        ai: Record<string, unknown>,
      ): Promise<AssessResult | null> => {
        const provider = String(ai.provider ?? 'gemini').toLowerCase();
        const model =
          (ai.model as string) ??
          (provider === 'openrouter' ? 'google/gemini-2.5-flash' : 'gemini-2.5-flash');
        try {
          const r =
            provider === 'openrouter'
              ? await assessOpenRouter(
                  String(ai.api_key),
                  model,
                  String(ai.base_url ?? 'https://openrouter.ai/api/v1'),
                  audioB64,
                  mimeType,
                  targetWord,
                )
              : await assessGemini(String(ai.api_key), model, audioB64, mimeType, targetWord);
          if (r !== null && typeof r === 'object') return r;
          details.push(typeof r === 'string' ? r.slice(0, 160) : `${provider}:no-json`);
        } catch {
          details.push(`${provider}:throw`);
        }
        return null;
      };
      // Head race: the first two graders fire together and the fastest
      // verdict wins - a slow or 5xx-ing provider no longer serializes
      // the assess pass (same shape as the transcribe race below). The
      // budget timer also hard-enforces ASSESS_BUDGET_MS on the race so
      // a hung head cannot eat the plain-transcribe leg's share.
      let winner: AssessResult | null = null;
      const head = graders.slice(0, 2);
      if (head.length) {
        winner = await new Promise<AssessResult | null>((resolve) => {
          let remaining = head.length;
          let settled = false;
          const budgetTimer = setTimeout(() => {
            if (settled) return;
            settled = true;
            details.push('timeout:assess-budget');
            resolve(null);
          }, Math.max(50, assessDeadline - Date.now()));
          for (const ai of head) {
            void assessAttempt(ai).then((r) => {
              if (settled) return;
              if (r) {
                settled = true;
                clearTimeout(budgetTimer);
                return resolve(r);
              }
              if (--remaining === 0) {
                settled = true;
                clearTimeout(budgetTimer);
                resolve(null);
              }
            });
          }
        });
      }
      for (const ai of graders.slice(2)) {
        if (winner || Date.now() >= assessDeadline) {
          if (!winner) details.push('timeout:assess-budget');
          break;
        }
        winner = await assessAttempt(ai);
      }
      if (winner) {
        return json(
          { transcript: winner.heard, accuracy: winner.accuracy, alternatives: winner.heardAlt },
          200,
          req,
        );
      }
      // All graders failed - fall through to plain transcription.
      details.push('assess:fallback');
    }

    const attempt = async (ai: Record<string, unknown>): Promise<string | null> => {
      const provider = String(ai.provider ?? 'gemini').toLowerCase();
      const model =
        (ai.model as string) ??
        (provider === 'openai' ? 'whisper-1' : 'gemini-2.5-flash');
      try {
        const t =
          provider === 'openai'
            ? await transcribeOpenAI(String(ai.api_key), model, audioB64, mimeType, targetWord)
            : provider === 'openrouter'
              ? await transcribeOpenRouter(
                  String(ai.api_key),
                  model,
                  String(ai.base_url ?? 'https://openrouter.ai/api/v1'),
                  audioB64,
                  mimeType,
                  targetWord,
                )
              : await transcribeGemini(String(ai.api_key), model, audioB64, mimeType, targetWord);
        return t;
      } catch {
        return null;
      }
    };
    const ok = (t: string | null) =>
      t !== null && !t.startsWith('__ERR_') && t !== '';
    const errOf = (t: string | null, ai: Record<string, unknown>) =>
      t ?? `${String(ai.provider ?? 'gemini')}:null`;

    // Head race: fire the first two rows together.
    const head = ais.slice(0, 2);
    const tail = ais.slice(2);
    if (head.length) {
      const winner = await new Promise<string | null>((resolve) => {
        let remaining = head.length;
        for (const ai of head) {
          attempt(ai).then((t) => {
            if (ok(t)) return resolve(t);
            details.push(errOf(t, ai));
            if (--remaining === 0) resolve(null);
          });
        }
      });
      if (winner) return json({ transcript: winner }, 200, req);
    }

    for (const ai of tail) {
      if (Date.now() >= deadline) {
        details.push('timeout:budget');
        break;
      }
      const transcript = await attempt(ai);
      if (ok(transcript)) {
        return json({ transcript: transcript as string }, 200, req);
      }
      details.push(errOf(transcript, ai));
      if (details.length > 8) break;
    }
    return json(
      { error: 'all providers failed', detail: details.map((d) => d.slice(0, 160)) },
      502,
      req,
    );
  } catch (err) {
    console.error('practice-transcribe error', err);
    return json({ error: 'internal error' }, 500, req);
  }
});
