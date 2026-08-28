// ============================================================
// authService.ts
// Location: src/features/auth/services/authService.ts
//
// Thin wrapper over the shared HTTP client. The backend uses the
// bearer scheme: access token in memory, refresh token in
// localStorage. Login returns the full user + tokens; two-factor
// challenges surface as requiresTwoFactor so the form can prompt
// for a TOTP code on a second step.
// ============================================================

import { http, setTokens, clearTokens } from '@/lib/apiClient';
import type { LoginRequest, LoginResponse, User } from '../types';

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Parse ASP.NET Core ValidationProblem / problem-details into a plain string. */
export function extractErrorMessage(payload: unknown, fallback = 'Something went wrong.'): string {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (!payload || typeof payload !== 'object') return fallback;
  const p = payload as Record<string, unknown>;
  if (typeof p.detail === 'string' && p.detail.trim()) return p.detail;
  if (typeof p.title === 'string' && p.title.trim()) return p.title;
  if (typeof p.error === 'string' && p.error.trim()) return p.error;
  if (p.errors && typeof p.errors === 'object') {
    const errors = p.errors as Record<string, unknown>;
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  return fallback;
}

export const AuthService = {
  /**
   * Authenticate. When requiresTwoFactor is true the caller should
   * prompt for the TOTP code and re-invoke with totpCode set.
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      const res = await http.post<LoginResponse>('/auth/login', request);
      if (!res.requiresTwoFactor && res.accessToken && res.refreshToken) {
        setTokens(res.accessToken, res.refreshToken);
      }
      return res;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, extractErrorMessage(err));
    }
  },

  /** Complete a two-factor challenge. */
  async loginWithTotp(request: LoginRequest & { totpCode: string }): Promise<LoginResponse> {
    return AuthService.login(request);
  },

  /** Build the session user from a login response. */
  toUser(res: LoginResponse): User {
    return { id: res.userId, fullName: res.fullName, email: res.email, roles: res.roles };
  },

  logout(): void {
    clearTokens();
  },
};
