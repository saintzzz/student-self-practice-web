import { afterEach, describe, expect, it, vi } from 'vitest';
import { startAudioRecording } from './audioRecording';

function fakeStream() {
  const track = { stop: vi.fn(), kind: 'audio' };
  return {
    track,
    stream: { getTracks: () => [track] } as unknown as MediaStream,
  };
}

function mockRecorder(startImpl?: () => void) {
  class FakeRecorder {
    state = 'inactive';
    mimeType = 'audio/webm';
    ondataavailable: unknown = null;
    onstop: unknown = null;
    onerror: unknown = null;
    start = vi.fn(startImpl ?? (() => {}));
    stop = vi.fn(() => {
      this.state = 'inactive';
    });
  }
  vi.stubGlobal('MediaRecorder', FakeRecorder);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('startAudioRecording - r9 init failure cleanup', () => {
  it('recorder.start() throwing stops every captured track', async () => {
    const { track, stream } = fakeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn(async () => stream) },
    });
    mockRecorder(() => {
      throw new Error('start failed');
    });

    await expect(startAudioRecording()).rejects.toThrow('start failed');
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it('VAD init throwing after AudioContext creation closes the context', async () => {
    const { stream } = fakeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn(async () => stream) },
    });
    const close = vi.fn(async () => undefined);
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        createMediaStreamSource() {
          return { connect() {} };
        }
        createAnalyser() {
          throw new Error('no analyser');
        }
        close = close;
      },
    );
    mockRecorder();

    const ctl = await startAudioRecording();
    expect(close).toHaveBeenCalledTimes(1);
    ctl.cancel();
  });

  it('MediaRecorder constructor throwing stops every captured track', async () => {
    const { track, stream } = fakeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn(async () => stream) },
    });
    vi.stubGlobal(
      'MediaRecorder',
      class {
        constructor() {
          throw new Error('no mime support');
        }
      },
    );

    await expect(startAudioRecording()).rejects.toThrow('no mime support');
    expect(track.stop).toHaveBeenCalledTimes(1);
  });
});
