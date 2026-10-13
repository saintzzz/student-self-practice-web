/**
 * CR-20: short answer-verdict sound effects, self-hosted in
 * public/sfx/. Fire-and-forget - a blocked or missing file must never
 * surface an error to the student.
 *
 * CR-69: reuse one element per effect - `new Audio()` per verdict made
 * every ding pay a fresh fetch/decode; rewinding the cached element is
 * instant and keeps the same single-sound-at-a-time behavior.
 */
export type SfxName = 'correct' | 'wrong';

const elements = new Map<string, HTMLAudioElement>();
let active: HTMLAudioElement | null = null;

function playElement(key: string, file: SfxName, volume: number): void {
  try {
    if (typeof Audio === 'undefined') return;
    if (active) {
      active.pause();
      active = null;
    }
    let audio = elements.get(key);
    if (!audio) {
      audio = new Audio(`${import.meta.env.BASE_URL}sfx/${file}.mp3`);
      audio.volume = volume;
      audio.addEventListener('ended', () => {
        if (active === audio) active = null;
      });
      elements.set(key, audio);
    }
    audio.currentTime = 0;
    active = audio;
    void audio.play().catch(() => {
      if (active === audio) active = null;
    });
  } catch {
    // sfx is decorative - never let it break a question flow
  }
}

export function playSfx(name: SfxName): void {
  playElement(name, name, 0.6);
}

/**
 * kids-UX (impl step 8, design s3.4): the gentle wrong-answer cue. Reuses
 * the existing soft two-tone `wrong.mp3` (Ruling R-28 keeps the file - it
 * is already non-buzzer) but at a muted 0.35 gain so a missed answer reads
 * as a neutral "uh-oh" nudge, not a punishment blast. A separate cache key
 * keeps this element's volume independent from the still-supported
 * full-gain `playSfx('wrong')` used on non-kid surfaces.
 */
export function playGentleWrong(): void {
  playElement('gentle-wrong', 'wrong', 0.35);
}

/**
 * Pronunciation-recording support (speaker-bleed fix): a still-ringing
 * verdict ding from the previous question would land inside the take.
 * speech.stopAllAudio cannot reach sfx - they are separate elements - so
 * the mic-open path calls this too.
 */
export function stopSfx(): void {
  if (active) {
    try {
      active.pause();
    } catch {
      // best-effort
    }
    active = null;
  }
}
