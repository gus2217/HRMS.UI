// ============================================================
// ChangePasswordModal.tsx
// Location: src/features/auth/components/ChangePasswordModal.tsx
//
// Self-service password change for signed-in staff. Verifies the
// current password, then rotates to a fresh token pair (all other
// sessions are revoked server-side). Also clears any pending
// forced-change flag.
// ============================================================

import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Loader2, X } from 'lucide-react';
import { AuthService, ApiError, extractErrorMessage } from '../services/authService';
import { useAuth } from './AuthContext';

interface Props {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: Props) {
  const { login } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return toast.error('Enter your current password.');
    if (!newPassword) return toast.error('Choose a new password.');
    if (newPassword.length < 8) return toast.error('New password must be at least 8 characters.');
    if (newPassword === currentPassword) {
      return toast.error('New password must be different from the current one.');
    }
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match.');

    setSaving(true);
    try {
      const res = await AuthService.changePassword({
        currentPassword,
        newPassword,
      });
      login(AuthService.toUser(res));
      toast.success('Password changed');
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? extractErrorMessage(err, 'Could not change password.')
          : err instanceof Error
            ? err.message
            : 'Could not change password.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <KeyRound size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Change password</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Other signed-in sessions will be signed out.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Current password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={saving}
            />
            <p className="text-[11px] text-slate-400 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Confirm new password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost text-xs" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Changing…
                </>
              ) : (
                'Change password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
