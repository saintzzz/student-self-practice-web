import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakSentence, speakWord } from './speech';

/** speak() now resolves the audio-file lookup on the microtask queue
 * before falling back to speechSynthesis (MODE==='test' skips file
 * playback entirely) - tests must let that queue drain before asserting. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('speakWord', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls window.speechSynthesis.speak with an utterance for the given word in en-US', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});

    speakWord('rabbit');
    await flush();

    expect(speakSpy).toHaveBeenCalledTimes(1);
    const utterance = speakSpy.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('rabbit');
    expect(utterance.lang).toBe('en-US');
  });

  it('does not throw when speechSynthesis.speak itself throws', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {
      throw new Error('no voices installed');
    });

    speakWord('cat');
    await flush();

    expect(true).toBe(true);
  });

  it('reports "error" via onStatus when speechSynthesis.speak throws (plan.md hotfix, 2026-09-08)', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {
      throw new Error('no voices installed');
    });
    const onStatus = vi.fn();

    speakWord('cat', onStatus);
    await flush();

    expect(onStatus).toHaveBeenCalledWith('error');
  });

  it('reports "error" via onStatus when the utterance fires onerror and the retry also fails', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((utterance: SpeechSynthesisUtterance) => {
      utterance.onerror?.({ error: 'audio-busy' } as SpeechSynthesisErrorEvent);
    });
    const onStatus = vi.fn();

    speakWord('cat', onStatus);
    await flush();
    // 120ms retry delay - let it elapse, then the retried utterance's
    // synchronous onerror reports the final failure.
    await new Promise((r) => setTimeout(r, 200));

    expect(onStatus).toHaveBeenCalledWith('error');
  });

  it('does not report an error when the utterance is canceled/interrupted by our own cancel()', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((utterance: SpeechSynthesisUtterance) => {
      utterance.onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent);
    });
    const onStatus = vi.fn();

    speakWord('cat', onStatus);
    await flush();

    expect(onStatus).not.toHaveBeenCalledWith('error');
  });

  it('reports "started" via onStatus when the utterance fires onstart', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((utterance: SpeechSynthesisUtterance) => {
      utterance.onstart?.({} as unknown as SpeechSynthesisEvent);
    });
    const onStatus = vi.fn();

    speakWord('cat', onStatus);
    await flush();

    expect(onStatus).toHaveBeenCalledWith('started');
  });

  it('reports "unsupported" via onStatus when window.speechSynthesis does not exist', async () => {
    const original = window.speechSynthesis;
    // @ts-expect-error deliberately removing a browser API for this test
    delete window.speechSynthesis;
    const onStatus = vi.fn();

    speakWord('cat', onStatus);
    await flush();

    expect(onStatus).toHaveBeenCalledWith('unsupported');
    window.speechSynthesis = original;
  });
});

describe('speakSentence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls window.speechSynthesis.speak with an utterance for the full sentence in en-US', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});

    speakSentence('I have a cat.');
    await flush();

    expect(speakSpy).toHaveBeenCalledTimes(1);
    const utterance = speakSpy.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('I have a cat.');
    expect(utterance.lang).toBe('en-US');
  });

  it('does not throw when speechSynthesis.speak itself throws', async () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {
      throw new Error('no voices installed');
    });

    speakSentence('I can see a dog.');
    await flush();

    expect(true).toBe(true);
  });
});
