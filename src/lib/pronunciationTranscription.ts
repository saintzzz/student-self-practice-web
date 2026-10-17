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

export interface PronunciationServerResult {
  transcript: string;
  /** Server-side pronunciation accuracy (0-100) when an assess-capable
      provider graded the audio; absent on the plain-transcript path. */
  score?: number;
}

/** True when the build carries the Supabase URL+key the edge call needs -
    lets the recorder engine decide up front instead of failing on submit. */
export function isPronunciationServerConfigured(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return Boolean(env?.VITE_SUPABASE_URL && env?.VITE_SUPABASE_PUBLISHABLE_KEY);
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
    const audio = await blobToBase64(blob);
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
        mimeType: blob.type || 'audio/webm',
        targetWord,
        mode: 'assess',
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { transcript?: string; accuracy?: number };
    if (typeof data.transcript !== 'string') return null;
    return {
      transcript: data.transcript,
      score:
        typeof data.accuracy === 'number' && Number.isFinite(data.accuracy)
          ? Math.max(0, Math.min(100, Math.round(data.accuracy)))
          : undefined,
    };
  } catch {
    return null;
  }
}
