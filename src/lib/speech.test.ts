import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakWord } from './speech';

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
});
