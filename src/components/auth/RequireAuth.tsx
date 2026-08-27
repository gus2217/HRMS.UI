import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { hasPermission, type Permission } from '@/lib/permissions'

interface RequireAuthProps {
  children: ReactNode
  permission?: Permission
}

/**
 * Route guard: waits for session restore, redirects to /login when
 * unauthenticated, and optionally enforces a permission.
 */
export function RequireAuth({ children, permission }: RequireAuthProps) {
  const user = useAuthStore((s) => s.user)
  const permissions = useAuthStore((s) => s.permissions)
  const isRestoring = useAuthStore((s) => s.isRestoring)
  const location = useLocation()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isRestoring) setReady(true)
  }, [isRestoring])

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#040911]">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#FFA500] rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Loading Jacana…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (permission && !hasPermission(permissions, permission)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
