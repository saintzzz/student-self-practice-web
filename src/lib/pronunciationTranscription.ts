/**
 * Uploads a recorded pronunciation attempt to the `practice-transcribe`
 * edge function (CR-62) in CR-90 'assess' mode: a provider that can hear
 * grades the audio against the target and returns {transcript, accuracy}
 * (accuracy = a direct pronunciation verdict, not a text-distance guess).
 * When every grader fails the function still returns a plain transcript
 * and the caller scores it locally - assess is an upgrade, not a new
 * failure mode.
 *
 * Deliberately does NOT go through getSupabase(): the guest-only path
 * (no env / `beheo-force-guest`) forbids creating the client, but the
 * build-time URL+key may still be present and the function is
 * verify_jwt=false - guests on iPhones must be able to record too.
 *
 * Returns { transcript, score? } or null on any transport/server
 * failure - transcript '' means silence; a present `score` is the
 * server's pronunciation accuracy (0-100) and short-circuits local
 * text-similarity scoring.
 */
import { blobToBase64 } from './audioRecording';

/** Decode whatever MediaRecorder produced (webm/opus, mp4/aac) and
 *  re-encode as 16kHz mono PCM WAV - the only format Azure Speech's
 *  pronunciation-assessment REST accepts, and universally accepted by
 *  Whisper/Groq/Gemini too. ~320KB for 10s, well under the 4MB cap.
 *  Returns null when WebAudio cannot decode (keep the original blob). */
async function toWav16kMono(blob: Blob): Promise<Blob | null> {
  try {
    const ctx = new AudioContext();
    const src = await ctx.decodeAudioData(await blob.arrayBuffer());
    const rate = 16000;
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(src.duration * rate)), rate);
    const node = off.createBufferSource();
    node.buffer = src;
    node.connect(off.destination);
    node.start();
    const rendered = await off.startRendering();
    void ctx.close();
    const pcm = rendered.getChannelData(0);
    const buf = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(buf);
    const tag = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    tag(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); tag(8, 'WAVE');
    tag(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    tag(36, 'data'); v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  } catch {
    return null;
  }
}

export interface PronunciationServerResult {
  transcript: string;
  /** Server-side pronunciation accuracy (0-100) when an assess-capable
      provider graded the audio; absent on the plain-transcript path. */
  score?: number;
  /** CR-90 follow-up: other plausible readings the grader offered when
      the audio was ambiguous - the scorer can rescue a buried correct
      attempt (heard "pen" top-1 while the child really said "hen"). */
  alternatives?: string[];
}

/** True when the build carries the Supabase URL+key the edge call needs -
    lets the recorder engine decide up front instead of failing on submit. */
export function isPronunciationServerConfigured(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return Boolean(env?.VITE_SUPABASE_URL && env?.VITE_SUPABASE_PUBLISHABLE_KEY);
}

/** Fire-and-forget HEAD that wakes the edge isolate and warms DNS/TLS
    so the real POST skips cold-start. The caller fires this when the
    mic opens - getUserMedia takes a few hundred ms anyway, so the
    overlap is free. no-cors HEAD never touches the response. */
export function warmPronunciationService(): void {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  if (env?.MODE === 'test') return;
  const base = env?.VITE_SUPABASE_URL;
  if (!base) return;
  void fetch(`${base}/functions/v1/practice-transcribe`, {
    method: 'HEAD',
    mode: 'no-cors',
  }).catch(() => {});
}

export async function transcribePronunciationAudio(
  blob: Blob,
  targetWord: string,
): Promise<PronunciationServerResult | null> {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  // Vitest never reaches the network - tests mock this module instead.
  if (env?.MODE === 'test') return null;
  const base = env?.VITE_SUPABASE_URL;
  const apiKey = env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !apiKey) return null;

  try {
    // Normalize to WAV when WebAudio can decode - Azure PA needs PCM;
    // whisper/gemini take wav just as happily. Original blob is the
    // fallback so a decode failure never blocks a recording.
    const send = (await toWav16kMono(blob)) ?? blob;
    const audio = await blobToBase64(send);
    const res = await fetch(`${base}/functions/v1/practice-transcribe`, {
      method: 'POST',
      signal: AbortSignal.timeout(60000),
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        audio,
        mimeType: send.type || 'audio/webm',
        targetWord,
        mode: 'assess',
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      transcript?: string;
      accuracy?: number;
      alternatives?: unknown;
    };
    if (typeof data.transcript !== 'string') return null;
    return {
      transcript: data.transcript,
      score:
        typeof data.accuracy === 'number' && Number.isFinite(data.accuracy)
          ? Math.max(0, Math.min(100, Math.round(data.accuracy)))
          : undefined,
      alternatives: Array.isArray(data.alternatives)
        ? data.alternatives.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
        : undefined,
    };
  } catch {
    return null;
  }
}
