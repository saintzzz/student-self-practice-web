import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { InstructionSpeaker, __resetInstructionAutoplay } from './InstructionSpeaker';
import { speakInstruction } from '../lib/speech';

/**
 * CR-72: the instruction speaker is headless - no button, no icon. These
 * specs cover the autoplay ledger: once per key, all grades, cancelled on
 * unmount, retired by a mic-recording generation bump.
 */
const genState = vi.hoisted(() => ({ value: 0 }));
vi.mock('../lib/speech', () => ({
  speakInstruction: vi.fn(() => vi.fn()),
  currentAudioGeneration: () => genState.value,
}));

const mockSpeak = vi.mocked(speakInstruction);

beforeEach(() => {
  mockSpeak.mockClear();
  genState.value = 0;
  __resetInstructionAutoplay();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('InstructionSpeaker - headless render', () => {
  it('renders nothing - no speaker button or icon in the DOM', () => {
    const { container } = render(<InstructionSpeaker text="Nghe này" autoplayKey="k" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('InstructionSpeaker - autoplay once per key (all grades)', () => {
  it('auto-speaks 400ms after mount - no grade gate, no tap needed', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="Chào em!" autoplayKey="screen-a" />);

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(mockSpeak).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith(
      'Chào em!',
      expect.objectContaining({ lang: undefined, autoplay: true }),
    );
  });

  it('passes lang through to speakInstruction', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="Listen!" lang="en-US" autoplayKey="screen-en" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockSpeak).toHaveBeenCalledWith(
      'Listen!',
      expect.objectContaining({ lang: 'en-US', autoplay: true }),
    );
  });

  it('never autoplays twice for the same key across remounts', () => {
    vi.useFakeTimers();
    const first = render(<InstructionSpeaker text="A" autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    first.unmount();

    render(<InstructionSpeaker text="A" autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it('a different autoplayKey speaks again (new screen = new instruction)', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="A" autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    render(<InstructionSpeaker text="B" autoplayKey="screen-b" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockSpeak).toHaveBeenCalledTimes(2);
  });

  it('mount-unmount-remount before the delay still speaks exactly once (StrictMode guard)', () => {
    vi.useFakeTimers();
    const first = render(<InstructionSpeaker text="A" autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    first.unmount();

    render(<InstructionSpeaker text="A" autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it('a recording session between schedule and fire permanently retires the autoplay', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="A" autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Mic opens and closes inside the 400ms autoplay window.
    act(() => {
      genState.value += 1;
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('no autoplayKey means silence', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="A" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('cancels an in-flight instruction on unmount', () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    mockSpeak.mockReturnValue(cancel);
    const view = render(<InstructionSpeaker text="A" autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    view.unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
