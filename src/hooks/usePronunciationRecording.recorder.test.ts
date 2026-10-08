import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

// CR-62 recorder-path tests. The MediaRecorder branch can't run in jsdom
// (no MediaRecorder/getUserMedia), so audioRecording is module-mocked and
// we drive its controller directly.
const mocks = vi.hoisted(() => ({
  isIOS: false,
  recorderSupported: true,
  startAudioRecording: vi.fn(),
}));

vi.mock('../lib/audioRecording', () => ({
  isAudioRecordingSupported: () => mocks.recorderSupported,
  isIOSOrIPadOS: () => mocks.isIOS,
  startAudioRecording: (...args: unknown[]) => mocks.startAudioRecording(...args),
}));

const transcribeMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/pronunciationTranscription', () => ({
  transcribePronunciationAudio: (...args: unknown[]) => transcribeMock(...args),
}));

import { usePronunciationRecording } from './usePronunciationRecording';

interface TestWindow {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
}
function testWindow(): TestWindow {
  return window as unknown as TestWindow;
}

function makeController(blob: Blob) {
  return {
    stop: vi.fn().mockResolvedValue(blob),
    cancel: vi.fn(),
  };
}

describe('usePronunciationRecording - recorder path (CR-62)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mocks.isIOS = false;
    mocks.recorderSupported = true;
    mocks.startAudioRecording.mockReset();
    transcribeMock.mockReset();
  });

  it('uses MediaRecorder on iOS even when SpeechRecognition exists', async () => {
    mocks.isIOS = true;
    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));

    const { result } = renderHook(() => usePronunciationRecording(vi.fn(), 'cat'));
    expect(result.current.phase).toBe('idle');

    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));
    expect(mocks.startAudioRecording).toHaveBeenCalledTimes(1);
  });

  it('falls back to recorder when SR reports permission denial', async () => {
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

    const { result } = renderHook(() => usePronunciationRecording(vi.fn(), 'cat'));
    act(() => {
      result.current.startRecording();
    });

    // Not a dead-end permission screen - back to idle on recorder mode.
    await waitFor(() => expect(result.current.phase).toBe('idle'));

    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));
    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));
    expect(mocks.startAudioRecording).toHaveBeenCalledTimes(1);

    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('records, transcribes and submits the transcript', async () => {
    mocks.isIOS = true;
    const controller = makeController(new Blob(['audio'], { type: 'audio/mp4' }));
    mocks.startAudioRecording.mockResolvedValue(controller);
    transcribeMock.mockResolvedValue('cat');

    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt, 'cat'));

    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));

    await act(async () => {
      result.current.stopRecording();
    });

    expect(transcribeMock).toHaveBeenCalledWith(expect.any(Blob), 'cat');
    expect(onAttempt).toHaveBeenCalledWith('cat');
  });

  it('shows retryable error when transcription service fails', async () => {
    mocks.isIOS = true;
    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));
    transcribeMock.mockResolvedValue(null);

    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt, 'cat'));

    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));
    await act(async () => {
      result.current.stopRecording();
    });

    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.errorReason).toBe('transcription');
    expect(onAttempt).not.toHaveBeenCalled();
  });

  it('maps an empty transcript to the no-speech retry path, not a wrong answer', async () => {
    mocks.isIOS = true;
    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));
    transcribeMock.mockResolvedValue('');

    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt, 'cat'));

    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));
    await act(async () => {
      result.current.stopRecording();
    });

    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.errorReason).toBe('no-speech');
    expect(onAttempt).not.toHaveBeenCalled();
  });
});
