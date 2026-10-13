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

const elements = new Map<SfxName, HTMLAudioElement>();
let active: HTMLAudioElement | null = null;

export function playSfx(name: SfxName): void {
  try {
    if (typeof Audio === 'undefined') return;
    if (active) {
      active.pause();
      active = null;
    }
    let audio = elements.get(name);
    if (!audio) {
      audio = new Audio(`${import.meta.env.BASE_URL}sfx/${name}.mp3`);
      audio.volume = 0.6;
      audio.addEventListener('ended', () => {
        if (active === audio) active = null;
      });
      elements.set(name, audio);
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
