import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { InstructionSpeaker, __resetInstructionAutoplay } from './InstructionSpeaker';
import { speakInstruction, type InstructionStatus } from '../lib/speech';

/**
 * kids-UX step 5 (design-kids-ux s3.2): the persistent instruction
 * speaker. speakInstruction is mocked at the module seam - these specs
 * drive its onStatus callback to assert the token/state mapping.
 */
vi.mock('../lib/speech', () => ({
  speakInstruction: vi.fn(),
}));

const mockSpeak = vi.mocked(speakInstruction);

function lastStatusSink(): (s: InstructionStatus) => void {
  const last = mockSpeak.mock.calls[mockSpeak.mock.calls.length - 1];
  expect(last).toBeDefined();
  return last![1]!.onStatus!;
}

function sendStatus(s: InstructionStatus): void {
  act(() => {
    lastStatusSink()(s);
  });
}

beforeEach(() => {
  mockSpeak.mockClear();
  __resetInstructionAutoplay();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('InstructionSpeaker - render + tap replay', () => {
  it('renders the idle SPEAKER_BTN disc with the kid-facing accessible name', () => {
    render(<InstructionSpeaker text="Bấm nút Chơi nhé!" />);

    const btn = screen.getByTestId('instruction-speaker');
    expect(btn).toHaveAttribute('aria-label', 'Nghe hướng dẫn');
    expect(btn.className).toContain('min-h-[76px]');
    expect(btn.className).toContain('bg-indigo-100');
    expect(btn.className).not.toContain('animate-pulse');
  });

  it('tap calls speakInstruction with text + lang and always replays', () => {
    render(<InstructionSpeaker text="Chọn một vùng đất nhé!" lang="en-US" />);

    const btn = screen.getByTestId('instruction-speaker');
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(mockSpeak).toHaveBeenCalledTimes(2);
    expect(mockSpeak).toHaveBeenLastCalledWith(
      'Chọn một vùng đất nhé!',
      expect.objectContaining({ lang: 'en-US', onStatus: expect.any(Function) }),
    );
  });
});

describe('InstructionSpeaker - status to token mapping', () => {
  it("'playing' pulses, 'ended' returns to idle", () => {
    render(<InstructionSpeaker text="Nghe này" />);
    fireEvent.click(screen.getByTestId('instruction-speaker'));

    sendStatus('playing');
    expect(screen.getByTestId('instruction-speaker').className).toContain('animate-pulse');
    expect(screen.getByTestId('instruction-speaker').className).toContain('bg-indigo-600');

    sendStatus('ended');
    expect(screen.getByTestId('instruction-speaker').className).not.toContain('animate-pulse');
    expect(screen.getByTestId('instruction-speaker').className).toContain('bg-indigo-100');
  });

  it("'blocked' shows the bouncing tap-me cue", () => {
    render(<InstructionSpeaker text="Nghe này" />);
    fireEvent.click(screen.getByTestId('instruction-speaker'));

    sendStatus('blocked');
    const btn = screen.getByTestId('instruction-speaker');
    expect(btn.className).toContain('animate-bounce');
    expect(btn.className).toContain('motion-reduce:animate-none');
    expect(btn).toHaveAttribute('title', 'Bé chạm để nghe nhé');
  });

  it("'unavailable' renders nothing (visual-only path, AC-1.4)", () => {
    render(<InstructionSpeaker text="Nghe này" />);
    fireEvent.click(screen.getByTestId('instruction-speaker'));

    sendStatus('unavailable');
    expect(screen.queryByTestId('instruction-speaker')).not.toBeInTheDocument();
  });

  it("'error' returns to the idle token with the tap hint", () => {
    render(<InstructionSpeaker text="Nghe này" />);
    fireEvent.click(screen.getByTestId('instruction-speaker'));

    sendStatus('error');
    const btn = screen.getByTestId('instruction-speaker');
    expect(btn.className).toContain('bg-indigo-100');
    expect(btn).toHaveAttribute('title', 'Bé chạm để nghe nhé');
  });
});

describe('InstructionSpeaker - autoplay once per key', () => {
  it('auto-speaks 400ms after mount when autoplay + autoplayKey are set', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="Chào em!" autoplay autoplayKey="screen-a" />);

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(mockSpeak).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalledWith('Chào em!', expect.objectContaining({ onStatus: expect.any(Function) }));
  });

  it('never autoplays twice for the same key across remounts', () => {
    vi.useFakeTimers();
    const first = render(<InstructionSpeaker text="A" autoplay autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    first.unmount();

    render(<InstructionSpeaker text="A" autoplay autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it('a different autoplayKey speaks again', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="A" autoplay autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    render(<InstructionSpeaker text="B" autoplay autoplayKey="screen-b" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mockSpeak).toHaveBeenCalledTimes(2);
  });

  it('mount-unmount-remount before the delay still speaks exactly once (StrictMode guard)', () => {
    vi.useFakeTimers();
    const first = render(<InstructionSpeaker text="A" autoplay autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    first.unmount();

    render(<InstructionSpeaker text="A" autoplay autoplayKey="screen-a" />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it('no autoplayKey or autoplay=false means tap-only', () => {
    vi.useFakeTimers();
    render(<InstructionSpeaker text="A" autoplayKey="screen-a" />);
    render(<InstructionSpeaker text="B" autoplay />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(mockSpeak).not.toHaveBeenCalled();
  });
});
