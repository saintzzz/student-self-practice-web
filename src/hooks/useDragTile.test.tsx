import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useDragTile } from './useDragTile';

/**
 * CR-82 (ARCHITECTURE-v5 D-05): the generalized drag hook - cross-
 * namespace delivery, onDropOutside, transform ghost, and the unchanged
 * pair-matching default semantics.
 */

interface HarnessProps {
  crossNamespace?: boolean;
  onDrop: (src: number, dst: number) => void;
  onDropOutside?: (src: number) => void;
  withGhost?: boolean;
}

function Harness({ crossNamespace, onDrop, onDropOutside, withGhost = true }: HarnessProps) {
  const drag = useDragTile({
    enabled: true,
    targetAttr: 'data-slot-index',
    onDrop,
    onDropOutside,
    crossNamespace,
    renderGhost: withGhost ? (src) => <span data-testid="ghost-content">tile-{src}</span> : undefined,
  });
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <button
          key={i}
          data-testid={`tile-${i}`}
          onPointerDown={drag.onPointerDown(i)}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
          onLostPointerCapture={drag.onLostPointerCapture}
        >
          T{i}
        </button>
      ))}
      <div data-testid="slot-0" data-slot-index="0" />
      <div data-testid="slot-1" data-slot-index="1" />
      <div data-testid="slot-2" data-slot-index="2" />
      {drag.ghostNode}
    </div>
  );
}

const DOWN = { pointerId: 7, button: 0, clientX: 10, clientY: 10 };
const MOVE = { pointerId: 7, clientX: 60, clientY: 60 };
const UP = { pointerId: 7, clientX: 60, clientY: 60 };

/** jsdom does not implement elementFromPoint - install a stub and
 *  restore the original (undefined) afterwards. */
function stubElementFromPoint(target: Element | null): () => void {
  const doc = document as Document & { elementFromPoint?: Document['elementFromPoint'] };
  const original = doc.elementFromPoint;
  doc.elementFromPoint = () => target;
  return () => {
    doc.elementFromPoint = original;
  };
}

/** Runs the drag gesture on tile index `i`, with elementFromPoint
 *  resolving to the given drop-target element (or null). */
async function dragTile(i: number, target: Element | null) {
  const restore = stubElementFromPoint(target);
  const tile = screen.getByTestId(`tile-${i}`);
  fireEvent.pointerDown(tile, DOWN);
  fireEvent.pointerMove(tile, MOVE);
  // Flush the rAF that materializes the ghost (inside act so the
  // React 18 scheduled update is committed).
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  fireEvent.pointerUp(tile, UP);
  restore();
}

describe('useDragTile (D-05)', () => {
  it('delivers a same-index drop only under crossNamespace', async () => {
    const sameNs = vi.fn();
    render(<Harness onDrop={sameNs} crossNamespace={false} />);
    await dragTile(0, screen.getByTestId('slot-0'));
    expect(sameNs).not.toHaveBeenCalled();
  });

  it('crossNamespace: bank index 2 dropped on slot 2 is delivered', async () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} crossNamespace />);
    await dragTile(2, screen.getByTestId('slot-2'));
    expect(onDrop).toHaveBeenCalledWith(2, 2);
  });

  it('still delivers ordinary cross-index drops', async () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} crossNamespace />);
    await dragTile(0, screen.getByTestId('slot-1'));
    expect(onDrop).toHaveBeenCalledWith(0, 1);
  });

  it('fires onDropOutside when the pointer ends over no target', async () => {
    const onDrop = vi.fn();
    const onDropOutside = vi.fn();
    render(<Harness onDrop={onDrop} onDropOutside={onDropOutside} crossNamespace />);
    await dragTile(1, null);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onDropOutside).toHaveBeenCalledWith(1);
  });

  it('renders the React ghost content (no innerHTML cloning)', async () => {
    const restore = stubElementFromPoint(null);
    render(<Harness onDrop={vi.fn()} crossNamespace />);
    const tile = screen.getByTestId('tile-1');
    fireEvent.pointerDown(tile, DOWN);
    fireEvent.pointerMove(tile, MOVE);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const ghost = screen.getByTestId('ghost-content');
    expect(ghost).toHaveTextContent('tile-1');
    /* D-05: ghost rides transform translate3d, not left/top layout
       properties (spec s17 compositor budget). */
    expect(ghost.parentElement?.style.transform).toContain('translate3d(60px, 60px, 0)');
    fireEvent.pointerUp(tile, UP);
    restore();
  });
});
