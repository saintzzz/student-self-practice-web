import { useCallback, useState } from 'react';
import type { SpeechPlaybackStatus } from '../lib/speech';

export interface UseAudioPlaybackResult {
  /** True once the play button has been tapped at least once (drives the "Nghe" -> "Nghe lại" label). */
  hasPlayed: boolean;
  /**
   * True when the browser reported the last playback attempt as
   * unsupported or errored - lets a component show a real, honest signal
   * instead of silently doing nothing when a student taps play and hears
   * nothing (a real gap this app had no way to surface before).
   */
  playbackFailed: boolean;
  play: () => void;
}

/**
 * Shared play-button state for every question kind that speaks a word or
 * sentence via speech.ts (ListeningFillBlankQuestion,
 * ListeningImageChoiceQuestion, ListeningSentenceFillBlankQuestion,
 * DescribeAndChooseImageQuestion) - all 4 had this exact same
 * hasPlayed-state-plus-handlePlay shape duplicated before this hook
 * existed.
 */
export function useAudioPlayback(
  speak: (onStatus: (status: SpeechPlaybackStatus) => void) => void,
): UseAudioPlaybackResult {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  const play = useCallback(() => {
    setHasPlayed(true);
    setPlaybackFailed(false);
    speak((status) => {
      if (status === 'unsupported' || status === 'error') {
        setPlaybackFailed(true);
      }
    });
  }, [speak]);

  return { hasPlayed, playbackFailed, play };
}
