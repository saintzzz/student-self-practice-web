/**
 * CR-109 GTM unit tests - pure helpers shared by the agents
 * (scripts/gtm/lib.mjs) + footer/suppression/dedupe contracts the DB
 * trigger + send path rely on. AC anchors per CONVENTIONS (code-side
 * traceability): AC-109.1 dedupe, AC-109.3 footer, AC-109.4
 * suppression+flag, AC-109.8 footer on edit.
 */
import { describe, expect, it } from 'vitest';
import {
  buildFooter, dedupeKey, hasFooter, isBusinessEmail, normPhone,
  normText, parseJson, prefilter, uuidOrThrow,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - plain .mjs agent lib, no types
} from '../../../scripts/gtm/lib.mjs';

describe('normText / normPhone (REQ-1.2 dedupe input)', () => {
  it('strips diacritics + lowercases + collapses', () => {
    expect(normText('Trung Tâm Tiếng Anh  Đà Nẵng!')).toBe('trung tam tieng anh da nang');
    expect(normText('Trường Quốc Tế - Hòa Bình')).toBe('truong quoc te hoa binh');
  });
  it('normalizes VN phone to local 0-format', () => {
    expect(normPhone('+84 905 123 456')).toBe('0905123456');
    expect(normPhone('0905.123.456')).toBe('0905123456');
    expect(normPhone('')).toBe('');
  });
});

describe('dedupeKey (AC-109.1)', () => {
  it('prefers phone when present - same phone across name variants collides', () => {
    const a = dedupeKey({ name: 'ILA Đà Nẵng', city: 'Đà Nẵng', phone: '0905 111 222' });
    const b = dedupeKey({ name: 'ILA Danang Center', city: 'Danang', phone: '+84905111222' });
    expect(a).toBe(b);
  });
  it('falls back to name+city when no phone', () => {
    const a = dedupeKey({ name: 'Trường Tư Thục Ánh Dương', city: 'Huế', phone: '' });
    const b = dedupeKey({ name: 'truong tu thuc anh duong', city: 'hue', phone: '' });
    expect(a).toBe(b);
    expect(a).toMatch(/^n:/);
  });
  it('different cities do not collide', () => {
    const a = dedupeKey({ name: 'Anh Ngu ABC', city: 'Huế', phone: '' });
    const b = dedupeKey({ name: 'Anh Ngu ABC', city: 'Đà Nẵng', phone: '' });
    expect(a).not.toBe(b);
  });
});

describe('prefilter (REQ-2.1, AC-109.2)', () => {
  it('drops rows with no education signal', () => {
    expect(prefilter({ name: 'Cà Phê Nắng Mai', source: 'maps:cafe', address: 'Đà Nẵng' })).toBe('no_education_signal');
  });
  it('drops tertiary-only institutions', () => {
    expect(prefilter({ name: 'Trường Đại Học Bách Khoa', source: 'maps:trường đại học', address: 'Đà Nẵng' })).toBe('tertiary_or_government');
  });
  it('keeps English centers and private primary schools', () => {
    expect(prefilter({ name: 'Trung Tâm Anh Ngữ Sunrise', source: 'maps:trung tâm tiếng anh' })).toBeNull();
    expect(prefilter({ name: 'Trường Tiểu Học Quốc Tế SAKURA', source: 'maps:trường quốc tế' })).toBeNull();
  });
});

describe('isBusinessEmail (REQ-1.3)', () => {
  it('accepts org-domain + role mailboxes', () => {
    expect(isBusinessEmail('info@sunrise.edu.vn', 'sunrise.edu.vn')).toBe(true);
    expect(isBusinessEmail('contact@ila.edu.vn', 'ila.edu.vn')).toBe(true);
  });
  it('rejects personal-name mailboxes on consumer hosts', () => {
    expect(isBusinessEmail('nguyen.van.an@gmail.com', 'sunrise.edu.vn')).toBe(false);
  });
  it('accepts role-named consumer mailboxes as business contact', () => {
    expect(isBusinessEmail('sunrise.center@gmail.com', 'sunrise.edu.vn')).toBe(true);
  });
});

describe('hasFooter / buildFooter (REQ-3.5, AC-109.3, AC-109.8)', () => {
  it('buildFooter always satisfies hasFooter', () => {
    expect(hasFooter(`Xin chào,\n\n...\n\n${buildFooter()}`)).toBe(true);
  });
  it('rejects bodies missing the sentinel or opt-out line', () => {
    expect(hasFooter('Xin chào, thân gửi.')).toBe(false);
    expect(hasFooter(`...\nVieSchool - nền tảng luyện tiếng Anh tiểu học\nchúc mừng`)).toBe(false);
    expect(hasFooter(`trả lời "KHÔNG" để ngừng\nkhông có sentinel`)).toBe(false);
  });
  it('an edit that strips the opt-out line is detected (AC-109.8)', () => {
    const good = `Chào anh,\n\n${buildFooter()}`;
    const edited = good.replace('trả lời "KHÔNG"', 'trả lời "CÓ"');
    expect(hasFooter(edited)).toBe(false);
  });
});

describe('parseJson (LLM output guard)', () => {
  it('parses clean JSON, fenced JSON, and JSON inside prose', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJson('Kết quả: {"a":1} xong')).toEqual({ a: 1 });
    expect(parseJson('not json')).toBeNull();
  });
});

// r143/r144 external-review regression controls: each fixed defect
// ships the missing check rather than relying on code inspection.
describe('r144: uuidOrThrow (PostgREST filter-injection gate)', () => {
  it('accepts a real uuid', () => {
    expect(uuidOrThrow('dd4310c3-1883-462b-bc20-8cf8f79071a1', 'campaign-id'))
      .toBe('dd4310c3-1883-462b-bc20-8cf8f79071a1');
  });
  it('rejects filter-breakout attempts before interpolation', () => {
    for (const bad of [
      'x&status=eq.sent', '1234', "' or '1'='1", 'a;drop',
      'dd4310c3-1883-462b-bc20-8cf8f79071', // truncated
      'dd4310c3-1883-462b-bc20-8cf8f79071a1zzz',
    ]) {
      expect(() => uuidOrThrow(bad, 'campaign-id')).toThrow(/uuid/);
    }
    expect(() => uuidOrThrow(null, 'campaign-id')).toThrow(/uuid/);
  });
});

describe('r144: prefilter reads signals.category (fixture-mode regression)', () => {
  it('keeps a bare name whose category carries the education signal', () => {
    expect(prefilter({ name: 'Apollo Junior Đà Nẵng', source: 'fixture', signals: { category: 'trung tâm anh ngữ' } })).toBeNull();
  });
  it('still drops a bare name with no category signal', () => {
    expect(prefilter({ name: 'Apollo Junior Đà Nẵng', source: 'fixture' })).toBe('no_education_signal');
  });
});

// The gtmAll pagination contract tests live in scripts/gtm/lib.test.mjs:
// they need credential-env stubs that the ea scanner forbids inside
// src/. Vitest picks up .mjs specs outside src/ by default.
