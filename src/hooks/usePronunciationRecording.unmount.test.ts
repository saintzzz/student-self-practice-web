import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePronunciationRecording } from './usePronunciationRecording';
import { startAudioRecording, type AudioRecordingController } from '../lib/audioRecording';
import { transcribePronunciationAudio } from '../lib/pronunciationTranscription';

vi.mock('../lib/speechRecognition', () => ({
  isSpeechRecognitionSupported: () => false,
  startSpeechRecognition: () => null,
}));
vi.mock('../lib/audioRecording', () => ({
  isAudioRecordingSupported: () => true,
  isIOSOrIPadOS: () => true,
  startAudioRecording: vi.fn(),
}));
vi.mock('../lib/pronunciationTranscription', () => ({
  isPronunciationServerConfigured: () => true,
  transcribePronunciationAudio: vi.fn(async () => ({ transcript: 'apple' })),
}));

const startRec = vi.mocked(startAudioRecording);
const transcribe = vi.mocked(transcribePronunciationAudio);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePronunciationRecording - r7 unmount lifecycle', () => {
  it('a mic permission resolving after unmount cancels the capture and never submits', async () => {
    const deferred: Array<(c: AudioRecordingController) => void> = [];
    const controller = {
      done: new Promise<Blob>(() => {}),
      cancel: vi.fn(),
      stop: vi.fn(async () => new Blob()),
    };
    startRec.mockReturnValue(
      new Promise((res) => {
        deferred.push(res);
      }) as ReturnType<typeof startAudioRecording>,
    );

    const onAttempt = vi.fn();
    const { result, unmount } = renderHook(() => usePronunciationRecording(onAttempt));
    act(() => {
      result.current.startRecording();
    });
    expect(result.current.phase).toBe('recording');

    // Child leaves the question while the permission dialog is open.
    unmount();
    deferred[0]?.(controller as AudioRecordingController);
    await new Promise((r) => setTimeout(r, 10));

    expect(controller.cancel).toHaveBeenCalledTimes(1);
    expect(transcribe).not.toHaveBeenCalled();
    expect(onAttempt).not.toHaveBeenCalled();
  });

  it('VAD auto-stop firing after unmount does not transcribe or submit', async () => {
    const deferred: Array<(b: Blob) => void> = [];
    const controller = {
      done: new Promise<Blob>((res) => {
        deferred.push(res);
      }),
      cancel: vi.fn(),
      stop: vi.fn(async () => new Blob()),
    };
    startRec.mockResolvedValue(controller as never);

    const onAttempt = vi.fn();
    const { result, unmount } = renderHook(() => usePronunciationRecording(onAttempt));
    await act(async () => {
      result.current.startRecording();
      await Promise.resolve();
    });

    unmount();
    deferred[0]?.(new Blob());
    await new Promise((r) => setTimeout(r, 10));

    expect(transcribe).not.toHaveBeenCalled();
    expect(onAttempt).not.toHaveBeenCalled();
  });
});
