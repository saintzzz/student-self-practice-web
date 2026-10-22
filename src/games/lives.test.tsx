import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGameLives } from './lives';

describe('useGameLives (CR-100 B5)', () => {
  it('starts full, drops one heart per lose(), reports out at 0', () => {
    const { result } = renderHook(() => useGameLives(3));
    expect(result.current.lives).toBe(3);
    expect(result.current.out).toBe(false);

    act(() => expect(result.current.lose()).toBe(2));
    expect(result.current.lives).toBe(2);
    act(() => expect(result.current.lose()).toBe(1));
    act(() => expect(result.current.lose()).toBe(0));
    expect(result.current.out).toBe(true);
    // Losing past zero stays at zero - no negative hearts.
    act(() => expect(result.current.lose()).toBe(0));
    expect(result.current.lives).toBe(0);
  });

  it('reset() restores full hearts', () => {
    const { result } = renderHook(() => useGameLives(3));
    act(() => result.current.lose());
    act(() => result.current.lose());
    expect(result.current.lives).toBe(1);
    act(() => result.current.reset());
    expect(result.current.lives).toBe(3);
    expect(result.current.out).toBe(false);
  });
});
