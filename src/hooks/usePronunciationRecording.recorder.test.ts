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
  isPronunciationServerConfigured: () => true,
  transcribePronunciationAudio: (...args: unknown[]) => transcribeMock(...args),
  warmPronunciationService: () => {},
}));

// Speaker-bleed fix: the hook owns the mic-suppression flag - verify it
// is raised before the mic opens and released when the phase settles.
const setMicRecordingMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/speech', () => ({
  setMicRecording: (...args: unknown[]) => setMicRecordingMock(...args),
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
  // `done` resolves only when stop() is called - mirrors the real
  // controller where done settles on manual stop, VAD, or the cap.
  let resolveDone!: (b: Blob) => void;
  const done = new Promise<Blob>((r) => {
    resolveDone = r;
  });
  return {
    done,
    stop: vi.fn().mockImplementation(() => {
      resolveDone(blob);
      return done;
    }),
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
    setMicRecordingMock.mockReset();
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

  it('auto-launches the recorder when SR reports permission denial - no second tap needed', async () => {
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
    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));
    transcribeMock.mockResolvedValue({ transcript: 'cat' });

    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt, 'cat'));
    act(() => {
      result.current.startRecording();
    });

    // One tap: SR denied -> recorder took over and is already recording.
    await waitFor(() => expect(mocks.startAudioRecording).toHaveBeenCalledTimes(1));
    expect(result.current.phase).toBe('recording');
    expect(result.current.phase).not.toBe('permission-denied');

    await act(async () => {
      result.current.stopRecording();
    });
    expect(onAttempt).toHaveBeenCalledWith('cat', undefined);

    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('records, transcribes and submits the transcript', async () => {
    mocks.isIOS = true;
    const controller = makeController(new Blob(['audio'], { type: 'audio/mp4' }));
    mocks.startAudioRecording.mockResolvedValue(controller);
    transcribeMock.mockResolvedValue({ transcript: 'cat' });

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
    expect(onAttempt).toHaveBeenCalledWith('cat', undefined);
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
    transcribeMock.mockResolvedValue({ transcript: '' });

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

  it('silences app audio BEFORE the mic opens and releases it only after settling', async () => {
    mocks.isIOS = true;
    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));
    transcribeMock.mockResolvedValue({ transcript: 'cat' });

    const { result } = renderHook(() => usePronunciationRecording(vi.fn(), 'cat'));
    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));

    // Suppression must precede microphone acquisition, not follow it.
    const suppressOrder = setMicRecordingMock.mock.invocationCallOrder[
      setMicRecordingMock.mock.calls.findIndex((c) => c[0] === true)
    ];
    const micOrder = mocks.startAudioRecording.mock.invocationCallOrder[0];
    expect(suppressOrder).toBeDefined();
    expect(suppressOrder).toBeLessThan(micOrder!);

    // Baseline: the mount-time idle release must not mask the real one.
    setMicRecordingMock.mockClear();
    await act(async () => {
      result.current.stopRecording();
    });
    await waitFor(() => expect(setMicRecordingMock).toHaveBeenCalledWith(false));
  });

  it('r60: an ambiguous assess verdict (grey band + target-sounding alt) buys a retry, not a submission', async () => {
    mocks.isIOS = true;
    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));
    // Provider heard "pen" at 60 for target "hen" and offered "hen" as
    // another reading - too ambiguous to pass OR fail.
    transcribeMock.mockResolvedValue({ transcript: 'pen', score: 60, alternatives: ['hen'] });

    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt, 'hen'));

    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));
    await act(async () => {
      result.current.stopRecording();
    });

    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.errorReason).toBe('ambiguous');
    expect(onAttempt).not.toHaveBeenCalled();
  });

  it('r60: a grey-band verdict WITHOUT a matching alternative still submits', async () => {
    mocks.isIOS = true;
    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));
    transcribeMock.mockResolvedValue({ transcript: 'pen', score: 60, alternatives: ['pin'] });

    const onAttempt = vi.fn();
    const { result } = renderHook(() => usePronunciationRecording(onAttempt, 'hen'));

    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));
    await act(async () => {
      result.current.stopRecording();
    });

    expect(onAttempt).toHaveBeenCalledWith('pen', { serverScore: 60, alternatives: ['pin'] });
  });

  it('releases the suppression flag when the hook unmounts mid-recording', async () => {
    mocks.isIOS = true;
    mocks.startAudioRecording.mockResolvedValue(makeController(new Blob(['a'])));

    const { result, unmount } = renderHook(() => usePronunciationRecording(vi.fn(), 'cat'));
    act(() => {
      result.current.startRecording();
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));
    setMicRecordingMock.mockClear();

    unmount();

    expect(setMicRecordingMock).toHaveBeenCalledWith(false);
  });
});
