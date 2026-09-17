import api from './apiInterceptor';
import type { CountryOption, PlanCatalog } from '../types/models';
import type { ApiItemResponse } from '../types/api';

/**
 * Supported countries for the signup and settings pickers.
 *
 * Unauthenticated on purpose — the registration form needs the list before a
 * user exists. Static reference data, so callers cache it for the session
 * rather than re-fetching per mount (see useCountries).
 */
export const listCountries = (): Promise<ApiItemResponse<CountryOption[]>> =>
  api.get('/meta/countries').then(r => r.data);

/**
 * The Free / Plus / Pro catalog priced for a country. Public. The
 * `purchasing` block is server-owned: while `enabled` is false the Plans
 * screen is read-only and shows `message` — no price change or launch of
 * paid plans needs a binary release.
 */
export const getPlans = (country?: string): Promise<ApiItemResponse<PlanCatalog>> =>
  api.get('/meta/plans', { params: country ? { country } : undefined }).then(r => r.data);
