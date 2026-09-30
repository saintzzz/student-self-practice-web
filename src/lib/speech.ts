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
 * Shared core for speech synthesis calls. Never throws even if the browser
 * has no speech synthesis support or zero installed voices - a failure to
 * speak must never block the student from typing an answer. `onStatus` is
 * optional and best-effort; every caller must keep working with no status
 * feedback at all.
 */
function speak(text: string, onStatus?: (status: SpeechPlaybackStatus) => void): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onStatus?.('unsupported');
    return;
  }

  try {
    // Mobile Safari can get stuck mid-queue after backgrounding/locking, and
    // a leftover queued utterance from a previous tap can otherwise block or
    // delay this one - cancelling first keeps every tap of the play button
    // starting from a clean state. resume() clears the related "stuck
    // paused" state some Android/iOS builds enter after the same kind of
    // interruption.
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    // Slightly slower than default so early readers can catch each word;
    // pitch nudged up a touch reads friendlier for kids without sounding
    // cartoonish.
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;
    activeUtterance = utterance;
    utterance.onstart = () => onStatus?.('started');
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };
    utterance.onerror = () => {
      if (activeUtterance === utterance) activeUtterance = null;
      onStatus?.('error');
    };
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis is a nice-to-have for this feature; swallow and
    // continue silently (see the function doc comment above), but still
    // report the failure for a caller that wants to show something.
    onStatus?.('error');
  }
}

/**
 * Thin wrapper around the browser-native Web Speech API. Speaks a single
 * English word aloud so a 7-year-old can practice listening (see
 * mvp-decisions.md "v2 Correction" - Audio source).
 */
export function speakWord(word: string, onStatus?: (status: SpeechPlaybackStatus) => void): void {
  speak(word, onStatus);
}

/**
 * Speaks a full English sentence aloud (Round 2 - Listening Sentence
 * Fill-Blank, plan.md v5). Same underlying call as speakWord, just a
 * longer utterance - kept as a distinct named export so callers make their
 * intent explicit (a whole sentence vs. a bare word).
 */
export function speakSentence(sentence: string, onStatus?: (status: SpeechPlaybackStatus) => void): void {
  speak(sentence, onStatus);
}
