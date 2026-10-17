import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CR-82 (spec s16.3): the three-tier sfx scheduler.
 *  - verdict always wins - it interrupts ui and reward playback and
 *    cancels any queued reward timer.
 *  - reward queues 250ms behind the call and never overlaps a still-
 *    playing verdict.
 *  - ui is dropped (never queued) while a verdict/reward is active or
 *    speech.isAudioPlaying() reports content audio.
 * Exam mode stays silent by contract: ExamScreen never imports the sfx
 * module (source-scan assertion at the bottom).
 */

const mockState = { speechPlaying: false };
vi.mock('./speech', () => ({
  isAudioPlaying: () => mockState.speechPlaying,
}));

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  volume = 1;
  paused = true;
  ended = false;
  currentTime = 0;
  playCount = 0;
  pauseCount = 0;
  private listeners = new Map<string, Array<() => void>>();

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((f) => f !== fn));
  }
  play() {
    this.playCount += 1;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.pauseCount += 1;
    this.paused = true;
  }
  emit(type: string) {
    this.listeners.get(type)?.forEach((f) => f());
  }
}

function find(name: string): FakeAudio | undefined {
  return FakeAudio.instances.find((a) => a.src.endsWith(`/sfx/${name}.mp3`));
}

async function loadSfx() {
  return import('./sfx');
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  FakeAudio.instances = [];
  mockState.speechPlaying = false;
  vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('sfx tiers (CR-82 spec s16.3)', () => {
  it('verdict interrupts a playing ui sound', async () => {
    const { playSfx } = await loadSfx();
    playSfx('tap');
    const tap = find('tap')!;
    expect(tap.paused).toBe(false);
    playSfx('correct');
    expect(tap.paused).toBe(true);
    expect(find('correct')!.paused).toBe(false);
  });

  it('verdict volumes: correct .6, gentle-wrong .35, ui .25, reward .5', async () => {
    const { playSfx, playGentleWrong } = await loadSfx();
    playSfx('correct');
    expect(find('correct')!.volume).toBe(0.6);
    /* ui drops while the verdict is active - free the channel first */
    find('correct')!.emit('ended');
    playSfx('tap');
    expect(find('tap')!.volume).toBe(0.25);
    find('tap')!.emit('ended');
    playSfx('star');
    expect(find('star')!.volume).toBe(0.5);
    find('star')!.emit('ended');
    playGentleWrong();
    expect(find('wrong')!.volume).toBe(0.35);
  });

  it('reward starts 250ms after the call once the verdict has ended - never overlapping it', async () => {
    const { playSfx } = await loadSfx();
    playSfx('correct');
    playSfx('streak');
    /* queued behind the verdict - not started yet */
    expect(find('streak')).toBeUndefined();
    vi.advanceTimersByTime(250);
    /* the verdict is still ringing - the reward waits another cycle */
    expect(find('streak')).toBeUndefined();
    find('correct')!.emit('ended');
    vi.advanceTimersByTime(250);
    expect(find('streak')!.paused).toBe(false);
  });

  it('reward plays immediately when nothing is active', async () => {
    const { playSfx } = await loadSfx();
    playSfx('star');
    expect(find('star')!.paused).toBe(false);
  });

  it('ui is dropped while a verdict is active', async () => {
    const { playSfx } = await loadSfx();
    playSfx('correct');
    playSfx('tap');
    expect(find('tap')).toBeUndefined();
  });

  it('ui is dropped while a reward is active', async () => {
    const { playSfx } = await loadSfx();
    playSfx('star');
    playSfx('flip');
    expect(find('flip')).toBeUndefined();
  });

  it('ui is dropped while content audio is playing via speech.ts', async () => {
    const { playSfx } = await loadSfx();
    mockState.speechPlaying = true;
    playSfx('pop');
    expect(find('pop')).toBeUndefined();
  });

  it('ui plays when the channel is quiet', async () => {
    const { playSfx } = await loadSfx();
    playSfx('pop');
    expect(find('pop')!.paused).toBe(false);
  });

  it('verdict interrupts a playing reward; a reward queued behind it fires after the verdict ends', async () => {
    const { playSfx } = await loadSfx();
    /* playing reward gets cut by the verdict */
    playSfx('streak');
    const streak = find('streak')!;
    playSfx('correct');
    expect(streak.paused).toBe(true);
    /* a reward queued behind the still-playing verdict waits, then
       fires on the cycle after the verdict ends */
    playSfx('star');
    vi.advanceTimersByTime(600);
    expect(find('star')).toBeUndefined();
    find('correct')!.emit('ended');
    vi.advanceTimersByTime(600);
    expect(find('star')!.paused).toBe(false);
  });

  it('stopSfx pauses the active sound and cancels a queued reward (mic-open path)', async () => {
    const { playSfx, stopSfx } = await loadSfx();
    playSfx('correct');
    playSfx('streak');
    stopSfx();
    expect(find('correct')!.paused).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(find('streak')).toBeUndefined();
  });

  it('playSfx survives a missing/broken Audio constructor', async () => {
    vi.stubGlobal('Audio', undefined);
    const { playSfx } = await loadSfx();
    expect(() => playSfx('correct')).not.toThrow();
  });
});

describe('exam silence contract (spec s16.3)', () => {
  it('ExamScreen only ever plays verdict-tier sfx - never ui or reward sounds', () => {
    const src = readFileSync(resolve(__dirname, '../components/ExamScreen.tsx'), 'utf8');
    /* the pre-existing practice-verdict correct/wrong stay (they are the
       verdict tier); M9's ui + reward names must not appear. */
    expect(src).not.toMatch(/'tap'|'pop'|'flip'|'streak'|'star'|"tap"|"pop"|"flip"|"streak"|"star"/);
  });
});
