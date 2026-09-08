import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakSentence, speakWord } from './speech';

describe('speakWord', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls window.speechSynthesis.speak with an utterance for the given word in en-US', () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});

    speakWord('rabbit');

    expect(speakSpy).toHaveBeenCalledTimes(1);
    const utterance = speakSpy.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('rabbit');
    expect(utterance.lang).toBe('en-US');
  });

  it('does not throw when speechSynthesis.speak itself throws', () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {
      throw new Error('no voices installed');
    });

    expect(() => speakWord('cat')).not.toThrow();
  });

  it('reports "error" via onStatus when speechSynthesis.speak throws (plan.md hotfix, 2026-09-08)', () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {
      throw new Error('no voices installed');
    });
    const onStatus = vi.fn();

    speakWord('cat', onStatus);

    expect(onStatus).toHaveBeenCalledWith('error');
  });

  it('reports "error" via onStatus when the utterance itself later fires onerror', () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((utterance: SpeechSynthesisUtterance) => {
      utterance.onerror?.({} as SpeechSynthesisErrorEvent);
    });
    const onStatus = vi.fn();

    speakWord('cat', onStatus);

    expect(onStatus).toHaveBeenCalledWith('error');
  });

  it('reports "started" via onStatus when the utterance fires onstart', () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((utterance: SpeechSynthesisUtterance) => {
      utterance.onstart?.({} as unknown as SpeechSynthesisEvent);
    });
    const onStatus = vi.fn();

    speakWord('cat', onStatus);

    expect(onStatus).toHaveBeenCalledWith('started');
  });

  it('reports "unsupported" via onStatus when window.speechSynthesis does not exist', () => {
    const original = window.speechSynthesis;
    // @ts-expect-error deliberately removing a browser API for this test
    delete window.speechSynthesis;
    const onStatus = vi.fn();

    speakWord('cat', onStatus);

    expect(onStatus).toHaveBeenCalledWith('unsupported');
    window.speechSynthesis = original;
  });
});

describe('speakSentence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls window.speechSynthesis.speak with an utterance for the full sentence in en-US', () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});

    speakSentence('I have a cat.');

    expect(speakSpy).toHaveBeenCalledTimes(1);
    const utterance = speakSpy.mock.calls[0]?.[0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe('I have a cat.');
    expect(utterance.lang).toBe('en-US');
  });

  it('does not throw when speechSynthesis.speak itself throws', () => {
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {
      throw new Error('no voices installed');
    });

    expect(() => speakSentence('I can see a dog.')).not.toThrow();
  });
});
