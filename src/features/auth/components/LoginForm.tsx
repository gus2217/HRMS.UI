// ============================================================
// LoginForm.tsx
// Location: src/features/auth/components/LoginForm.tsx
//
// Two-step login for the bearer scheme:
//   Step 1: AuthService.login() — returns tokens (stored by the
//           service) + user info. If requiresTwoFactor, show a
//           TOTP input and re-submit with the code.
//   Step 2: context.login(user) — stores the session user.
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthService, ApiError, extractErrorMessage } from '../services/authService';
import { useAuth } from './AuthContext';

export default function LoginForm() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    if (!password) {
      toast.error('Please enter your password.');
      return;
    }
    if (requiresTwoFactor && !totpCode.trim()) {
      toast.error('Enter your authenticator code.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthService.login({
        email: email.trim(),
        password,
        ...(requiresTwoFactor ? { totpCode: totpCode.trim() } : {}),
      });

      if (res.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        toast('Two-factor authentication required — enter your code.', { icon: '🔐' });
        return;
      }

      login(AuthService.toUser(res));
      toast.success('Welcome back');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(extractErrorMessage(err, 'Login failed.'));
      } else {
        toast.error(err instanceof Error ? err.message : 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

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
          disabled={isLoading}
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
      </div>

      {requiresTwoFactor && (
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

      <button type="submit" className="btn-primary w-full py-2.5" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in…
          </>
        ) : requiresTwoFactor ? (
          'Verify code'
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
