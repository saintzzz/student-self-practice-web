/**
 * kids-UX step 11 (design-kids-ux s3.8.a, OM-1=B): the family pricing
 * constants for the in-app "Nâng cấp" surface. Every number mirrors
 * docs/sales/01-pricing.md (Tier 1 - Gia đình) verbatim - "KHÔNG bịa số".
 * A price change edits this file plus the source doc; pricingFamily.test.ts
 * pins the doc values so drift fails loudly.
 *
 * Bank details mirror docs/sdlc/CR-60-landing-pricing-payment.md (already
 * live on the vieschool.com landing) - transfer reconciliation is manual.
 */

/** Plan codes used inside the transfer content `VS <sdt> <goi>` so support
 *  can reconcile a bank transfer to a plan (CR-60 / design Ruling R-11). */
export const TRANSFER_CODES = {
  MUATHI: 'MUATHI',
  NAMHOC: 'NAMHOC',
  FOUNDING: 'FOUNDING',
} as const;

export type TransferCode = keyof typeof TRANSFER_CODES;

/** Transfer-content template per CR-60: `VS <sdt> <goi>`. Shown to the
 *  parent before a plan is picked. */
export const TRANSFER_NOTE = 'VS <so dien thoai> <ma goi>';

/** Concrete transfer content once a plan is chosen, e.g. "VS <so dien
 *  thoai> NAMHOC". The phone placeholder is intentional - the parent types
 *  their own number in the banking app. */
export function transferNoteFor(code: TransferCode, phone = '<so dien thoai>'): string {
  return `VS ${phone} ${TRANSFER_CODES[code]}`;
}

export interface PricingOffer {
  /** Key into TRANSFER_CODES - also the suffix of data-testid
   *  `pricing-offer-<code>`. */
  code: TransferCode;
  name: string;
  /** Numeric VND amount (source of truth for tests/guards). */
  priceVnd: number;
  /** Display string exactly as written in 01-pricing.md. */
  priceLabel: string;
  durationLabel: string;
  /** Real offer terms from the doc - never a fabricated counter. */
  terms?: string;
}

/** 01-pricing.md section 2, Tier 1 - Gia đình (B2C). Order = doc order.
 *  Design Ruling R-23: no "best value" badge, no preselected plan, no
 *  remaining-slot counter. Ruling R-10: no per-day price anchoring. */
export const PRICING: readonly PricingOffer[] = [
  {
    code: 'MUATHI',
    name: 'Gói Mùa thi',
    priceVnd: 249000,
    priceLabel: '249.000đ',
    durationLabel: '6 tháng / học sinh',
  },
  {
    code: 'NAMHOC',
    name: 'Gói Năm học',
    priceVnd: 399000,
    priceLabel: '399.000đ',
    durationLabel: '12 tháng / học sinh',
  },
  {
    code: 'FOUNDING',
    name: 'Gói Founding Family',
    priceVnd: 299000,
    priceLabel: '299.000đ',
    durationLabel: '12 tháng / học sinh',
    terms: 'Cho 300 gia đình đầu tiên hoặc đến 31/12/2026 - khóa giá năm đầu, đổi lại 1 phiếu góp ý.',
  },
];

/** What every paid plan includes (01-pricing.md Tier 1 row, translated to
 *  app vocabulary per design s3.8.a). */
export const PRICING_BENEFITS =
  'Gói gồm: Luyện tập, Thi thử IOE, Ôn lại câu sai, Đấu trường 1v1, Kiểm tra đầu vào, sao và huy hiệu, báo cáo cho ba mẹ, đồng bộ nhiều thiết bị.';

/** 01-pricing.md Tier 1: sibling discount is part of the offer. */
export const PRICING_SIBLING_NOTE = 'Anh chị em: giảm 50% từ con thứ 2 (cùng gói).';

/** 01-pricing.md header note. */
export const PRICING_VAT_NOTE = 'Giá chưa bao gồm VAT.';

/** CR-60 live transfer details (same as the vieschool.com landing). */
export const BANK_TRANSFER = {
  bankName: 'TPBank',
  accountNumber: '0157 9495 001',
  accountHolder: 'LE DUY LINH',
} as const;

/** Honest activation copy (microcopy deck key `pay.manual`, AC-9.1): no
 *  instant-unlock claim, no invented SLA. */
export const TRANSFER_ACTIVATION_NOTE =
  'Đây là chuyển khoản thủ công. Sau khi nhận tiền, VieSchool đối soát và kích hoạt gói cho tài khoản của bé, rồi báo lại ba mẹ qua Zalo trong giờ hành chính. Gói không tự mở ngay sau khi chuyển.';
