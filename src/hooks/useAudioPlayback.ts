import { useCallback, useEffect, useState } from 'react';
import { preloadAudio, type SpeechPlaybackStatus, type SpeechSpeed } from '../lib/speech';

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
  /**
   * CR-82 (D-15): true between `play()`/`playSlow()` and the first
   * `started`/`ended`/`error`/`unsupported` status - question bodies
   * forward it to the board's thinking-pose signal via
   * `onAudioLoadingChange`.
   */
  isLoading: boolean;
  play: () => void;
  /** Replays the same audio at kid-paced "slow" speed (field feedback: default rate was still too fast to catch). */
  playSlow: () => void;
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
  speak: (onStatus: (status: SpeechPlaybackStatus) => void, speed: SpeechSpeed) => void,
  /** CR-69: spoken text to buffer at mount so the first tap plays instantly. */
  preloadText?: string,
): UseAudioPlaybackResult {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (preloadText) preloadAudio(preloadText);
  }, [preloadText]);

  const playAt = useCallback(
    (speed: SpeechSpeed) => {
      setHasPlayed(true);
      setPlaybackFailed(false);
      setIsLoading(true);
      speak(
        (status) => {
          /* Any emitted status ends the loading window - 'started' on
             success, 'ended'/'error'/'unsupported' on the failure and
             already-finished paths (D-15). */
          setIsLoading(false);
          if (status === 'unsupported' || status === 'error') {
            setPlaybackFailed(true);
          }
        },
        speed,
      );
    },
    [speak],
  );

  const play = useCallback(() => playAt('normal'), [playAt]);
  const playSlow = useCallback(() => playAt('slow'), [playAt]);

  return { hasPlayed, playbackFailed, isLoading, play, playSlow };
}
