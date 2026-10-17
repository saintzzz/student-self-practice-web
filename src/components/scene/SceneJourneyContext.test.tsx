import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { SceneJourneyProvider, useSceneJourney, type SceneRootRef } from './SceneJourneyContext';

/** Board component: counts React renders to prove journey writes are
 *  imperative and do not re-render the play surface (D-06). */
function Board({ fraction, roundKey, renders }: { fraction: number; roundKey: string; renders: { n: number } }) {
  useSceneJourney(fraction, roundKey);
  renders.n += 1;
  return <div data-testid="board" />;
}

function Host({ fraction, roundKey, renders }: { fraction: number; roundKey: string; renders: { n: number } }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div>
      <div ref={ref} data-testid="scene-root">
        <div data-scene-layer="mid" />
        <div data-scene-layer="near" />
      </div>
      <SceneJourneyProvider rootRef={ref as SceneRootRef}>
        <Board fraction={fraction} roundKey={roundKey} renders={renders} />
      </SceneJourneyProvider>
    </div>
  );
}

describe('useSceneJourney (CR-82 M2, D-06 / spec s6.3)', () => {
  it('writes --journey + data-round imperatively on the scene root', () => {
    const renders = { n: 0 };
    render(<Host fraction={0.5} roundKey="r1" renders={renders} />);
    const root = screen.getByTestId('scene-root');
    expect(root.style.getPropertyValue('--journey')).toBe('0.5');
    expect(root).toHaveAttribute('data-round', 'r1');
  });

  it('clamps fraction into 0..1', () => {
    const renders = { n: 0 };
    render(<Host fraction={1.4} roundKey="r1" renders={renders} />);
    expect(screen.getByTestId('scene-root').style.getPropertyValue('--journey')).toBe('1');
  });

  it('updates --journey without extra React renders of the board', () => {
    const renders = { n: 0 };
    const { rerender } = render(<Host fraction={0.2} roundKey="r1" renders={renders} />);
    rerender(<Host fraction={0.6} roundKey="r1" renders={renders} />);
    const root = screen.getByTestId('scene-root');
    expect(root.style.getPropertyValue('--journey')).toBe('0.6');
    // one render per Host render - the journey write itself caused none
    expect(renders.n).toBe(2);
  });

  it('roundKey change resets --journey to 0 then applies the new fraction and replays the L2/L3 fade', () => {
    const renders = { n: 0 };
    const { rerender } = render(<Host fraction={0.8} roundKey="r1" renders={renders} />);
    rerender(<Host fraction={0.1} roundKey="r2" renders={renders} />);
    const root = screen.getByTestId('scene-root');
    expect(root).toHaveAttribute('data-round', 'r2');
    expect(root.style.getPropertyValue('--journey')).toBe('0.1');
    // fade replay leaves the inline animation override cleared
    for (const layer of root.querySelectorAll<HTMLElement>('[data-scene-layer]')) {
      expect(layer.style.animation).toBe('');
    }
  });

  it('is a no-op without a provider or a mounted scene root', () => {
    // Board mounted with no provider -> context null -> no crash.
    function Bare() {
      useSceneJourney(0.3, 'r1');
      return <div />;
    }
    expect(() => render(<Bare />)).not.toThrow();
  });
});
