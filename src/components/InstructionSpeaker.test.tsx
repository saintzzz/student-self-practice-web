import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import {
  InstructionSpeaker,
  __resetInstructionAutoplay,
  lastInstructionSettle,
  replayLastInstruction,
  subscribeInstructionSettled,
} from './InstructionSpeaker';
import { speakInstruction } from '../lib/speech';

/**
 * CR-83: instruction voice is disabled product-wide. The speaker is a
 * silent settle-signaller now - these specs pin the new contract:
 * never calls speakInstruction, settles 'not-played' exactly once per
 * mount (the thinking-pose idle clock depends on it).
 */
vi.mock('../lib/speech', () => ({
  speakInstruction: vi.fn(() => vi.fn()),
  currentAudioGeneration: () => 0,
}));

const mockSpeak = vi.mocked(speakInstruction);

beforeEach(() => {
  mockSpeak.mockClear();
  __resetInstructionAutoplay();
});

describe('InstructionSpeaker - headless render', () => {
  it('renders nothing - no speaker button or icon in the DOM', () => {
    const { container } = render(<InstructionSpeaker text="Nghe này" autoplayKey="k" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('InstructionSpeaker - never speaks (CR-83)', () => {
  it('does not call speakInstruction on mount - even with an autoplayKey', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="Chào em!" autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSpeak).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not call speakInstruction for en-US either', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="Listen!" lang="en-US" autoplayKey="screen-en" />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(mockSpeak).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('replayLastInstruction is a silent no-op', () => {
    replayLastInstruction();
    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

describe('InstructionSpeaker - settle contract (D-15)', () => {
  it("settles 'not-played' exactly once at mount", () => {
    const onSettled = vi.fn();
    render(<InstructionSpeaker text="A" autoplayKey="settle-key" onSettled={onSettled} />);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith('not-played');
  });

  it("no autoplayKey also settles 'not-played' at mount", () => {
    const onSettled = vi.fn();
    render(<InstructionSpeaker text="A" onSettled={onSettled} />);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith('not-played');
  });

  it('the settle channel notifies board-level subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeInstructionSettled(listener);
    try {
      render(<InstructionSpeaker text="A" />);
      expect(listener).toHaveBeenCalledWith('not-played');
    } finally {
      unsubscribe();
    }
  });

  it('buffers the last settle for a subscriber that mounts after it', () => {
    render(<InstructionSpeaker text="A" />);
    const settled = lastInstructionSettle();
    expect(settled?.outcome).toBe('not-played');
    expect(settled?.epoch).toBeGreaterThan(0);
  });

  it('__resetInstructionAutoplay clears the buffered settle', () => {
    render(<InstructionSpeaker text="A" />);
    __resetInstructionAutoplay();
    expect(lastInstructionSettle()).toBeNull();
  });
});
