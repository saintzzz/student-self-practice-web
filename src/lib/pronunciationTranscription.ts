/**
 * Uploads a recorded pronunciation attempt to the `practice-transcribe`
 * edge function and returns the transcript (CR-62). The word/sentence
 * the child was asked to say is sent along so the STT prompt can bias
 * toward it - isolated kid speech is exactly what generic recognizers
 * flub.
 *
 * Deliberately does NOT go through getSupabase(): the guest-only path
 * (no env / `beheo-force-guest`) forbids creating the client, but the
 * build-time URL+key may still be present and the function is
 * verify_jwt=false - guests on iPhones must be able to record too.
 *
 * Returns the transcript string (possibly '' for silence) or null on
 * any transport/server failure - the caller maps '' to 'no-speech' and
 * null to a retryable 'transcription' error.
 */
import { blobToBase64 } from './audioRecording';

export async function transcribePronunciationAudio(
  blob: Blob,
  targetWord: string,
): Promise<string | null> {
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
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        audio,
        mimeType: blob.type || 'audio/webm',
        targetWord,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { transcript?: string };
    return typeof data.transcript === 'string' ? data.transcript : null;
  } catch {
    return null;
  }
}
