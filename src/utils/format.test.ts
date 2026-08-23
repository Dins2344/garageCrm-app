
import { formatMoney, formatNumber, formatDate, isIntlAvailable } from './format';

// MIRROR: keep in sync with frontend/src/utils/format.test.ts.
//
// CAVEAT worth knowing when these pass: vitest/jsdom and jest-expo both run on
// Node's full-ICU V8, NOT on Hermes. A green run here proves the logic, not
// that a real device formats identically. The formatter's Intl probe exists
// for exactly that gap, and Hermes needs a manual check on a dev build.

const IN = { locale: 'en-IN', currency: 'INR' };
const GB = { locale: 'en-GB', currency: 'GBP' };

describe('formatMoney', () => {
  it('uses the garage currency symbol', () => {
    expect(formatMoney(1234, IN)).toBe('₹1,234.00');
    expect(formatMoney(1234, GB)).toBe('£1,234.00');
  });

  it('preserves Indian lakh grouping and switches to thousands elsewhere', () => {
    expect(formatMoney(1234567, IN)).toBe('₹12,34,567.00');
    expect(formatMoney(1234567, GB)).toBe('£1,234,567.00');
  });

  it('treats null/undefined/NaN as zero rather than throwing', () => {
    expect(formatMoney(undefined, IN)).toBe('₹0.00');
    expect(formatMoney(null, IN)).toBe('₹0.00');
    expect(formatMoney(Number.NaN, IN)).toBe('₹0.00');
  });

  it('falls back readably for an unknown currency instead of throwing', () => {
    expect(formatMoney(12, { locale: 'en-GB', currency: 'NOT_A_CURRENCY' })).toBe('NOT_A_CURRENCY 12.00');
  });

  it('emits no non-breaking spaces (they break assertions silently)', () => {
    // Written as escapes, never as literal characters: U+00A0 and U+202F are
    // invisible in an editor, so a literal one that gets mangled into a plain
    // space turns this into an assertion that quietly tests nothing.
    // fr-FR is the interesting case — ICU uses U+202F for BOTH the thousands
    // separator and the gap before the symbol.
    [
      formatMoney(1234, IN), formatMoney(1234, GB),
      formatMoney(1234, { locale: 'fr-FR', currency: 'EUR' }),
      formatMoney(1234, IN, { display: 'code' }),
    ].forEach(out => {
      expect(out).not.toMatch(/[\u00a0\u202f]/);
    });
  });
});

describe('formatNumber', () => {
  it('groups by locale', () => {
    expect(formatNumber(1234567, IN)).toBe('12,34,567');
    expect(formatNumber(1234567, GB)).toBe('1,234,567');
  });

  it('treats missing values as zero', () => {
    expect(formatNumber(undefined, IN)).toBe('0');
  });
});

describe('formatDate', () => {
  const d = new Date('2026-08-14T09:30:00Z');

  it('formats in the given locale', () => {
    expect(formatDate(d, IN)).toBe('14 August 2026');
    expect(formatDate(d, { locale: 'en-US' })).toBe('August 14, 2026');
  });

  it('returns empty string for missing or invalid dates', () => {
    expect(formatDate(null, IN)).toBe('');
    expect(formatDate(undefined, IN)).toBe('');
    expect(formatDate('not-a-date', IN)).toBe('');
  });

  it('accepts the short forms the list screens use', () => {
    expect(formatDate(d, IN, { day: 'numeric', month: 'short' })).toBe('14 Aug');
  });
});

describe('Intl probe', () => {
  it('reports Intl as available under the test runtime', () => {
    // If this ever fails the fallback path is being exercised, and every
    // expectation above would be asserting the wrong branch.
    expect(isIntlAvailable()).toBe(true);
  });
});
