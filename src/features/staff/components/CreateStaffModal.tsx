// ============================================================
// CreateStaffModal.tsx
// Location: src/features/staff/components/CreateStaffModal.tsx
//
// Admin creates a staff account: identity details, role membership
// and optional direct permission grants. The backend generates a
// strong one-time default password and forces a change at first
// login — the result dialog shows the password exactly once.
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Info, Loader2, UserPlus, X } from 'lucide-react';
import { StaffService } from '../services/staffService';
import type { PermissionDto, RoleDto } from '../types/staff';
import PermissionGrid from './PermissionGrid';
import TemporaryPasswordDialog from './TemporaryPasswordDialog';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateStaffModal({ onClose, onCreated }: Props) {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [catalog, setCatalog] = useState<PermissionDto[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [directCodes, setDirectCodes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ fullName: string; temporaryPassword: string } | null>(null);

  useEffect(() => {
    Promise.all([StaffService.roles(), StaffService.permissions()])
      .then(([r, p]) => {
        setRoles(r);
        setCatalog(p);
      })
      .catch(() => toast.error('Could not load roles/permissions.'));
  }, []);

  const toggleRole = (name: string) => {
    setSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error('Full name is required.');
    if (!email.trim()) return toast.error('Email is required.');
    if (!phone.trim()) return toast.error('Phone number is required.');
    if (selectedRoles.length === 0 && directCodes.length === 0) {
      return toast.error('Assign at least one role or permission — an account with no access cannot sign in to anything.');
    }

    setSaving(true);
    try {
      const created = await StaffService.create({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        roleNames: selectedRoles,
        permissionCodes: directCodes,
      });
      setResult({ fullName: created.user.fullName, temporaryPassword: created.temporaryPassword });
      toast.success('Staff account created');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <TemporaryPasswordDialog
        fullName={result.fullName}
        temporaryPassword={result.temporaryPassword}
        title="Staff account created"
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <UserPlus size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Add staff member</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The system generates a one-time password — shown once at the end.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">
          {/* Identity */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Full name
              </label>
              <input
                className="input"
                placeholder="e.g. Grace Wanjiku"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="name@stfrancis.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Phone
              </label>
              <input
                className="input"
                placeholder="+2547…"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Roles */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Roles</p>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((role) => {
                const active = selectedRoles.includes(role.name);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleRole(role.name)}
                    disabled={saving}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                    }`}
                  >
                    {role.name}
                    <span className={`ml-1.5 ${active ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {role.permissions.length}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              A role bundles its permissions automatically — anything not covered can be granted
              individually below.
            </p>
          </div>

          {/* Direct permission grants */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Individual permissions (optional extras)
            </p>
            <PermissionGrid
              catalog={catalog}
              roles={roles}
              selectedRoleNames={selectedRoles}
              directCodes={directCodes}
              onChangeDirect={setDirectCodes}
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-sky-50 border border-sky-100 p-3">
            <Info size={14} className="text-sky-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky-700 leading-relaxed">
              The staff member signs in with the generated temporary password and is required to set
              their own password immediately. Accounts can be suspended or reset from the directory
              at any time.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost text-xs" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Creating…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
