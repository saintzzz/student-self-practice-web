import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * CR-82 (ARCHITECTURE-v5 D-22, GT-20): `React.lazy` caches its rejection
 * on the TYPE, so remounting a failed lazy component retries nothing and
 * `React.lazy(loader)` inside render would loop. The fix is one lazy type
 * per attempt number: "Thu lai" increments the attempt, the error
 * boundary resets with `key={attempt}`, and React renders a brand-new
 * type whose initializer calls `load()` again - a genuinely fresh
 * `import()` attempt.
 *
 * `typeFor` memoizes by attempt so re-renders within one attempt never
 * refetch. `invocations()` counts actual `load()` calls, which is how a
 * boundary distinguishes a fresh failed attempt from a cached-type
 * rethrow (the skip/reload affordances gate on the former only).
 *
 * Prefetch: `load()` is callable directly - the same promise is shared
 * with the lazy initializer while in flight, so a successful prefetch is
 * reused instead of fetched twice.
 */
export interface RetryableLazy<P> {
  /** One lazy type per attempt number; a new number = a new type = a new load() call. */
  typeFor(attempt: number): LazyExoticComponent<ComponentType<P>>;
  /** How many times `load()` has actually been invoked (fresh attempts). */
  invocations(): number;
  /** Direct loader call (prefetch / attempt 0). Shares the in-flight promise with the lazy type. */
  load(): Promise<{ default: ComponentType<P> }>;
}

export function createRetryableLazy<P>(
  load: () => Promise<{ default: ComponentType<P> }>,
): RetryableLazy<P> {
  const types = new Map<number, LazyExoticComponent<ComponentType<P>>>();
  let invoked = 0;
  let inflight: Promise<{ default: ComponentType<P> }> | null = null;

  const countedLoad = (): Promise<{ default: ComponentType<P> }> => {
    /* A lazy initializer may fire while a prefetch is in flight - that
       shares the promise, it is NOT a second attempt. */
    if (inflight) return inflight;
    invoked += 1;
    inflight = load().then(
      (mod) => {
        inflight = null;
        return mod;
      },
      (err) => {
        inflight = null;
        throw err;
      },
    );
    return inflight;
  };

  return {
    typeFor(attempt) {
      let type = types.get(attempt);
      if (!type) {
        type = lazy(countedLoad);
        types.set(attempt, type);
      }
      return type;
    },
    invocations() {
      return invoked;
    },
    load: countedLoad,
  };
}
