// ============================================================
// LoginForm.tsx
// Location: src/features/auth/components/LoginForm.tsx
//
// Multi-step login for the bearer scheme:
//   Step 1: AuthService.login() — tokens + user, or a two-factor
//           challenge, or a forced password-change marker.
//   Step 2: TOTP prompt (when requiresTwoFactor).
//   Step 3: Set-new-password screen (when mustChangePassword) —
//           the account was created/reset with a temporary password
//           and no tokens are issued until the user changes it.
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { AuthService, ApiError, extractErrorMessage } from '../services/authService';
import { useAuth } from './AuthContext';

type Step = 'login' | 'totp' | 'change';

const PASSWORD_HINT = 'At least 8 characters.';

export default function LoginForm() {
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return toast.error('Please enter your email address.');
    if (!password) return toast.error('Please enter your password.');
    if (step === 'totp' && !totpCode.trim()) return toast.error('Enter your authenticator code.');

    setLoading(true);
    try {
      const res = await AuthService.login({
        email: email.trim(),
        password,
        ...(step === 'totp' ? { totpCode: totpCode.trim() } : {}),
      });

      if (res.requiresTwoFactor) {
        setStep('totp');
        toast('Two-factor authentication required — enter your code.', { icon: '🔐' });
        return;
      }

      if (res.mustChangePassword) {
        setStep('change');
        toast('Temporary password accepted — set your own password to continue.', { icon: '🔑' });
        return;
      }

      login(AuthService.toUser(res));
      toast.success('Welcome back');
    } catch (err) {
      toast.error(err instanceof ApiError ? extractErrorMessage(err, 'Login failed.') : (err instanceof Error ? err.message : 'Login failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) return toast.error('Choose a new password.');
    if (newPassword.length < 8) return toast.error(PASSWORD_HINT);
    if (newPassword === password) return toast.error('New password must be different from the temporary password.');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match.');

    setLoading(true);
    try {
      // Anonymous forced flow: email + the temporary password prove ownership.
      const res = await AuthService.changePassword({
        email: email.trim(),
        currentPassword: password,
        newPassword,
      });
      login(AuthService.toUser(res));
      toast.success('Password set — welcome aboard');
    } catch (err) {
      toast.error(err instanceof ApiError ? extractErrorMessage(err, 'Could not set password.') : (err instanceof Error ? err.message : 'Could not set password.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Forced change screen ────────────────────────────────────────────────────
  if (step === 'change') {
    return (
      <form onSubmit={handleChangePassword} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-indigo-50 border border-indigo-100 p-3.5">
          <span className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
            <ShieldCheck size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-900">Set your own password</p>
            <p className="text-xs text-indigo-600/80 mt-0.5 leading-relaxed">
              Your account uses a temporary password issued by the administrator. Choose a
              personal password to continue — the temporary one will stop working.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pr-10"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{PASSWORD_HINT}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Confirm new password
          </label>
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            className="input"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <button type="submit" className="btn-primary w-full py-2.5" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Setting password…
            </>
          ) : (
            <>
              <KeyRound size={16} />
              Set password & continue
            </>
          )}
        </button>
      </form>
    );
  }

  // ── Login / TOTP screens ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Email
        </label>
        <input
          type="email"
          autoComplete="username"
          className="input"
          placeholder="you@stfrancis.local"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading || step === 'totp'}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
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
            disabled={isLoading || step === 'totp'}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {step === 'totp' && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
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

      {step === 'totp' && (
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-slate-600"
          onClick={() => {
            setStep('login');
            setTotpCode('');
          }}
        >
          ← Back to sign in
        </button>
      )}

      <button type="submit" className="btn-primary w-full py-2.5" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in…
          </>
        ) : step === 'totp' ? (
          'Verify code'
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
