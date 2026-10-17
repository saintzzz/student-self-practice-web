import type { ButtonHTMLAttributes } from 'react';
import { usePressRelease } from '../hooks/usePressRelease';

/**
 * CR-82 (spec s16.1, pressRelease.consumer.test): the shared button shell
 * for map-rendered interactive tiles - every instance owns its own
 * usePressRelease hook (hooks cannot be called inside .map).
 *
 * External pointer/keyboard handlers COMPOSE with the hook's, so drag
 * surfaces (spell/gap/pair tiles) keep their gesture wiring while gaining
 * the press-release spring.
 */
export default function PressableOptionButton({
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  onAnimationEnd,
  disabled,
  type,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const press = usePressRelease({ disabled });
  return (
    <button
      type={type ?? 'button'}
      {...rest}
      disabled={disabled}
      data-pressed={press['data-pressed']}
      onPointerDown={(e) => {
        press.onPointerDown(e);
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        press.onPointerUp(e);
        onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        press.onPointerCancel(e);
        onPointerCancel?.(e);
      }}
      onKeyDown={(e) => {
        press.onKeyDown(e);
        onKeyDown?.(e);
      }}
      onKeyUp={(e) => {
        press.onKeyUp(e);
        onKeyUp?.(e);
      }}
      onAnimationEnd={(e) => {
        press.onAnimationEnd(e);
        onAnimationEnd?.(e);
      }}
    />
  );
}
