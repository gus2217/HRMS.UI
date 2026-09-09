// ============================================================
// AccessEditorModal.tsx
// Location: src/features/staff/components/AccessEditorModal.tsx
//
// Edit a staff member's access: role membership + direct permission
// grants, saved atomically. Role-derived permissions are locked in
// the grid ("via role"); everything else is a direct grant. Also the
// home of status controls (suspend/reactivate) surfaced from the row.
// ============================================================

import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { StaffService } from '../services/staffService';
import type { PermissionDto, RoleDto, StaffUserDetailDto } from '../types/staff';
import PermissionGrid from './PermissionGrid';

interface Props {
  user: StaffUserDetailDto;
  onClose: () => void;
  onSaved: (updated: StaffUserDetailDto) => void;
}

export default function AccessEditorModal({ user, onClose, onSaved }: Props) {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [catalog, setCatalog] = useState<PermissionDto[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);
  const [directCodes, setDirectCodes] = useState<string[]>(user.directPermissions);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([StaffService.roles(), StaffService.permissions()])
      .then(([r, p]) => {
        setRoles(r);
        setCatalog(p);
      })
      .catch(() => toast.error('Could not load roles/permissions.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleRole = (name: string) => {
    setSelectedRoles((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0 && directCodes.length === 0) {
      return toast.error('The user needs at least one role or permission to sign in anywhere.');
    }

    setSaving(true);
    try {
      const updated = await StaffService.updateAccess(user.id, {
        roleNames: selectedRoles,
        permissionCodes: directCodes,
      });
      toast.success('Access updated');
      onSaved(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update access.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <ShieldCheck size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Manage access</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {user.fullName} · {user.email}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            <p className="text-sm text-slate-400">Loading roles…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-5">
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
            </div>

            {/* Direct grants */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Permissions
              </p>
              <PermissionGrid
                catalog={catalog}
                roles={roles}
                selectedRoleNames={selectedRoles}
                directCodes={directCodes}
                onChangeDirect={setDirectCodes}
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Greyed-out permissions come from the roles above. Direct grants survive role changes.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" className="btn-ghost text-xs" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Saving…
                  </>
                ) : (
                  'Save access'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
