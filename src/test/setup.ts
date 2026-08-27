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
    getVoices: () => [],
  };
}
