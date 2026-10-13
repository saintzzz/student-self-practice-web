/**
 * kids-UX (impl-plan step 13): client-only funnel event bus. Parents must
 * be able to reach a usable purchase path - we instrument the funnel so a
 * broken step is measurable instead of invisible. No network, no child
 * identifiers: only aggregate step names + a coarse timestamp bucket.
 * Privacy matrix (PRD s.privacy): forbidden - child name, student id,
 * question content, recordings. Allowed - step name, screen id, band.
 */

export type FunnelStep =
  | 'report_view'
  | 'gate_passed'
  | 'gate_failed'
  | 'pricing_view'
  | 'pricing_copy'
  | 'share_card'
  | 'send_results_sent'
  | 'explore_open'
  | 'gift_picked';

export interface FunnelEvent {
  step: FunnelStep;
  /** 'G12' | 'G345' | 'parent' - coarse band only, never a user id. */
  surface: string;
  /** minute-bucketed epoch (privacy: no precise timestamps). */
  bucket: number;
}

const listeners = new Set<(e: FunnelEvent) => void>();

export function trackFunnel(step: FunnelStep, surface: string): void {
  const event: FunnelEvent = { step, surface, bucket: Math.floor(Date.now() / 60000) };
  for (const fn of listeners) {
    try {
      fn(event);
    } catch {
      // analytics must never break the product
    }
  }
}

/** Subscribe for tests or a future transport. Returns unsubscribe. */
export function onFunnelEvent(fn: (e: FunnelEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
