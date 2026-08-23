import { useEffect, useState } from 'react';
// MIRROR: keep in sync with frontend/src/hooks/useCountries.ts.
import { listCountries } from '../api/metaService';
import type { CountryOption } from '../types/models';

/**
 * The supported-country list, fetched once per page load.
 *
 * Module-level cache rather than per-component state: the list is static
 * reference data, and both the registration form and Settings mount pickers
 * that would otherwise each re-request it. The in-flight promise is cached too,
 * so two pickers mounting together share one request.
 */
let cache: CountryOption[] | null = null;
let inFlight: Promise<CountryOption[]> | null = null;

const fetchCountries = (): Promise<CountryOption[]> => {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = listCountries()
      .then(({ data }) => {
        cache = data;
        return data;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
};

export function useCountries() {
  const [countries, setCountries] = useState<CountryOption[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) return;
    fetchCountries()
      .then(data => { if (active) setCountries(data); })
      // A failed list must not block signup — the form falls back to the
      // default country, which is what every garage got before this existed.
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { countries, loading };
}

/** Test seam: lets a test populate or clear the module cache. */
export const __setCountryCache = (value: CountryOption[] | null) => { cache = value; };
