import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAudioPlayback } from './useAudioPlayback';
import type { SpeechPlaybackStatus } from '../lib/speech';

describe('useAudioPlayback', () => {
  it('starts with hasPlayed and playbackFailed both false', () => {
    const { result } = renderHook(() => useAudioPlayback(() => {}));

    expect(result.current.hasPlayed).toBe(false);
    expect(result.current.playbackFailed).toBe(false);
  });

  it('sets hasPlayed true and playbackFailed false when playback reports "started"', () => {
    const speak = (onStatus: (status: SpeechPlaybackStatus) => void) => onStatus('started');
    const { result } = renderHook(() => useAudioPlayback(speak));

    act(() => result.current.play());

    expect(result.current.hasPlayed).toBe(true);
    expect(result.current.playbackFailed).toBe(false);
  });

  it('sets playbackFailed true when playback reports "error"', () => {
    const speak = (onStatus: (status: SpeechPlaybackStatus) => void) => onStatus('error');
    const { result } = renderHook(() => useAudioPlayback(speak));

    act(() => result.current.play());

    expect(result.current.playbackFailed).toBe(true);
  });

  it('sets playbackFailed true when playback reports "unsupported"', () => {
    const speak = (onStatus: (status: SpeechPlaybackStatus) => void) => onStatus('unsupported');
    const { result } = renderHook(() => useAudioPlayback(speak));

    act(() => result.current.play());

    expect(result.current.playbackFailed).toBe(true);
  });

  it('clears a previous playbackFailed on a fresh successful play (Nghe lại recovers)', () => {
    const onStatus = vi.fn();
    let nextStatus: SpeechPlaybackStatus = 'error';
    const speak = (cb: (status: SpeechPlaybackStatus) => void) => {
      onStatus();
      cb(nextStatus);
    };
    const { result } = renderHook(() => useAudioPlayback(speak));

    act(() => result.current.play());
    expect(result.current.playbackFailed).toBe(true);

    nextStatus = 'started';
    act(() => result.current.play());
    expect(result.current.playbackFailed).toBe(false);
  });
});
