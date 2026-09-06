// ============================================================
// confirmDialog.tsx
// Location: src/lib/confirmDialog.tsx
//
// Promise-based confirmation rendered as a styled in-app toast
// (react-hot-toast custom toast) instead of the browser's native
// confirm() dialog — so every confirmation matches the system's
// look and feel. Usage:
//
//   if (await confirmDialog({ message: 'Delete this record?', danger: true })) { ... }
// ============================================================

import toast from 'react-hot-toast';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  const {
    title = 'Please confirm',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
  } = options;

  return new Promise<boolean>((resolve) => {
    let toastId = '';
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      toast.dismiss(toastId);
      resolve(value);
    };

    toastId = toast.custom(
      (t) => (
        <div
          className={`pointer-events-auto w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl ${
            t.visible ? 'animate-in fade-in zoom-in-95' : 'opacity-0'
          }`}
        >
          <div className="p-4">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 rounded-b-xl bg-slate-50/60">
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => finish(false)}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={
                danger
                  ? 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors'
                  : 'btn-primary text-xs'
              }
              onClick={() => finish(true)}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' },
    );
  });
}
