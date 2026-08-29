import { Platform } from 'react-native';
import api from './apiInterceptor';
import type { ApiItemResponse } from '../types/api';
import { APP_VERSION } from '../utils/appVersion';
import { UPDATE_CHECK_TIMEOUT_MS } from '../utils/constants';

/**
 * The server's decision for this build. Colocated here rather than in
 * `types/models.ts`, which is hand-mirrored with the web repo and has no use
 * for this — `adminService.ts` on web sets the same precedent.
 */
export interface AppUpdateDecision {
  updateAvailable: boolean;
  updateRequired: boolean;
  latestVersion: string;
  storeUrl: string;
  message: string;
  /** Echo of what we sent, so a cached or misrouted response is detectable. */
  receivedVersion: string;
}

/**
 * Unauthenticated, like `metaService` — this runs on a cold start before login.
 *
 * The per-request `timeout` is load-bearing, not decoration: `apiInterceptor`'s
 * axios instance sets none, so a hung socket would leave the gate waiting with
 * nothing to end it. Per-request on purpose — adding a global timeout to the
 * interceptor would silently change every existing call, PDF downloads
 * included, in one unreviewed stroke.
 *
 * `version` is **omitted** rather than sent empty when the manifest is
 * unreadable. The server treats an absent version as "no opinion", which is the
 * safe direction.
 */
export const getAppUpdate = (): Promise<ApiItemResponse<AppUpdateDecision>> =>
  api
    .get('/meta/app-update', {
      params: { platform: Platform.OS, ...(APP_VERSION ? { version: APP_VERSION } : {}) },
      timeout: UPDATE_CHECK_TIMEOUT_MS,
    })
    .then(r => r.data);
