import api from './apiInterceptor';
import type { CountryOption } from '../types/models';
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
