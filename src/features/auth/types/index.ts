// ============================================================
// Auth feature types.
// ============================================================

export interface User {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  /**
   * Effective permission codes as returned by the backend at login/refresh.
   * When absent (legacy stored session) the UI falls back to the role mirror.
   */
  permissions?: string[];
  /** True while the account must change its temporary password before use. */
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string;
}

export interface LoginResponse {
  userId: string;
  fullName: string;
  email: string;
  roles: string[];
  accessToken: string | null;
  refreshToken: string | null;
  requiresTwoFactor: boolean;
  /** True when the account is pending a forced password change (no tokens issued). */
  mustChangePassword?: boolean;
  /** Effective permission codes (role-derived ∪ direct grants). */
  permissions?: string[] | null;
}

export interface RefreshResponse {
  accessToken: string | null;
  refreshToken: string | null;
}

export interface ChangePasswordRequest {
  /** Set on the anonymous forced first-login flow; ignored for authenticated changes. */
  email?: string;
  currentPassword: string;
  newPassword: string;
}
