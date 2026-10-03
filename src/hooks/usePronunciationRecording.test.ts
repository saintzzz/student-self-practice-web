import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePronunciationRecording } from './usePronunciationRecording';

interface TestWindow {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
}

function testWindow(): TestWindow {
  return window as unknown as TestWindow;
}

describe('usePronunciationRecording', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in the idle phase when SpeechRecognition is supported', () => {
    const { result } = renderHook(() => usePronunciationRecording(vi.fn()));

    expect(result.current.phase).toBe('idle');
  });

  it('starts in the unsupported phase when SpeechRecognition is missing (e.g. Firefox)', () => {
    const original = { ...testWindow() };
    testWindow().SpeechRecognition = undefined;
    testWindow().webkitSpeechRecognition = undefined;

    const { result } = renderHook(() => usePronunciationRecording(vi.fn()));

    expect(result.current.phase).toBe('unsupported');

    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('moves to recording after startRecording, then calls onAttempt with the transcript once transcribed', async () => {
    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt));

    act(() => {
      result.current.startRecording();
    });

    await waitFor(() => expect(result.current.phase).toBe('recording'));
    await waitFor(() => expect(onAttempt).toHaveBeenCalledWith('practice attempt'));
  });

  it('moves to permission-denied when the recognizer reports a not-allowed error', async () => {
    // startRecording no longer pre-flights a separate getUserMedia() call
    // (removed to avoid a double mic-acquisition race on Android Chrome) -
    // permission denial now surfaces solely through SpeechRecognition's own
    // onerror, exercised here the same way speechRecognition.test.ts does.
    class DenyingRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;

      start(): void {
        setTimeout(() => this.onerror?.({ error: 'not-allowed' }), 0);
      }

      stop(): void {}
      abort(): void {}
    }

    const original = { ...testWindow() };
    testWindow().SpeechRecognition = DenyingRecognition;
    testWindow().webkitSpeechRecognition = undefined;

    const { result } = renderHook(() => usePronunciationRecording(vi.fn()));

    act(() => {
      result.current.startRecording();
    });

    await waitFor(() => expect(result.current.phase).toBe('permission-denied'));

    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('moves to retryable error phase on transient failure instead of silently submitting', async () => {
    class FlakyRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;

      start(): void {
        setTimeout(() => this.onerror?.({ error: 'no-speech' }), 0);
      }

      stop(): void {}
      abort(): void {}
    }

    const original = { ...testWindow() };
    testWindow().SpeechRecognition = FlakyRecognition;
    testWindow().webkitSpeechRecognition = undefined;

    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt));

    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(onAttempt).not.toHaveBeenCalled();

    act(() => {
      result.current.retry();
    });
    expect(result.current.phase).toBe('idle');

    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('silently retries a transient no-speech failure before surfacing an error', async () => {
    let attempts = 0;
    class FirstFailRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;

      start(): void {
        attempts += 1;
        if (attempts === 1) {
          setTimeout(() => this.onerror?.({ error: 'no-speech' }), 0);
        } else {
          setTimeout(() => {
            this.onresult?.({
              resultIndex: 0,
              results: {
                length: 1,
                0: { isFinal: true, length: 1, 0: { transcript: 'practice attempt', confidence: 0.9 } },
              },
            });
          }, 0);
        }
      }
      stop(): void {}
      abort(): void {}
    }

    const original = { ...testWindow() };
    testWindow().SpeechRecognition = FirstFailRecognition;
    testWindow().webkitSpeechRecognition = undefined;

    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt));

    act(() => {
      result.current.startRecording();
    });

    // The error never surfaces - the retry lands and the transcript wins.
    await waitFor(() => expect(onAttempt).toHaveBeenCalledWith('practice attempt'));
    expect(result.current.phase).not.toBe('error');
    expect(attempts).toBe(2);

    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('skip calls onAttempt with an empty string exactly once', async () => {
    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt));

    act(() => {
      result.current.skip();
    });
    act(() => {
      result.current.skip();
    });

    expect(onAttempt).toHaveBeenCalledTimes(1);
    expect(onAttempt).toHaveBeenCalledWith('');
  });

  it('ignores a startRecording call after skip already settled the attempt (settledRef guard)', () => {
    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt));

    act(() => {
      result.current.skip();
    });
    act(() => {
      result.current.startRecording();
    });

    // startRecording bails out synchronously once settled - phase never
    // moves to 'recording' and onAttempt is never called a second time.
    expect(result.current.phase).not.toBe('recording');
    expect(onAttempt).toHaveBeenCalledTimes(1);
  });
});
