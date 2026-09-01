// ============================================================
// Jacana HRMS API client — shared transport for all feature services.
// Bearer-token auth: access token in memory, refresh token in
// localStorage so a reload can silently refresh. Every request
// sends `X-Auth-Mode: bearer` to opt the SPA out of the cookie/CSRF
// scheme. On 401 the client refreshes once (single-flight) and retries.
// ============================================================

import config from '@/config';

const API_BASE = config.API_BASE_URL;

let accessToken: string | null = null;

const REFRESH_KEY = 'jacana…oken';

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiProblem {
  error?: string;
  title?: string;
  detail?: string;
  duplicateCandidates?: unknown[];
}

/** Single-flight refresh so concurrent 401s trigger one refresh. */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Auth-Mode': 'bearer' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
        if (!data.accessToken) return false;
        accessToken = data.accessToken;
        if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Mode': 'bearer',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers ?? {}),
      },
    });

  let res = await doFetch();

  if (res.status === 401 && (await refreshAccessToken())) {
    res = await doFetch();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const problem = (await res.json()) as ApiProblem;
      message = problem.detail ?? problem.error ?? problem.title ?? message;
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ─── Shared types (mirror backend DTOs) ────────────────────────────────

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
