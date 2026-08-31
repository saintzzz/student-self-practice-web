import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isSpeechRecognitionSupported,
  requestMicrophonePermission,
  startSpeechRecognition,
  type SpeechRecognitionErrorEventLike,
  type SpeechRecognitionEventLike,
  type SpeechRecognitionLike,
} from './speechRecognition';

interface TestWindow {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
}

function testWindow(): TestWindow {
  return window as unknown as TestWindow;
}

class FakeRecognition implements SpeechRecognitionLike {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null = null;
  onend: (() => void) | null = null;
  startCalled = false;
  stopCalled = false;

  start(): void {
    this.startCalled = true;
  }

  stop(): void {
    this.stopCalled = true;
  }

  abort(): void {
    // Not exercised by these tests.
  }
}

function makeResultEvent(transcript: string): SpeechRecognitionEventLike {
  return {
    resultIndex: 0,
    results: {
      length: 1,
      0: { length: 1, 0: { transcript, confidence: 0.9 } },
    },
  };
}

describe('isSpeechRecognitionSupported', () => {
  const original = { ...testWindow() };

  afterEach(() => {
    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('returns true when SpeechRecognition is present', () => {
    testWindow().SpeechRecognition = FakeRecognition;
    testWindow().webkitSpeechRecognition = undefined;

    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it('returns true when only webkitSpeechRecognition is present', () => {
    testWindow().SpeechRecognition = undefined;
    testWindow().webkitSpeechRecognition = FakeRecognition;

    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it('returns false when neither is present (e.g. Firefox)', () => {
    testWindow().SpeechRecognition = undefined;
    testWindow().webkitSpeechRecognition = undefined;

    expect(isSpeechRecognitionSupported()).toBe(false);
  });
});

describe('startSpeechRecognition', () => {
  const original = { ...testWindow() };

  afterEach(() => {
    testWindow().SpeechRecognition = original.SpeechRecognition;
    testWindow().webkitSpeechRecognition = original.webkitSpeechRecognition;
  });

  it('returns null when unsupported', () => {
    testWindow().SpeechRecognition = undefined;
    testWindow().webkitSpeechRecognition = undefined;

    const controller = startSpeechRecognition({
      onResult: vi.fn(),
      onPermissionError: vi.fn(),
      onOtherError: vi.fn(),
    });

    expect(controller).toBeNull();
  });

  it('configures en-US, single-utterance mode and calls start()', () => {
    let created: FakeRecognition | null = null;
    testWindow().SpeechRecognition = class extends FakeRecognition {
      constructor() {
        super();
        created = this;
      }
    };
    testWindow().webkitSpeechRecognition = undefined;

    startSpeechRecognition({ onResult: vi.fn(), onPermissionError: vi.fn(), onOtherError: vi.fn() });

    expect(created).not.toBeNull();
    expect(created!.lang).toBe('en-US');
    expect(created!.continuous).toBe(false);
    expect(created!.interimResults).toBe(false);
    expect(created!.startCalled).toBe(true);
  });

  it('routes a result to onResult with the last transcript', () => {
    let created: FakeRecognition | null = null;
    testWindow().SpeechRecognition = class extends FakeRecognition {
      constructor() {
        super();
        created = this;
      }
    };
    testWindow().webkitSpeechRecognition = undefined;

    const onResult = vi.fn();
    startSpeechRecognition({ onResult, onPermissionError: vi.fn(), onOtherError: vi.fn() });

    created!.onresult?.(makeResultEvent('cat'));

    expect(onResult).toHaveBeenCalledWith('cat');
  });

  it('routes a not-allowed error to onPermissionError', () => {
    let created: FakeRecognition | null = null;
    testWindow().SpeechRecognition = class extends FakeRecognition {
      constructor() {
        super();
        created = this;
      }
    };
    testWindow().webkitSpeechRecognition = undefined;

    const onPermissionError = vi.fn();
    const onOtherError = vi.fn();
    startSpeechRecognition({ onResult: vi.fn(), onPermissionError, onOtherError });

    created!.onerror?.({ error: 'not-allowed' });

    expect(onPermissionError).toHaveBeenCalledOnce();
    expect(onOtherError).not.toHaveBeenCalled();
  });

  it('routes a non-permission error (e.g. no-speech) to onOtherError', () => {
    let created: FakeRecognition | null = null;
    testWindow().SpeechRecognition = class extends FakeRecognition {
      constructor() {
        super();
        created = this;
      }
    };
    testWindow().webkitSpeechRecognition = undefined;

    const onPermissionError = vi.fn();
    const onOtherError = vi.fn();
    startSpeechRecognition({ onResult: vi.fn(), onPermissionError, onOtherError });

    created!.onerror?.({ error: 'no-speech' });

    expect(onOtherError).toHaveBeenCalledOnce();
    expect(onPermissionError).not.toHaveBeenCalled();
  });

  it('treats onend firing with no prior result/error as a no-speech attempt', () => {
    let created: FakeRecognition | null = null;
    testWindow().SpeechRecognition = class extends FakeRecognition {
      constructor() {
        super();
        created = this;
      }
    };
    testWindow().webkitSpeechRecognition = undefined;

    const onOtherError = vi.fn();
    startSpeechRecognition({ onResult: vi.fn(), onPermissionError: vi.fn(), onOtherError });

    created!.onend?.();

    expect(onOtherError).toHaveBeenCalledOnce();
  });

  it('does not double-fire onOtherError when onend follows a result', () => {
    let created: FakeRecognition | null = null;
    testWindow().SpeechRecognition = class extends FakeRecognition {
      constructor() {
        super();
        created = this;
      }
    };
    testWindow().webkitSpeechRecognition = undefined;

    const onResult = vi.fn();
    const onOtherError = vi.fn();
    startSpeechRecognition({ onResult, onPermissionError: vi.fn(), onOtherError });

    created!.onresult?.(makeResultEvent('dog'));
    created!.onend?.();

    expect(onResult).toHaveBeenCalledOnce();
    expect(onOtherError).not.toHaveBeenCalled();
  });

  it('the returned controller.stop() calls the recognizer stop() and never throws', () => {
    let created: FakeRecognition | null = null;
    testWindow().SpeechRecognition = class extends FakeRecognition {
      constructor() {
        super();
        created = this;
      }
    };
    testWindow().webkitSpeechRecognition = undefined;

    const controller = startSpeechRecognition({ onResult: vi.fn(), onPermissionError: vi.fn(), onOtherError: vi.fn() });

    expect(() => controller?.stop()).not.toThrow();
    expect(created!.stopCalled).toBe(true);
  });

  it('returns null when the recognizer throws on start()', () => {
    testWindow().SpeechRecognition = class extends FakeRecognition {
      override start(): void {
        throw new Error('mic busy');
      }
    };
    testWindow().webkitSpeechRecognition = undefined;

    const controller = startSpeechRecognition({ onResult: vi.fn(), onPermissionError: vi.fn(), onOtherError: vi.fn() });

    expect(controller).toBeNull();
  });
});

describe('requestMicrophonePermission', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves true when getUserMedia grants access', async () => {
    const stopTrack = vi.fn();
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream);

    const granted = await requestMicrophonePermission();

    expect(granted).toBe(true);
    expect(stopTrack).toHaveBeenCalledOnce();
  });

  it('resolves false when getUserMedia rejects (permission denied)', async () => {
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValue(new Error('Permission denied'));

    const granted = await requestMicrophonePermission();

    expect(granted).toBe(false);
  });
});
