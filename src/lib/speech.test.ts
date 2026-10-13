import { afterEach, describe, expect, it, vi } from 'vitest';
import { setMicRecording, speakInstruction, speakSentence, speakWord } from './speech';

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

/* kids-UX dev-review #7: vi-VN instruction path contract - 'not-allowed'
   maps to 'blocked', a never-starting utterance hits the 1500ms deadline,
   and the returned cancel handle silences late callbacks. */
describe('speakInstruction - vi-VN status contract', () => {
  const viVoice = { lang: 'vi-VN', name: 'Google tiếng Việt' } as SpeechSynthesisVoice;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // engine-state props injected by the wedged-engine test
    delete (window.speechSynthesis as unknown as Record<string, unknown>).pending;
    delete (window.speechSynthesis as unknown as Record<string, unknown>).speaking;
  });

  it('reports "unavailable" when no vi-* voice is installed', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([]);
    const onStatus = vi.fn();
    const cancel = speakInstruction('Chào em', { onStatus });
    expect(onStatus).toHaveBeenCalledWith('unavailable');
    cancel();
  });

  it('maps utterance onerror "not-allowed" to blocked (not error)', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([viVoice]);
    const speakSpy = vi
      .spyOn(window.speechSynthesis, 'speak')
      .mockImplementation((u: SpeechSynthesisUtterance) => {
        u.onerror?.({ error: 'not-allowed' } as SpeechSynthesisErrorEvent);
      });
    const onStatus = vi.fn();
    speakInstruction('Bấm nút Chơi nhé', { onStatus });
    expect(speakSpy).toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith('blocked');
    expect(onStatus).not.toHaveBeenCalledWith('error');
  });

  it('emits "blocked" at the deadline when onstart never fires (wedged engine included)', () => {
    vi.useFakeTimers();
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([viVoice]);
    const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel').mockImplementation(() => {});
    // Engine wedges: claims it is pending/speaking yet never starts ours.
    Object.defineProperty(window.speechSynthesis, 'pending', { value: true, configurable: true });
    Object.defineProperty(window.speechSynthesis, 'speaking', { value: true, configurable: true });
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {}); // never fires events

    const onStatus = vi.fn();
    speakInstruction('Nghe này', { onStatus });
    // the deferred speak attempt (cancel+60ms reschedule path)
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(1600);
    expect(onStatus).toHaveBeenCalledWith('blocked');
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('dev-review r2 #2: a late onstart after the blocked deadline can never flip to playing', () => {
    vi.useFakeTimers();
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([viVoice]);
    const utterances: SpeechSynthesisUtterance[] = [];
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: SpeechSynthesisUtterance) => {
      utterances.push(u);
    });
    const onStatus = vi.fn();
    speakInstruction('Nghe này', { onStatus });
    vi.advanceTimersByTime(1600); // deadline fires -> 'blocked'
    expect(onStatus).toHaveBeenCalledWith('blocked');
    // The engine wakes up late - handlers were detached at the deadline.
    const u = utterances[0]!;
    expect(u.onstart).toBeNull();
    u.onstart?.({} as unknown as SpeechSynthesisEvent);
    expect(onStatus).not.toHaveBeenCalledWith('playing');
  });

  it('external-review r1 #2: autoplay yields to in-flight content audio (no cancel of English TTS)', async () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([viVoice]);
    const speakSpy = vi
      .spyOn(window.speechSynthesis, 'speak')
      .mockImplementation(() => {});
    const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel').mockImplementation(() => {});

    // English content TTS is mid-flight when the instruction autoplay lands.
    speakWord('rabbit');
    await flush();
    expect(speakSpy).toHaveBeenCalledTimes(1);
    Object.defineProperty(window.speechSynthesis, 'speaking', {
      value: true,
      configurable: true,
    });

    const onStatus = vi.fn();
    speakInstruction('Bấm nút Chơi nhé', { onStatus, autoplay: true });

    // Dropped quietly - never cancels the English utterance, never speaks.
    expect(onStatus).toHaveBeenCalledWith('ended');
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('external-review r1 #2: a deliberate tap still preempts content audio', async () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([viVoice]);
    const speakSpy = vi
      .spyOn(window.speechSynthesis, 'speak')
      .mockImplementation(() => {});
    speakWord('rabbit');
    await flush();
    Object.defineProperty(window.speechSynthesis, 'speaking', {
      value: true,
      configurable: true,
    });

    const onStatus = vi.fn();
    speakInstruction('Bấm nút Chơi nhé', { onStatus }); // autoplay omitted = tap
    // speaking -> cancel + 60ms deferred speak
    await new Promise((r) => setTimeout(r, 120));
    expect(speakSpy).toHaveBeenCalledTimes(2);
    expect(onStatus).not.toHaveBeenCalledWith('ended');
  });

  it('the returned cancel handle silences the utterance - no late status after cancel', () => {
    vi.useFakeTimers();
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([viVoice]);
    const utterances: SpeechSynthesisUtterance[] = [];
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: SpeechSynthesisUtterance) => {
      utterances.push(u);
    });

    const onStatus = vi.fn();
    const cancel = speakInstruction('Nghe này', { onStatus });
    expect(utterances.length).toBe(1);
    cancel();
    // handlers detached - a late engine event cannot flip the status
    expect(utterances[0]!.onstart).toBeNull();
    expect(utterances[0]!.onerror).toBeNull();
    vi.advanceTimersByTime(3000);
    expect(onStatus).not.toHaveBeenCalled();
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

describe('setMicRecording (pronunciation speaker-bleed fix)', () => {
  const viVoice = { lang: 'vi-VN', name: 'Google tiếng Việt' } as SpeechSynthesisVoice;

  afterEach(() => {
    setMicRecording(false);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('blocks content speech while the flag is held - speak() is a no-op', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    setMicRecording(true);

    speakWord('pepper');
    await flush();

    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('blocks instruction speech started mid-recording - reports ended so the speaker settles', () => {
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([viVoice]);
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    setMicRecording(true);
    const onStatus = vi.fn();

    const cancel = speakInstruction('Đọc to từ này lên nhé', { onStatus });

    expect(onStatus).toHaveBeenCalledWith('ended');
    expect(speakSpy).not.toHaveBeenCalled();
    cancel();
  });

  it('cancels queued/playing TTS so already-sounding audio cannot bleed into the mic', () => {
    const cancelSpy = vi.spyOn(window.speechSynthesis, 'cancel').mockImplementation(() => {});

    setMicRecording(true);

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('drops speech whose async lookup resolved after the mic opened (pre-recording tap in flight)', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});

    // Tap "Nghe" and immediately tap record before the audio lookup
    // resolves - the request was never in pendingAudioRequests when
    // stopAllAudio ran, so only the async-boundary recheck can stop it.
    speakWord('chocolate');
    setMicRecording(true);
    await flush();

    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('drops a queued instruction whose cancel-settle timer fires after the mic opened', () => {
    vi.useFakeTimers();
    vi.spyOn(window.speechSynthesis, 'getVoices').mockReturnValue([viVoice]);
    Object.defineProperty(window.speechSynthesis, 'speaking', { value: true, configurable: true });
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    const onStatus = vi.fn();

    // Engine claims it is busy - the instruction is queued on the 60ms
    // cancel-settle timer, not yet spoken, when the record tap lands.
    speakInstruction('Đọc to từ này lên nhé', { onStatus });
    setMicRecording(true);
    vi.advanceTimersByTime(120);

    expect(speakSpy).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith('ended');
    delete (window.speechSynthesis as unknown as Record<string, unknown>).speaking;
  });

  it('does not retry a suppressed utterance after release - the watchdog is invalidated', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window.speechSynthesis, 'speaking', { value: true, configurable: true });
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});

    speakWord('chocolate');
    await Promise.resolve();          // test-mode lookup resolves -> synthesize queues the 60ms timer
    await Promise.resolve();
    setMicRecording(true);            // mic opens inside the cancel-settle window
    vi.advanceTimersByTime(120);      // delayed speak is suppressed
    setMicRecording(false);           // recording ends
    delete (window.speechSynthesis as unknown as Record<string, unknown>).speaking;
    vi.advanceTimersByTime(5000);     // past the 2500ms watchdog + 120ms retry

    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('permanently retires pre-recording speech even when its timer fires after the flag released', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window.speechSynthesis, 'speaking', { value: true, configurable: true });
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});

    speakWord('chocolate');
    await Promise.resolve();          // synthesize queues the 60ms cancel-settle timer
    await Promise.resolve();
    setMicRecording(true);
    setMicRecording(false);           // mic opens AND closes before the timer fires
    vi.advanceTimersByTime(5000);     // timer + watchdog + retry windows all pass

    expect(speakSpy).not.toHaveBeenCalled();
    delete (window.speechSynthesis as unknown as Record<string, unknown>).speaking;
  });

  it('settles an already-playing en-US instruction to ended when suppression cancels it', async () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    vi.spyOn(window.speechSynthesis, 'speak').mockImplementation((u: SpeechSynthesisUtterance) => {
      utterances.push(u);
      u.onstart?.({} as SpeechSynthesisEvent);
    });
    const onStatus = vi.fn();

    speakInstruction('Read it out loud', { lang: 'en-US', onStatus });
    await Promise.resolve();
    await Promise.resolve();
    expect(onStatus).toHaveBeenCalledWith('playing');

    // Mic opens -> stopAllAudio cancels the engine -> 'canceled' onerror.
    setMicRecording(true);
    utterances[0]?.onerror?.({ error: 'canceled' } as SpeechSynthesisErrorEvent);

    expect(onStatus).toHaveBeenCalledWith('ended');
  });

  it('releases normal playback when the flag clears', async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, 'speak').mockImplementation(() => {});
    setMicRecording(true);
    setMicRecording(false);

    speakWord('pepper');
    await flush();

    expect(speakSpy).toHaveBeenCalledTimes(1);
  });
});
