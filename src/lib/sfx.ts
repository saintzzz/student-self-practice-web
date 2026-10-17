import { isAudioPlaying } from './speech';

/**
 * CR-20: short answer-verdict sound effects, self-hosted in
 * public/sfx/. Fire-and-forget - a blocked or missing file must never
 * surface an error to the student.
 *
 * CR-69: reuse one element per effect - `new Audio()` per verdict made
 * every ding pay a fresh fetch/decode; rewinding the cached element is
 * instant and keeps the same single-sound-at-a-time behavior.
 *
 * CR-82 (spec s16.3): three tiers.
 *  - verdict (`correct` 0.6, `wrong` 0.6, gentle-wrong 0.35): always
 *    wins - interrupts whatever is playing, including a queued or
 *    started reward.
 *  - reward (`streak`, `star` 0.5): queued AFTER the verdict - starts
 *    250ms after the call and never overlaps a still-playing verdict.
 *  - ui (`tap`, `pop`, `flip` 0.25): dropped (never queued) while any
 *    verdict/reward sfx or any speech.ts audio is playing.
 * Exam mode stays silent - ExamScreen gates its own calls.
 */
export type SfxName = 'correct' | 'wrong' | 'tap' | 'pop' | 'flip' | 'streak' | 'star';

type Tier = 'verdict' | 'reward' | 'ui';

const TIER: Record<SfxName, Tier> = {
  correct: 'verdict',
  wrong: 'verdict',
  streak: 'reward',
  star: 'reward',
  tap: 'ui',
  pop: 'ui',
  flip: 'ui',
};

const VOLUME: Record<SfxName, number> = {
  correct: 0.6,
  wrong: 0.6,
  streak: 0.5,
  star: 0.5,
  tap: 0.25,
  pop: 0.25,
  flip: 0.25,
};

/** Reward tier: how long after the call a queued reward may start. */
export const REWARD_DELAY_MS = 250;

const elements = new Map<string, HTMLAudioElement>();
let active: { audio: HTMLAudioElement; tier: Tier } | null = null;
let rewardTimer: ReturnType<typeof setTimeout> | null = null;

function elementFor(key: string, file: SfxName, volume: number): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  let audio = elements.get(key);
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}sfx/${file}.mp3`);
    audio.volume = volume;
    audio.addEventListener('ended', () => {
      if (active?.audio === audio) active = null;
    });
    elements.set(key, audio);
  }
  return audio;
}

function clearRewardTimer(): void {
  if (rewardTimer !== null) {
    clearTimeout(rewardTimer);
    rewardTimer = null;
  }
}

/** Starts `key` now - interrupts whatever is currently active. */
function playNow(key: string, file: SfxName, volume: number, tier: Tier): void {
  try {
    if (active) {
      active.audio.pause();
      active = null;
    }
    const audio = elementFor(key, file, volume);
    if (!audio) return;
    audio.currentTime = 0;
    active = { audio, tier };
    void audio.play().catch(() => {
      if (active?.audio === audio) active = null;
    });
  } catch {
    // sfx is decorative - never let it break a question flow
  }
}

/**
 * Reward sounds queue behind the verdict instead of overlapping it.
 * At fire time a still-playing verdict pushes the start another 250ms
 * (a new verdict effectively re-queues the reward after itself); a
 * non-verdict leftover is simply replaced.
 */
function queueReward(name: SfxName): void {
  const tryPlay = () => {
    rewardTimer = null;
    if (active?.tier === 'verdict') {
      rewardTimer = setTimeout(tryPlay, REWARD_DELAY_MS);
      return;
    }
    playNow(name, name, VOLUME[name], 'reward');
  };
  if (active?.tier === 'verdict') {
    clearRewardTimer();
    rewardTimer = setTimeout(tryPlay, REWARD_DELAY_MS);
    return;
  }
  playNow(name, name, VOLUME[name], 'reward');
}

export function playSfx(name: SfxName): void {
  try {
    const tier = TIER[name];
    if (tier === 'ui') {
      /* Dropped (not queued) while a verdict/reward or any speech.ts
         audio is playing (spec s16.3). */
      if (active || isAudioPlaying()) return;
      playNow(name, name, VOLUME[name], 'ui');
      return;
    }
    if (tier === 'reward') {
      queueReward(name);
      return;
    }
    /* verdict - always wins. */
    clearRewardTimer();
    playNow(name, name, VOLUME[name], 'verdict');
  } catch {
    // never surface
  }
}

/**
 * kids-UX (impl step 8, design s3.4): the gentle wrong-answer cue. Reuses
 * the existing soft two-tone `wrong.mp3` (Ruling R-28 keeps the file - it
 * is already non-buzzer) but at a muted 0.35 gain so a missed answer reads
 * as a neutral "uh-oh" nudge, not a punishment blast. A separate cache key
 * keeps this element's volume independent from the still-supported
 * full-gain `playSfx('wrong')` used on non-kid surfaces. Verdict tier.
 */
export function playGentleWrong(): void {
  try {
    clearRewardTimer();
    playNow('gentle-wrong', 'wrong', 0.35, 'verdict');
  } catch {
    // never surface
  }
}

/**
 * Pronunciation-recording support (speaker-bleed fix): a still-ringing
 * verdict ding from the previous question would land inside the take.
 * speech.stopAllAudio cannot reach sfx - they are separate elements - so
 * the mic-open path calls this too. Also cancels a queued reward.
 */
export function stopSfx(): void {
  try {
    clearRewardTimer();
    if (active) {
      active.audio.pause();
      active = null;
    }
  } catch {
    // best-effort
  }
}
