// MIRROR: keep in sync with frontend/src/utils/format.ts and, on the server,
// backend/utils/format.ts. (The project already hand-mirrors types/models.ts
// this way — see the root AGENTS.md note on shared values.)
import type { ResolvedLocale } from '../types/models';

/**
 * Locale-aware money / date / number formatting.
 *
 * Every value is formatted against the GARAGE's resolved locale, never the
 * reader's device. A UK garage's staff on a phone set to Hindi must still see
 * GBP and dd/mm/yyyy — the invoice belongs to the garage, not the viewer.
 */

export type FormatLocale = Pick<ResolvedLocale, 'locale' | 'currency'> & { timezone?: string };

/**
 * ICU inserts a non-breaking space (U+00A0) or narrow NBSP (U+202F) between a
 * currency symbol and the digits, and engines disagree about which. Those
 * bytes are invisible but they break string assertions, so normalise them.
 * This is why tests must never snapshot a raw formatted string.
 */
const normalizeSpaces = (s: string): string => s.replace(/[\u00a0\u202f]/g, ' ');

/**
 * Whether this JS engine can actually format currency.
 *
 * React Native's Hermes ships Intl backed by platform ICU, which is normally
 * fine for NumberFormat/DateTimeFormat — but a stripped build, or an old
 * Android system image, can leave it partially implemented. Probing once at
 * module load costs nothing and lets every call site degrade to a readable
 * "INR 1,234.00" instead of throwing mid-render.
 *
 * Deliberately NOT probing narrowSymbol/compact/formatToParts/PluralRules:
 * nothing here uses them, precisely because Hermes support is unreliable.
 */
const intlWorks = ((): boolean => {
  try {
    const probe = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(1);
    return typeof probe === 'string' && probe.length > 0 && /1/.test(probe);
  } catch {
    return false;
  }
})();

/** Readable last resort — the ISO code reads fine in every locale. */
const fallbackMoney = (value: number, currency: string) => `${currency} ${value.toFixed(2)}`;

/** Format an amount as currency, e.g. `₹1,234.00` / `£1,234.00`. */
export const formatMoney = (
  amount: number | undefined | null,
  { locale, currency }: FormatLocale,
  opts: { display?: 'symbol' | 'code' } = {}
): string => {
  const value = Number(amount) || 0;
  if (!intlWorks) return fallbackMoney(value, currency);
  try {
    return normalizeSpaces(
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: opts.display === 'code' ? 'code' : 'symbol',
        // Always two, everywhere. Several screens previously used a bare
        // toLocaleString, which shows 0-3 decimals depending on the amount —
        // so the same total could render as ₹1,234 in a list and ₹1,234.50 on
        // the invoice. Money is worth three characters of width.
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    );
  } catch {
    return fallbackMoney(value, currency);
  }
};

/** Plain number with locale grouping — odometer readings, counts. */
export const formatNumber = (
  value: number | undefined | null,
  { locale }: Pick<FormatLocale, 'locale'>
): string => {
  const n = Number(value) || 0;
  if (!intlWorks) return String(n);
  try {
    return normalizeSpaces(new Intl.NumberFormat(locale).format(n));
  } catch {
    return String(n);
  }
};

const DEFAULT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

/** Format a date in the garage's locale (and timezone, when one is given). */
export const formatDate = (
  date: Date | string | number | undefined | null,
  { locale, timezone }: Pick<FormatLocale, 'locale'> & { timezone?: string },
  opts: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTS
): string => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return normalizeSpaces(
      new Intl.DateTimeFormat(locale, { ...opts, ...(timezone ? { timeZone: timezone } : {}) }).format(d)
    );
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

/** Exposed for the boot log / diagnostics, not for branching in components. */
export const isIntlAvailable = (): boolean => intlWorks;
