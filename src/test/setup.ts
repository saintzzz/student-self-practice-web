import '@testing-library/jest-dom/vitest';

/**
 * jsdom does not implement the Web Speech API. Stub the minimal surface the
 * app touches (window.speechSynthesis.speak, SpeechSynthesisUtterance) so
 * components can call the real code path in tests, and tests can spy on
 * window.speechSynthesis.speak to assert it was invoked correctly.
 */
if (typeof window.SpeechSynthesisUtterance === 'undefined') {
  class SpeechSynthesisUtteranceStub {
    text: string;
    lang = '';

    constructor(text: string) {
      this.text = text;
    }
  }

  // @ts-expect-error jsdom does not ship this DOM type at runtime
  window.SpeechSynthesisUtterance = SpeechSynthesisUtteranceStub;
}

if (typeof window.speechSynthesis === 'undefined') {
  // @ts-expect-error jsdom does not ship this DOM type at runtime
  window.speechSynthesis = {
    speak: () => {},
    cancel: () => {},
    resume: () => {},
    getVoices: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

/**
 * jsdom has no real navigator.mediaDevices.getUserMedia implementation.
 * Stub a default that grants a fake, track-less microphone stream so Round
 * 3's pronunciation-recording flow (plan.md v5/v6) runs through its real
 * permission-check code path in tests. Individual tests override this via
 * vi.spyOn(navigator.mediaDevices, 'getUserMedia') to exercise the
 * permission-denied fallback path.
 */
function installGetUserMediaStub(): void {
  const fakeGetUserMedia = async (): Promise<MediaStream> => ({ getTracks: () => [] }) as unknown as MediaStream;

  if (!window.navigator.mediaDevices) {
    Object.defineProperty(window.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: fakeGetUserMedia },
    });
    return;
  }

  Object.defineProperty(window.navigator.mediaDevices, 'getUserMedia', {
    configurable: true,
    writable: true,
    value: fakeGetUserMedia,
  });
}

installGetUserMediaStub();

interface SpeechRecognitionTestWindow {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
}

/**
 * jsdom does not implement SpeechRecognition / webkitSpeechRecognition at
 * all (this API is absent from Firefox too, which is exactly the
 * unsupported-browser case Round 3 must handle gracefully - AC19). This
 * default stub auto-completes shortly after start() with a fixed,
 * deliberately-generic transcript, so integration-level tests can drive the
 * real record -> transcribe -> score flow without per-test wiring. Tests
 * covering the unsupported-browser or permission-denied paths temporarily
 * unset window.SpeechRecognition / webkitSpeechRecognition, or reject
 * getUserMedia, instead.
 */
class MockSpeechRecognitionStub {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start(): void {
    setTimeout(() => {
      this.onresult?.({
        resultIndex: 0,
        results: { length: 1, 0: { length: 1, 0: { transcript: 'practice attempt', confidence: 0.9 } } },
      });
      this.onend?.();
    }, 0);
  }

  stop(): void {
    this.onend?.();
  }

  abort(): void {
    this.onend?.();
  }
}

const speechApiWindow = window as unknown as SpeechRecognitionTestWindow;
if (
  typeof speechApiWindow.SpeechRecognition === 'undefined' &&
  typeof speechApiWindow.webkitSpeechRecognition === 'undefined'
) {
  speechApiWindow.SpeechRecognition = MockSpeechRecognitionStub;
  speechApiWindow.webkitSpeechRecognition = MockSpeechRecognitionStub;
}

/**
 * T-4 test infrastructure: the dotLottie player (canvas + WASM) cannot run
 * in jsdom. Mock the project wrapper `EmojiLottiePlayer` - never the npm
 * package directly - so EmojiVisual exercises its real lazy/Suspense/
 * timeout/fallback code path while the player itself is a stub.
 *
 * Control seam: `window.__lottieMockBehavior`
 *   'ready'          (default) fires onReady on mount
 *   'error-data'     fires onError('data') - per-mount fallback, no breaker
 *   'error-runtime'  fires onError('runtime') - trips the session breaker
 *   'hang'           never resolves - exercises the 2500 ms timeout
 * Reset it in beforeEach; EmojiVisual tests use fake timers.
 */
import { vi } from 'vitest';
import React from 'react';

declare global {
  interface Window {
    __lottieMockBehavior?: 'ready' | 'error-data' | 'error-runtime' | 'hang';
  }
}

vi.mock('../components/EmojiLottiePlayer', () => ({
  default: function MockEmojiLottiePlayer(props: {
    lottieKey: string;
    onReady: () => void;
    onError: (kind: 'data' | 'runtime') => void;
  }) {
    React.useEffect(() => {
      const behavior = window.__lottieMockBehavior ?? 'ready';
      if (behavior === 'ready') props.onReady();
      else if (behavior === 'error-data') props.onError('data');
      else if (behavior === 'error-runtime') props.onError('runtime');
      // 'hang': intentionally does nothing
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return React.createElement('span', { 'data-testid': `lottie-${props.lottieKey}` });
  },
}));
