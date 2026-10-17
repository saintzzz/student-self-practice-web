/**
 * CR-82 (D-19): React 18 forwards the `inert` attribute as a string but
 * does not type it on HTMLAttributes. Augment so JSX may write
 * `inert=""` (never boolean true - React 18 drops/warns on booleans).
 * https://developer.mozilla.org/docs/Web/HTML/Global_attributes/inert
 */
import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    /** HTML inert attribute - always pass the empty string (''). */
    inert?: '' | undefined;
  }
}
