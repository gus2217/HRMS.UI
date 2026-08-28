// ============================================================
// Auth feature types.
// ============================================================

export interface User {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
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
}

export interface RefreshResponse {
  accessToken: string | null;
  refreshToken: string | null;
}
