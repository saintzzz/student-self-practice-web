/**
 * CR-20: short answer-verdict sound effects, self-hosted in
 * public/sfx/. Fire-and-forget - a blocked or missing file must never
 * surface an error to the student.
 */
export type SfxName = 'correct' | 'wrong';

let active: HTMLAudioElement | null = null;

export function playSfx(name: SfxName): void {
  try {
    if (typeof Audio === 'undefined') return;
    if (active) {
      active.pause();
      active = null;
    }
    const audio = new Audio(`${import.meta.env.BASE_URL}sfx/${name}.mp3`);
    audio.volume = 0.6;
    active = audio;
    void audio.play().catch(() => {
      if (active === audio) active = null;
    });
    audio.addEventListener('ended', () => {
      if (active === audio) active = null;
    });
  } catch {
    // sfx is decorative - never let it break a question flow
  }
}
