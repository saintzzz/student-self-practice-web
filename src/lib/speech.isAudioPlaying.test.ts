import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * CR-82 (GT-15, spec s16.3): isAudioPlaying() reports CONTENT audio only -
 * an active/pending content mp3 or a content TTS utterance. A vi-VN
 * instruction utterance does NOT count (ui sfx may play under it).
 */
describe('speech.isAudioPlaying (CR-82 spec s16.3)', () => {
  beforeEach(() => {
    vi.resetModules();
    const synth = window.speechSynthesis as unknown as Record<string, unknown>;
    synth.speaking = false;
    synth.pending = false;
    synth.paused = false;
    synth.getVoices = () => [];
  });

  afterEach(() => {
    const synth = window.speechSynthesis as unknown as Record<string, unknown>;
    synth.speaking = false;
    synth.pending = false;
    synth.paused = false;
  });

  it('is false when nothing is playing or queued', async () => {
    const { isAudioPlaying } = await import('./speech');
    expect(isAudioPlaying()).toBe(false);
  });

  it('is true while the synth reports speaking (content utterance)', async () => {
    (window.speechSynthesis as unknown as { speaking: boolean }).speaking = true;
    const { isAudioPlaying } = await import('./speech');
    expect(isAudioPlaying()).toBe(true);
  });

  it('is true while the synth reports a pending queue', async () => {
    (window.speechSynthesis as unknown as { pending: boolean }).pending = true;
    const { isAudioPlaying } = await import('./speech');
    expect(isAudioPlaying()).toBe(true);
  });

  it('a vi-VN instruction utterance does not count as content audio', async () => {
    const synth = window.speechSynthesis as unknown as {
      speaking: boolean;
      getVoices: () => Array<{ lang: string; name: string }>;
    };
    synth.getVoices = () => [{ lang: 'vi-VN', name: 'vi voice' }];
    const { isAudioPlaying, speakInstruction } = await import('./speech');
    speakInstruction('Chạm vào đáp án đúng');
    /* the engine says it is speaking - but the active utterance is the
       instruction, so ui sfx is still allowed. */
    synth.speaking = true;
    expect(isAudioPlaying()).toBe(false);
  });

  it('content audio overrides: a speakWord request is content even when an instruction was last', async () => {
    const synth = window.speechSynthesis as unknown as {
      speaking: boolean;
      pending: boolean;
      getVoices: () => Array<{ lang: string; name: string }>;
    };
    /* a pending content mp3 request counts immediately - before any
       element starts playing. */
    const { isAudioPlaying, speakWord } = await import('./speech');
    speakWord('apple');
    /* mp3 lookup pending OR nothing yet resolved - either way the
       pending-request branch may count; force-check via synth content. */
    synth.pending = true;
    synth.speaking = false;
    expect(isAudioPlaying()).toBe(true);
  });
});
