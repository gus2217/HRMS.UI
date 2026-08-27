import { create } from 'zustand'
import { authApi, type LoginResponse } from '@/lib/api'
import { permissionsForRoles, type Permission } from '@/lib/permissions'
import { clearTokens, setTokens } from '@/lib/api'

export interface SessionUser {
  userId: string
  fullName: string
  email: string
  roles: string[]
}

const USER_KEY = 'jacana.sessionUser'

function loadStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

interface AuthState {
  user: SessionUser | null
  permissions: Set<Permission>
  isRestoring: boolean
  restoreSession: () => Promise<void>
  login: (email: string, password: string, totpCode?: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadStoredUser(),
  permissions: new Set(),
  isRestoring: true,

  restoreSession: async () => {
    const stored = loadStoredUser()
    if (!stored) {
      set({ isRestoring: false, user: null, permissions: new Set() })
      return
    }
    // Keep the stored user optimistically; the api layer refreshes the token
    // lazily on first 401. Recompute permissions for the session.
    set({ user: stored, permissions: permissionsForRoles(stored.roles), isRestoring: false })
  },

  login: async (email, password, totpCode) => {
    const res: LoginResponse = await authApi.login(email, password, totpCode)
    if (!res.requiresTwoFactor) {
      if (res.accessToken && res.refreshToken) {
        setTokens(res.accessToken, res.refreshToken)
      }
      const user: SessionUser = {
        userId: res.userId,
        fullName: res.fullName,
        email: res.email,
        roles: res.roles,
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user, permissions: permissionsForRoles(res.roles) })
    } else {
      // Two-factor challenge: surface via a typed error so the Login page
      // can prompt for the TOTP code.
      const err = new Error('TWO_FACTOR_REQUIRED') as Error & { requiresTwoFactor?: boolean }
      err.requiresTwoFactor = true
      throw err
    }
  },

  logout: async () => {
    clearTokens()
    localStorage.removeItem(USER_KEY)
    set({ user: null, permissions: new Set() })
  },
}))
