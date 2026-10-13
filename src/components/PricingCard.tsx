import { useEffect, useState } from 'react';
import {
  BANK_TRANSFER,
  PRICING,
  PRICING_BENEFITS,
  PRICING_SIBLING_NOTE,
  PRICING_VAT_NOTE,
  TRANSFER_ACTIVATION_NOTE,
  TRANSFER_NOTE,
  transferNoteFor,
  type TransferCode,
} from '../lib/pricingFamily';
import { COPY_BTN, PAPER_PANEL } from '../lib/ui/tokens';
import { GatedLink } from './GatedLink';
import { trackFunnel } from '../lib/funnel';
import { IconChat } from './icons';

/**
 * kids-UX step 11 (design-kids-ux s3.8.a, OM-1=B, AC-9.1): the honest
 * family pricing card. Light "paper" register for parents. Rules enforced
 * here: no per-day anchoring, no "best value" badges, no countdown or
 * urgency copy, no preselected plan - every number comes from
 * pricingFamily.ts (which mirrors docs/sales/01-pricing.md).
 *
 * Gating: this card is a purchase surface - it must only be mounted behind
 * the parent gate (enforced by ungatedPurchaseGuard.test.ts).
 */

const TILE =
  'flex min-h-[76px] flex-col gap-1 rounded-3xl bg-white p-5 text-left ring-2 ring-slate-200 transition hover:ring-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/60 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100';
const TILE_SELECTED = 'ring-sky-700 bg-sky-50';

/** Clipboard with a legacy fallback for webviews without the async API. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through to the textarea path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function PricingCard() {
  const [selected, setSelected] = useState<TransferCode | null>(null);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle');
  // Ruling R-12: the Zalo consult button only exists when configured -
  // never render a dead link.
  const zaloUrl = (import.meta.env.VITE_ZALO_URL as string | undefined)?.trim() ?? '';

  useEffect(() => {
    trackFunnel('pricing_view', 'pricing-card');
  }, []);

  const note = selected ? transferNoteFor(selected) : TRANSFER_NOTE;

  async function handleCopy(): Promise<void> {
    const ok = await copyText(note);
    setCopied(ok ? 'ok' : 'failed');
    if (ok) trackFunnel('pricing_copy', 'pricing-card');
    window.setTimeout(() => setCopied('idle'), 2000);
  }

  return (
    <section data-testid="pricing-card" className={PAPER_PANEL} aria-label="Nâng cấp English Arena">
      <h2 className="font-display text-2xl font-extrabold text-slate-900">Nâng cấp English Arena</h2>
      <p className="mt-1 text-sm font-semibold text-slate-600">
        Một gói cho cả tiếng Anh và Toán tiếng Anh, lớp 1-5.
      </p>

      {/* Plan tiles - source-doc order, none preselected. */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {PRICING.map((offer) => {
          const isSelected = selected === offer.code;
          return (
            <button
              key={offer.code}
              type="button"
              data-testid={`pricing-offer-${offer.code}`}
              aria-pressed={isSelected}
              onClick={() => setSelected(offer.code)}
              className={`${TILE} ${isSelected ? TILE_SELECTED : ''}`}
            >
              <span className="text-lg font-extrabold text-slate-900">{offer.name}</span>
              <span className="font-display text-3xl font-extrabold text-amber-800">{offer.priceLabel}</span>
              <span className="text-sm font-semibold text-slate-600">{offer.durationLabel}</span>
              {offer.terms && <span className="text-sm font-semibold text-slate-600">{offer.terms}</span>}
              <span className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                Mã gói: {offer.code}
              </span>
              <span className="mt-2 text-sm font-extrabold text-sky-800">
                {isSelected ? '✓ Đã chọn' : 'Chọn gói này'}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-600">{PRICING_BENEFITS}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600">{PRICING_SIBLING_NOTE}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600">{PRICING_VAT_NOTE}</p>

      {/* Manual bank transfer - CR-60 details. */}
      <div className="mt-5 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
        <h3 className="text-base font-extrabold text-slate-900">Chuyển khoản ngân hàng</h3>
        <dl className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-slate-600">Ngân hàng:</dt>
            <dd>{BANK_TRANSFER.bankName}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-slate-600">Số tài khoản:</dt>
            <dd className="font-bold text-slate-900">{BANK_TRANSFER.accountNumber}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-slate-600">Chủ tài khoản:</dt>
            <dd className="font-bold text-slate-900">{BANK_TRANSFER.accountHolder}</dd>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <dt className="text-slate-600">Nội dung:</dt>
            <dd data-testid="pricing-note" className="rounded-lg bg-white px-2 py-1 font-mono text-sm font-bold text-slate-900 ring-1 ring-slate-200">
              {note}
            </dd>
            <button type="button" data-testid="pricing-copy" onClick={() => void handleCopy()} className={COPY_BTN}>
              Sao chép
            </button>
          </div>
        </dl>
        <p role="status" aria-live="polite" className="mt-2 text-sm font-bold">
          {copied === 'ok' && <span className="text-emerald-700">Đã chép ✓</span>}
          {copied === 'failed' && <span className="text-rose-700">Không chép được - ba mẹ chép tay nhé.</span>}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          ℹ {TRANSFER_ACTIVATION_NOTE}
        </p>
      </div>

      {zaloUrl && (
        // AC-5.1: external links go through the parent gate (shared 5-min
        // token, so an already-gated parent opens it directly).
        <span data-testid="pricing-zalo" className="mt-4 inline-flex">
          <GatedLink
            href={zaloUrl}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-100 px-4 font-bold text-sky-800 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 motion-reduce:transition-none"
          >
            <span className="inline-flex items-center gap-2"><IconChat size={18} /> Nhắn Zalo tư vấn</span>
          </GatedLink>
        </span>
      )}
    </section>
  );
}
