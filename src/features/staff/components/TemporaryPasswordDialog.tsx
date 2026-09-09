// ============================================================
// TemporaryPasswordDialog.tsx
// Location: src/features/staff/components/TemporaryPasswordDialog.tsx
//
// Shows a one-time temporary password (account creation / admin reset).
// The backend never returns it again — the admin must copy it now.
// ============================================================

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, KeyRound, X } from 'lucide-react';

interface Props {
  fullName: string;
  temporaryPassword: string;
  title?: string;
  onClose: () => void;
}

export default function TemporaryPasswordDialog({
  fullName,
  temporaryPassword,
  title = 'Account created',
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      toast.success('Temporary password copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select and copy manually.');
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
            <span className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 flex-shrink-0">
              <KeyRound size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Hand this one-time password to the staff member. It will be asked to change on
            first sign-in and can never be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <code className="flex-1 font-mono text-base font-bold tracking-wide text-slate-800 select-all">
              {temporaryPassword}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-white border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button type="button" className="btn-primary w-full mt-4 py-2" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
