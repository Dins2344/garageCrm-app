// MIRROR: keep in sync with frontend/src/utils/locale.ts and, on the server,
// backend/config/countries.ts + backend/utils/locale.ts.
import type { ResolvedLocale } from '../types/models';

/**
 * What to format with before the garage's real locale has loaded.
 *
 * India, because that's what every pre-existing garage resolves to and what
 * the backend falls back to. Its only job is to keep first paint from
 * rendering `NaN` or `undefined` in place of an amount — it is replaced as
 * soon as the garage payload arrives.
 */
export const DEFAULT_LOCALE: ResolvedLocale = {
  country: 'IN',
  currency: 'INR',
  locale: 'en-IN',
  taxLabel: 'GST',
  taxIdLabel: 'GSTIN',
  postalLabel: 'Pincode',
  postalInputMode: 'numeric',
  phoneExample: '98765 43210',
  timezone: 'Asia/Kolkata',
};

/**
 * Timezone choices for the countries that span several zones.
 *
 * A short curated list, not the full IANA database: an owner picking where
 * their garage is should see a handful of recognisable options, and every one
 * of these is a zone we can state confidently. Countries with a single zone
 * never reach this — the server resolves theirs from the country table.
 */
export const TIMEZONE_CHOICES: Record<string, { value: string; label: string }[]> = {
  US: [
    { value: 'America/New_York', label: 'Eastern (New York)' },
    { value: 'America/Chicago', label: 'Central (Chicago)' },
    { value: 'America/Denver', label: 'Mountain (Denver)' },
    { value: 'America/Phoenix', label: 'Mountain, no DST (Phoenix)' },
    { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
    { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
  ],
  CA: [
    { value: 'America/St_Johns', label: 'Newfoundland (St. John’s)' },
    { value: 'America/Halifax', label: 'Atlantic (Halifax)' },
    { value: 'America/Toronto', label: 'Eastern (Toronto)' },
    { value: 'America/Winnipeg', label: 'Central (Winnipeg)' },
    { value: 'America/Edmonton', label: 'Mountain (Edmonton)' },
    { value: 'America/Vancouver', label: 'Pacific (Vancouver)' },
  ],
  AU: [
    { value: 'Australia/Sydney', label: 'Eastern (Sydney)' },
    { value: 'Australia/Melbourne', label: 'Eastern (Melbourne)' },
    { value: 'Australia/Brisbane', label: 'Eastern, no DST (Brisbane)' },
    { value: 'Australia/Adelaide', label: 'Central (Adelaide)' },
    { value: 'Australia/Perth', label: 'Western (Perth)' },
    { value: 'Australia/Darwin', label: 'Central, no DST (Darwin)' },
  ],
};

/** The timezone options for a country, or [] when the country has just one. */
export const timezoneChoicesFor = (country?: string): { value: string; label: string }[] =>
  (country && TIMEZONE_CHOICES[country]) || [];
