import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  SWIPE_COMMIT_FRACTION,
  useSwipeCard,
  type SwipeDirection,
} from './useSwipeCard';

/**
 * CR-82 (spec s14.4): swipe gesture semantics - direction lock, commit
 * thresholds (distance/velocity), spring-back cancel, and the trailing-
 * click suppression shared with the flip button.
 */

const CARD_W = 300;

function Harness({
  enabled = true,
  onCommit,
  onCancel,
}: {
  enabled?: boolean;
  onCommit: (dir: SwipeDirection) => void;
  onCancel?: () => void;
}) {
  const swipe = useSwipeCard({ enabled, onCommit, onCancel });
  return (
    <div>
      <div
        data-testid="card"
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
        onLostPointerCapture={swipe.onLostPointerCapture}
      >
        card
      </div>
      <div data-testid="dx">{swipe.dx}</div>
      <div data-testid="dragging">{String(swipe.dragging)}</div>
    </div>
  );
}

function stubWidth(el: Element, w: number): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    width: w,
    height: 100,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: w,
    bottom: 100,
    toJSON: () => ({}),
  } as DOMRect);
}

const DOWN = { pointerId: 3, button: 0, clientX: 100, clientY: 100 };

function move(x: number, y: number, t = 50) {
  return { pointerId: 3, clientX: x, clientY: y, timeStamp: t };
}

describe('useSwipeCard', () => {
  it('follows horizontal movement once the lock engages', () => {
    render(<Harness onCommit={vi.fn()} />);
    const card = screen.getByTestId('card');
    stubWidth(card, CARD_W);
    fireEvent.pointerDown(card, DOWN);
    fireEvent.pointerMove(card, move(140, 100));
    expect(screen.getByTestId('dragging')).toHaveTextContent('true');
    expect(screen.getByTestId('dx')).toHaveTextContent('40');
  });

  it('a vertical-first gesture releases to the page and never drags', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const card = screen.getByTestId('card');
    stubWidth(card, CARD_W);
    fireEvent.pointerDown(card, DOWN);
    fireEvent.pointerMove(card, move(105, 160)); // dy >> dx inside lock window
    fireEvent.pointerMove(card, move(200, 160));
    expect(screen.getByTestId('dx')).toHaveTextContent('0');
    fireEvent.pointerUp(card, move(200, 160));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits right at >= 30% of card width', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const card = screen.getByTestId('card');
    stubWidth(card, CARD_W);
    fireEvent.pointerDown(card, DOWN);
    const dx = Math.ceil(CARD_W * SWIPE_COMMIT_FRACTION) + 10;
    fireEvent.pointerMove(card, move(100 + dx, 100, 200));
    fireEvent.pointerUp(card, move(100 + dx, 100, 200));
    expect(onCommit).toHaveBeenCalledWith('right');
  });

  it('commits left on a short drag released leftwards', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const card = screen.getByTestId('card');
    stubWidth(card, CARD_W);
    fireEvent.pointerDown(card, DOWN);
    fireEvent.pointerMove(card, move(10, 100, 200));
    fireEvent.pointerUp(card, move(10, 100, 200));
    expect(onCommit).toHaveBeenCalledWith('left');
  });

  it('below threshold -> onCancel (spring back), dx resets', () => {
    /* jsdom stamps events with the real clock - a 30px release inside a
       few ms reads as a flick and commits. Fake timers slow the release
       so velocity stays under the 0.6px/ms threshold and the distance
       check decides. */
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const onCancel = vi.fn();
      render(<Harness onCommit={onCommit} onCancel={onCancel} />);
      const card = screen.getByTestId('card');
      stubWidth(card, CARD_W);
      fireEvent.pointerDown(card, DOWN);
      fireEvent.pointerMove(card, move(130, 100)); // 30px < 90px commit
      vi.advanceTimersByTime(500);
      fireEvent.pointerUp(card, move(130, 100));
      expect(onCommit).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledOnce();
      expect(screen.getByTestId('dx')).toHaveTextContent('0');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a plain tap is not a drag and does not suppress the click', () => {
    const onCommit = vi.fn();
    const onFlip = vi.fn();
    function TapHarness() {
      const swipe = useSwipeCard({ enabled: true, onCommit });
      return (
        <>
          <div
            data-testid="tap-card"
            onPointerDown={swipe.onPointerDown}
            onPointerMove={swipe.onPointerMove}
            onPointerUp={swipe.onPointerUp}
          >
            card
          </div>
          <button
            data-testid="tap-flip"
            onClick={(e) => {
              if (!swipe.shouldSuppressClick(e.detail)) onFlip();
            }}
          >
            flip
          </button>
        </>
      );
    }
    render(<TapHarness />);
    const card = screen.getByTestId('tap-card');
    stubWidth(card, CARD_W);
    fireEvent.pointerDown(card, DOWN);
    fireEvent.pointerUp(card, move(103, 102));
    expect(onCommit).not.toHaveBeenCalled();
    // The tap's native click still fires the flip handler.
    fireEvent.click(screen.getByTestId('tap-flip'), { detail: 1 });
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it('suppresses the trailing click after a real drag, but keyboard clicks pass', () => {
    const onCommit = vi.fn();
    const onFlip = vi.fn();
    function SuppressHarness() {
      const swipe = useSwipeCard({ enabled: true, onCommit });
      return (
        <>
          <div
            data-testid="card2"
            onPointerDown={swipe.onPointerDown}
            onPointerMove={swipe.onPointerMove}
            onPointerUp={swipe.onPointerUp}
          >
            card
          </div>
          <button
            data-testid="flip2"
            onClick={(e) => {
              if (!swipe.shouldSuppressClick(e.detail)) onFlip();
            }}
          >
            flip
          </button>
        </>
      );
    }
    render(<SuppressHarness />);
    const card = screen.getByTestId('card2');
    stubWidth(card, CARD_W);
    fireEvent.pointerDown(card, DOWN);
    fireEvent.pointerMove(card, move(160, 100));
    fireEvent.pointerUp(card, move(160, 100));

    // Synthetic trailing click (detail 1) is swallowed.
    fireEvent.click(screen.getByTestId('flip2'), { detail: 1 });
    expect(onFlip).not.toHaveBeenCalled();
    // Keyboard click (detail 0) always passes.
    fireEvent.click(screen.getByTestId('flip2'), { detail: 0 });
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it('pointerCancel mid-drag cleans up without committing', () => {
    const onCommit = vi.fn();
    const onCancel = vi.fn();
    render(<Harness onCommit={onCommit} onCancel={onCancel} />);
    const card = screen.getByTestId('card');
    stubWidth(card, CARD_W);
    fireEvent.pointerDown(card, DOWN);
    fireEvent.pointerMove(card, move(150, 100));
    fireEvent.pointerCancel(card, move(150, 100));
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.getByTestId('dx')).toHaveTextContent('0');
  });

  it('disabled = the gesture never starts', () => {
    const onCommit = vi.fn();
    render(<Harness enabled={false} onCommit={onCommit} />);
    const card = screen.getByTestId('card');
    stubWidth(card, CARD_W);
    fireEvent.pointerDown(card, DOWN);
    fireEvent.pointerMove(card, move(200, 100));
    fireEvent.pointerUp(card, move(200, 100));
    expect(screen.getByTestId('dx')).toHaveTextContent('0');
    expect(onCommit).not.toHaveBeenCalled();
  });
});
