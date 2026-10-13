import { describe, expect, it } from 'vitest';
import {
  BANK_TRANSFER,
  PRICING,
  TRANSFER_CODES,
  TRANSFER_NOTE,
  transferNoteFor,
} from './pricingFamily';

/**
 * kids-UX step 11: these expectations are intentionally HARDCODED from
 * docs/sales/01-pricing.md (Tier 1) and docs/sdlc/CR-60-*.md - the test is
 * the divergence guard between the pricing source of truth and the UI.
 */
describe('pricingFamily constants', () => {
  it('mirrors the three Tier-1 offers from 01-pricing.md exactly', () => {
    expect(PRICING.map((o) => o.code)).toEqual(['MUATHI', 'NAMHOC', 'FOUNDING']);
    const byCode = Object.fromEntries(PRICING.map((o) => [o.code, o]));
    // Doc: "Gói Mùa thi (6 tháng) 249.000đ/HS"
    expect(byCode.MUATHI?.priceVnd).toBe(249000);
    expect(byCode.MUATHI?.priceLabel).toBe('249.000đ');
    expect(byCode.MUATHI?.durationLabel).toContain('6 tháng');
    // Doc: "Gói Năm học (12 tháng) 399.000đ/HS"
    expect(byCode.NAMHOC?.priceVnd).toBe(399000);
    expect(byCode.NAMHOC?.priceLabel).toBe('399.000đ');
    expect(byCode.NAMHOC?.durationLabel).toContain('12 tháng');
    // Doc: "Giá Founding Family 299.000đ/năm"
    expect(byCode.FOUNDING?.priceVnd).toBe(299000);
    expect(byCode.FOUNDING?.priceLabel).toBe('299.000đ');
    expect(byCode.FOUNDING?.terms).toContain('300 gia đình');
    expect(byCode.FOUNDING?.terms).toContain('31/12/2026');
  });

  it('uses the CR-60 transfer codes in the VS <sdt> <goi> format', () => {
    expect(TRANSFER_CODES).toEqual({ MUATHI: 'MUATHI', NAMHOC: 'NAMHOC', FOUNDING: 'FOUNDING' });
    expect(TRANSFER_NOTE).toBe('VS <so dien thoai> <ma goi>');
    expect(transferNoteFor('NAMHOC')).toBe('VS <so dien thoai> NAMHOC');
    expect(transferNoteFor('MUATHI', '0901234567')).toBe('VS 0901234567 MUATHI');
  });

  it('mirrors the CR-60 live bank details', () => {
    expect(BANK_TRANSFER.bankName).toBe('TPBank');
    expect(BANK_TRANSFER.accountNumber).toBe('0157 9495 001');
    expect(BANK_TRANSFER.accountHolder).toBe('LE DUY LINH');
  });
});
