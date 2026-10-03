/**
 * Kept alive outside speak()'s call frame - mobile Chrome and Safari have a
 * well-documented bug where a SpeechSynthesisUtterance with no surviving
 * reference gets garbage-collected mid-utterance and the speech silently
 * cuts off or never starts. A single module-level slot is enough since this
 * app only ever needs one utterance in flight at a time.
 */
let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * getVoices() is loaded asynchronously by the OS's TTS engine on many
 * Android Chrome builds - calling it before that finishes returns an empty
 * list, and the very first speak() attempt on a fresh page load can then
 * silently produce no sound at all (no voice resolves for the requested
 * lang). "Warming up" the voice list as early as possible, and refreshing it
 * once the browser reports it is ready, means the list is very likely
 * populated by the time a student actually taps the listen button.
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoiceCache(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoiceCache();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoiceCache);
}

/**
 * Known clear voices ranked best-first for young learners. Cloud/neural
 * voices (Google, Microsoft "Online Natural", Apple premium voices) sound
 * dramatically better than legacy compact voices, so name-matching beats
 * plain language matching. Entries are substring matches on voice.name.
 */
const PREFERRED_VOICE_NAMES: readonly string[] = [
  'Google US English',          // Android/Chrome - neural, very clear
  'Microsoft Aria Online',      // Edge - neural "Natural" family
  'Microsoft Jenny Online',
  'Microsoft Ana Online',
  'Microsoft Zira',             // Windows desktop
  'Samantha',                   // iOS/macOS - clear US female
  'Allison',                    // iOS/macOS enhanced
  'Ava',
  'Zoe',
  'Karen',                      // en-AU fallback, still clear
  'Moira',                      // en-IE
];

/**
 * Picks the best installed voice for English content: prefer a known
 * high-quality voice from PREFERRED_VOICE_NAMES (en-* only), then any
 * "en-US" match, then any other "en" voice. Returns null (letting the
 * browser fall back to its own default) if no English voice is installed
 * at all - some Android devices only ship the system's own display
 * language's TTS voice, in which case no client-side fix can make English
 * speech possible; this is a device configuration gap (Android Settings >
 * Accessibility > Text-to-speech output), not a bug in this app's code.
 */
function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0) refreshVoiceCache();
  const english = cachedVoices.filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  for (const name of PREFERRED_VOICE_NAMES) {
    const hit = english.find((voice) => voice.name?.includes(name));
    if (hit) return hit;
  }
  const exact = english.find((voice) => voice.lang?.toLowerCase() === 'en-us');
  return exact ?? english[0] ?? null;
}

/**
 * Reported back to the caller so a UI can surface a real signal instead of
 * silently doing nothing when audio playback fails - this app has no way to
 * confirm sound actually reached the student's ears, but it can at least
 * tell 'unsupported' (no Web Speech API at all) apart from 'error' (the API
 * exists but rejected this attempt) apart from 'started' (the browser
 * accepted the utterance and began speaking, the best confirmation
 * available client-side).
 */
export type SpeechPlaybackStatus = 'unsupported' | 'error' | 'started';

/**
 * CR-19: every text the app can speak is pre-rendered to an mp3 with a
 * neural voice and hosted on Supabase Storage (public bucket `ea-audio`),
 * named by sha1(text). Playing the file gives the SAME studio-quality
 * voice on every device - devices with no English TTS voice at all
 * (field-verified on a Redmi K90 where Chrome reports speaking=true but
 * stays silent) get working audio for the first time.
 * If the file is missing/fails to load, we fall through to the Web
 * Speech API so the feature still works.
 */
let activeAudio: HTMLAudioElement | null = null;

function audioUrlFor(text: string): Promise<string | null> {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    // MODE==='test' keeps vitest on the TTS-only path - Audio/file
    // playback is covered by its own test with an explicit mock.
    const base = env?.MODE === 'test' ? undefined : env?.VITE_SUPABASE_URL;
    if (!base || typeof crypto === 'undefined' || !crypto.subtle) {
      return Promise.resolve(null);
    }
    return crypto.subtle
      .digest('SHA-1', new TextEncoder().encode(text))
      .then((buf) => {
        const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
        return `${base}/storage/v1/object/public/ea-audio/${hex}.mp3`;
      })
      .catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

/**
 * Attempts file playback first. Resolves true if the file started
 * playing ('started' reported), false if the caller should fall back to
 * speechSynthesis. Reports nothing itself unless the file actually
 * plays, so a missing file does not flash an error before the fallback
 * even gets a chance.
 */
/**
 * Kid-paced speech speeds. The default play is deliberately slower than
 * a normal adult speaking rate - early readers were missing whole words
 * at rate ~0.9. "Nghe chậm" replays at an even gentler speed.
 */
const NORMAL_UTTERANCE_RATE = 0.7;
const NORMAL_FILE_RATE = 0.8;
const SLOW_FACTOR = 0.7;

export type SpeechSpeed = 'normal' | 'slow';

function tryPlayAudioFile(
  text: string,
  onStatus: ((status: SpeechPlaybackStatus) => void) | undefined,
  speed: SpeechSpeed,
): Promise<boolean> {
  return audioUrlFor(text).then((url) => {
    if (!url) return false;
    return new Promise<boolean>((resolve) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.playbackRate = speed === 'slow' ? NORMAL_FILE_RATE * SLOW_FACTOR : NORMAL_FILE_RATE;
      const giveUp = () => {
        if (activeAudio === audio) activeAudio = null;
        resolve(false);
      };
      audio.addEventListener('playing', () => {
        activeAudio = audio;
        onStatus?.('started');
        resolve(true);
      });
      audio.addEventListener('ended', () => {
        if (activeAudio === audio) activeAudio = null;
      });
      audio.addEventListener('error', giveUp);
      audio.play().catch(giveUp);
    });
  });
}

/**
 * Shared core for speech synthesis calls. Never throws even if the browser
 * has no speech synthesis support or zero installed voices - a failure to
 * speak must never block the student from typing an answer. `onStatus` is
 * optional and best-effort; every caller must keep working with no status
 * feedback at all.
 */
function synthesize(
  text: string,
  onStatus?: (status: SpeechPlaybackStatus) => void,
  speed: SpeechSpeed = 'normal',
  isRetry = false,
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onStatus?.('unsupported');
    return;
  }

  try {
    const synth = window.speechSynthesis;

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    // Kid-paced rate (field feedback: the previous ~0.9 read words too
    // fast for early readers to catch); pitch nudged up a touch reads
    // friendlier for kids without sounding cartoonish.
    utterance.rate = speed === 'slow' ? NORMAL_UTTERANCE_RATE * SLOW_FACTOR : NORMAL_UTTERANCE_RATE;
    utterance.pitch = 1.05;
    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;
    activeUtterance = utterance;

    // Watchdog + single auto-retry: Android Chrome is notorious for
    // swallowing the FIRST utterance after page load (its TTS engine
    // lazily spins up and the speak() call is silently dropped or the
    // synthesis queue is left in a stuck "paused" state). Rather than
    // immediately telling the student audio failed, we retry once after
    // a beat - the retry almost always lands because the engine is warm
    // by then. Only if the second attempt also never starts do we report
    // 'error' so the UI can show the fallback hint.
    let statusSent = false;
    const sendStatus = (status: SpeechPlaybackStatus) => {
      if (statusSent) return;
      statusSent = true;
      onStatus?.(status);
    };
    const retry = () => {
      if (isRetry) {
        sendStatus('error');
        return;
      }
      setTimeout(() => synthesize(text, onStatus, speed, true), 120);
    };
    utterance.onstart = () => sendStatus('started');
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };
    utterance.onerror = (event) => {
      if (activeUtterance === utterance) activeUtterance = null;
      // 'canceled'/'interrupted' are the expected results of our own
      // cancel(), not failures - reporting them would flash a bogus
      // error at the student. 'not-allowed' means a real rejection.
      const reason = event?.error;
      if (reason === 'canceled' || reason === 'interrupted') return;
      retry();
    };
    setTimeout(() => {
      if (
        activeUtterance === utterance &&
        !synth.speaking &&
        !synth.pending
      ) {
        activeUtterance = null;
        retry();
      }
    }, 2500);

    // Chrome Android can leave the synthesis queue paused after a prior
    // cancel/long pause - resume() before speak() is a no-op when the
    // queue is already running and unsticks it when it is not.
    synth.resume();

    // iOS Safari drops a speak() issued in the same event tick as cancel(),
    // so only cancel when something is actually playing/queued/paused, and
    // let the cancel settle for one tick before speaking. When the queue is
    // already clean (the common first-tap path) speak() runs synchronously
    // inside the user's tap gesture.
    if (synth.speaking || synth.pending || synth.paused) {
      synth.cancel();
      synth.resume();
      setTimeout(() => {
        try {
          synth.speak(utterance);
        } catch {
          retry();
        }
      }, 60);
    } else {
      synth.speak(utterance);
    }
  } catch {
    // Speech synthesis is a nice-to-have for this feature; swallow and
    // continue silently (see the function doc comment above), but still
    // report the failure for a caller that wants to show something.
    onStatus?.('error');
  }
}

/**
 * Speaks `text`: pre-recorded mp3 first (uniform neural voice on every
 * device), Web Speech API as the fallback path. Inside the user's tap
 * gesture the audio element starts loading immediately - the crypto
 * hash lookup adds only a microtask hop, well inside the transient
 * activation window Chrome grants media playback.
 */
function speak(
  text: string,
  onStatus?: (status: SpeechPlaybackStatus) => void,
  speed: SpeechSpeed = 'normal',
): void {
  // Stop any file playback from a previous tap before starting anew.
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  void tryPlayAudioFile(text, onStatus, speed).then((played) => {
    if (!played) synthesize(text, onStatus, speed);
  });
}

/**
 * Thin wrapper around the browser-native Web Speech API. Speaks a single
 * English word aloud so a 7-year-old can practice listening (see
 * mvp-decisions.md "v2 Correction" - Audio source).
 */
export function speakWord(
  word: string,
  onStatus?: (status: SpeechPlaybackStatus) => void,
  speed: SpeechSpeed = 'normal',
): void {
  speak(word, onStatus, speed);
}

/**
 * Speaks a full English sentence aloud (Round 2 - Listening Sentence
 * Fill-Blank, plan.md v5). Same underlying call as speakWord, just a
 * longer utterance - kept as a distinct named export so callers make their
 * intent explicit (a whole sentence vs. a bare word).
 */
export function speakSentence(
  sentence: string,
  onStatus?: (status: SpeechPlaybackStatus) => void,
  speed: SpeechSpeed = 'normal',
): void {
  speak(sentence, onStatus, speed);
}
