import { render, screen, waitFor } from '@testing-library/react';
import { Component, Suspense, type ComponentType, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createRetryableLazy } from './retryableLazy';

type Props = Record<string, never>;
const ok: { default: ComponentType<Props> } = {
  default: () => <div data-testid="loaded">loaded</div>,
};

/** Minimal boundary - the lazy type's rejection must land somewhere. */
class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError(): { err: boolean } {
    return { err: true };
  }
  render(): ReactNode {
    return this.state.err ? <div data-testid="failed">failed</div> : this.props.children;
  }
}

describe('createRetryableLazy (D-22)', () => {
  it('renders the loaded module through typeFor(0)', async () => {
    const r = createRetryableLazy<Props>(() => Promise.resolve(ok));
    const Lazy = r.typeFor(0);
    render(
      <Suspense fallback={<div>loading</div>}>
        <Lazy />
      </Suspense>,
    );
    expect(await screen.findByTestId('loaded')).toBeInTheDocument();
    expect(r.invocations()).toBe(1);
  });

  it('memoizes one type per attempt (no refetch across re-renders)', async () => {
    const load = vi.fn(() => Promise.resolve(ok));
    const r = createRetryableLazy<Props>(load);
    expect(r.typeFor(0)).toBe(r.typeFor(0));
    expect(r.typeFor(0)).not.toBe(r.typeFor(1));
    render(
      <Suspense fallback={null}>
        {(() => { const L = r.typeFor(0); return <L />; })()}
      </Suspense>,
    );
    await screen.findByTestId('loaded');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('a new attempt number = a new type = a fresh load() call', async () => {
    let calls = 0;
    const r = createRetryableLazy<Props>(() => {
      calls += 1;
      return calls === 1
        ? Promise.reject<{ default: ComponentType<Props> }>(new Error('chunk fail'))
        : Promise.resolve(ok);
    });
    render(
      <Boundary>
        <Suspense fallback={null}>
          {(() => { const L = r.typeFor(0); return <L />; })()}
        </Suspense>
      </Boundary>,
    );
    await waitFor(() => expect(r.invocations()).toBe(1));
    await screen.findByTestId('failed');
    render(
      <Suspense fallback={null}>
        {(() => { const L = r.typeFor(1); return <L />; })()}
      </Suspense>,
    );
    expect(await screen.findByTestId('loaded')).toBeInTheDocument();
    expect(r.invocations()).toBe(2);
  });

  it('prefetch via load() shares its promise with the lazy initializer', async () => {
    const load = vi.fn(() => Promise.resolve(ok));
    const r = createRetryableLazy<Props>(load);
    const p = r.load();
    render(
      <Suspense fallback={null}>
        {(() => { const L = r.typeFor(0); return <L />; })()}
      </Suspense>,
    );
    await screen.findByTestId('loaded');
    await p;
    expect(load).toHaveBeenCalledTimes(1);
    expect(r.invocations()).toBe(1);
  });

  it('a failed attempt does not poison the next attempt', async () => {
    const r = createRetryableLazy<Props>(() =>
      Promise.reject<{ default: ComponentType<Props> }>(new Error('down')),
    );
    await expect(r.load()).rejects.toThrow('down');
    await expect(r.load()).rejects.toThrow('down');
    expect(r.invocations()).toBe(2);
  });
});
