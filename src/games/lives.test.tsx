import { describe, expect, it } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { ComboMeter, useCombo, useGameLives } from './lives';

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

describe('useCombo + ComboMeter (CR-104)', () => {
  it('chains hits into a streak, miss() breaks the chain', () => {
    const { result } = renderHook(() => useCombo());
    expect(result.current.streak).toBe(0);

    act(() => expect(result.current.hit()).toBe(1));
    act(() => expect(result.current.hit()).toBe(2));
    expect(result.current.streak).toBe(2);
    act(() => result.current.miss());
    expect(result.current.streak).toBe(0);
    act(() => expect(result.current.hit()).toBe(1));
  });

  it('meter stays hidden below 2, shows the streak from 2 up', () => {
    const { rerender } = render(<ComboMeter streak={1} />);
    expect(screen.queryByTestId('combo-meter')).toBeNull();
    rerender(<ComboMeter streak={4} />);
    expect(screen.getByTestId('combo-meter')).toHaveTextContent('x4');
  });
});
