import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Hospital, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface LocationState {
  from?: { pathname?: string }
}

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [twoFactorStep, setTwoFactorStep] = useState(false)
  const [isLoading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Enter your email and password.')
      return
    }
    setLoading(true)
    try {
      await login(email.trim(), password, twoFactorStep ? totpCode.trim() : undefined)
      toast.success('Welcome back')
      navigate(from, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      if (message === 'TWO_FACTOR_REQUIRED') {
        setTwoFactorStep(true)
        toast('Two-factor authentication required — enter your code.', { icon: '🔐' })
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#040911] px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-[#FFA500]/[0.06] blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <span className="w-14 h-14 rounded-2xl bg-[#FFA500]/10 border border-[#FFA500]/25 flex items-center justify-center text-[#FFA500] mb-4">
            <Hospital size={26} />
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Jacana HRMS</h1>
          <p className="text-sm text-white/40 mt-1">St. Francis Hospital — Staff Portal</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="username"
                className="input"
                placeholder="you@stfrancis.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {twoFactorStep && (
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Authenticator code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="input"
                  placeholder="6-digit code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : twoFactorStep ? (
                'Verify code'
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          Seeded accounts use <span className="text-white/40">ChangeMe123!</span> — change in production.
        </p>
      </div>
    </div>
  )
}
