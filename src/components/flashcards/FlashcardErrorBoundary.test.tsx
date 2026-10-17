import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewerProvider } from '../../lib/viewer/ViewerContext';

/**
 * CR-82 (D-22/R-v5-12): the flashcard route boundary - retry loads a
 * genuinely fresh chunk type per attempt; "Tải lại trang" is gated on
 * TWO fresh failed invocations; "Về trang chính" exits immediately.
 *
 * The real `createRetryableLazy` is replaced by the same controllable
 * twin as TracingChunkBoundary.test - one lazy type per attempt, shared
 * load counting.
 */
const control = vi.hoisted(() => ({ fail: true, invocations: 0 }));

vi.mock('../../lib/retryableLazy', async () => {
  const { lazy } = await import('react');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Loaded = { default: React.ComponentType<any> };
  return {
    createRetryableLazy: (load: () => Promise<Loaded>) => {
      const types = new Map<number, unknown>();
      const counted = (): Promise<Loaded> => {
        control.invocations += 1;
        return control.fail ? Promise.reject(new Error('chunk fail')) : load();
      };
      return {
        typeFor: (attempt: number) => {
          if (!types.has(attempt)) types.set(attempt, lazy(counted));
          return types.get(attempt);
        },
        invocations: () => control.invocations,
        load: counted,
      };
    },
  };
});

const GRADE = { id: 'grade-2', name: 'Lớp 2' };

type Boundary = typeof import('./FlashcardErrorBoundary')['default'];

async function freshBoundary(stub: 'ok' | 'throw'): Promise<Boundary> {
  vi.resetModules();
  vi.doMock('./FlashcardScreen', () =>
    stub === 'ok'
      ? { default: () => <div data-testid="flashcard-body">body</div> }
      : {
          default: () => {
            throw new Error('render boom');
          },
        },
  );
  const mod = await import('./FlashcardErrorBoundary');
  return mod.default;
}

function renderBoundary(Boundary: Boundary, onExit = vi.fn()) {
  return render(
    <ViewerProvider gradeId="grade-2">
      <Boundary grade={GRADE as never} onExit={onExit} />
    </ViewerProvider>,
  );
}

describe('FlashcardErrorBoundary (D-22)', () => {
  beforeEach(() => {
    control.fail = true;
    control.invocations = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('loads the chunk and renders the flashcard screen', async () => {
    control.fail = false;
    renderBoundary(await freshBoundary('ok'));
    expect(await screen.findByTestId('flashcard-body')).toBeInTheDocument();
    expect(control.invocations).toBe(1);
  });

  it('first failure -> paper panel with retry+exit, no reload yet', async () => {
    renderBoundary(await freshBoundary('ok'));
    const panel = await screen.findByTestId('flashcard-error');
    expect(panel).toHaveTextContent('Chưa mở được bộ thẻ');
    expect(screen.getByTestId('flashcard-error-retry')).toBeInTheDocument();
    expect(screen.getByTestId('flashcard-error-exit')).toBeInTheDocument();
    expect(screen.queryByTestId('flashcard-error-reload')).not.toBeInTheDocument();
  });

  it('retry calls load() again and a successful second attempt renders the screen', async () => {
    renderBoundary(await freshBoundary('ok'));
    await screen.findByTestId('flashcard-error');
    control.fail = false;
    fireEvent.click(screen.getByTestId('flashcard-error-retry'));
    expect(await screen.findByTestId('flashcard-body')).toBeInTheDocument();
    expect(control.invocations).toBe(2);
  });

  it('two fresh failed attempts -> "Tải lại trang" appears; exit calls onExit', async () => {
    const onExit = vi.fn();
    renderBoundary(await freshBoundary('ok'), onExit);
    await screen.findByTestId('flashcard-error');
    expect(control.invocations).toBe(1);

    fireEvent.click(screen.getByTestId('flashcard-error-retry'));
    await screen.findByTestId('flashcard-error-reload');
    expect(control.invocations).toBe(2);

    fireEvent.click(screen.getByTestId('flashcard-error-exit'));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
