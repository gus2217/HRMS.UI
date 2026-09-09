// ============================================================
// StaffPage.tsx
// Location: src/features/staff/pages/StaffPage.tsx
//
// Admin staff directory: search + paged list of staff accounts with
// roles/status at a glance, plus actions — create account, manage
// access (roles + permissions), reset password, suspend/reactivate.
// Every action is permission-gated (Identity.User.*).
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { StaffService } from '../services/staffService';
import type { StaffUserDetailDto, StaffUserListItemDto, UserStatus } from '../types/staff';
import { useAuth } from '@/features/auth/components/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { formatDateTime, initials } from '@/lib/format';
import { confirmDialog } from '@/lib/confirmDialog';
import CreateStaffModal from '../components/CreateStaffModal';
import AccessEditorModal from '../components/AccessEditorModal';
import TemporaryPasswordDialog from '../components/TemporaryPasswordDialog';

const PAGE_SIZE = 15;
const STATUS_STYLES: Record<UserStatus, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Suspended: 'bg-red-100 text-red-700',
  Locked: 'bg-amber-100 text-amber-700',
  Deactivated: 'bg-slate-100 text-slate-500',
};

export default function StaffPage() {
  const { permissions } = useAuth();
  const canCreate = hasPermission(permissions, PERMISSIONS.IDENTITY_USER_REGISTER);
  const canManageAccess =
    hasPermission(permissions, PERMISSIONS.IDENTITY_USER_ASSIGN_ROLE) &&
    hasPermission(permissions, PERMISSIONS.IDENTITY_USER_MANAGE_PERMISSIONS);
  const canReset = hasPermission(permissions, PERMISSIONS.IDENTITY_USER_RESET_PASSWORD);
  const canSuspend = hasPermission(permissions, PERMISSIONS.IDENTITY_USER_SUSPEND);

  const [items, setItems] = useState<StaffUserListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editor, setEditor] = useState<StaffUserDetailDto | null>(null);
  const [tempPwd, setTempPwd] = useState<{ fullName: string; password: string } | null>(null);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await StaffService.list(page, PAGE_SIZE, debounced || undefined);
      setItems(res.items);
      setTotal(res.totalCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  const replaceItem = (updated: StaffUserDetailDto) => {
    setItems((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setTotal((t) => t); // unchanged
  };

  const handleSuspend = async (user: StaffUserListItemDto) => {
    const ok = await confirmDialog({
      title: `Suspend ${user.fullName}?`,
      message: 'The account is immediately blocked and every live session is ended. They can be reactivated later.',
      confirmLabel: 'Suspend',
      danger: true,
    });
    if (!ok) return;
    try {
      const updated = await StaffService.suspend(user.id);
      replaceItem(updated);
      toast.success('Account suspended');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not suspend account.');
    }
  };

  const handleReactivate = async (user: StaffUserListItemDto) => {
    const ok = await confirmDialog({
      title: `Reactivate ${user.fullName}?`,
      message: 'The account will be able to sign in again with its current password.',
      confirmLabel: 'Reactivate',
    });
    if (!ok) return;
    try {
      const updated = await StaffService.reactivate(user.id);
      replaceItem(updated);
      toast.success('Account reactivated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reactivate account.');
    }
  };

  const handleReset = async (user: StaffUserListItemDto) => {
    const ok = await confirmDialog({
      title: `Reset password for ${user.fullName}?`,
      message:
        'A new one-time temporary password is generated and the account is forced to change it at next sign-in. Current sessions are ended.',
      confirmLabel: 'Reset password',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await StaffService.resetPassword(user.id);
      replaceItem({ ...user, mustChangePassword: true } as StaffUserDetailDto);
      setTempPwd({ fullName: user.fullName, password: res.temporaryPassword });
      toast.success('Password reset');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset password.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const roleCount = useMemo(() => new Set(items.flatMap((u) => u.roles)).size, [items]);

  return (
    <div className="p-5 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog size={20} className="text-indigo-600" /> Staff management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total.toLocaleString()} accounts · {roleCount} roles in use
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary text-xs" onClick={() => setShowCreate(true)}>
            <UserPlus size={14} />
            Add staff member
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <p className="text-sm text-slate-400">Loading staff…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-slate-400">No staff accounts found.</p>
            {debounced && (
              <button className="text-xs text-indigo-600 hover:underline mt-2" onClick={() => setSearch('')}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Phone</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id} className="align-middle">
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {initials(user.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-slate-500">{user.phone}</td>
                    <td>
                      <div className="flex flex-wrap gap-1 max-w-56">
                        {user.roles.length === 0 && (
                          <span className="text-xs text-slate-300 italic">no roles</span>
                        )}
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold"
                          >
                            {r}
                          </span>
                        ))}
                        {user.directPermissions.length > 0 && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold"
                            title={user.directPermissions.join(', ')}
                          >
                            +{user.directPermissions.length} direct
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[user.status as UserStatus] ?? 'bg-slate-100 text-slate-600'}`}
                        >
                          {user.status}
                        </span>
                        {user.mustChangePassword && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold inline-flex items-center gap-1">
                            <KeyRound size={9} /> change pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-slate-500 text-xs">{formatDateTime(user.lastLoginAtUtc)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {canManageAccess && (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Manage roles & permissions"
                            onClick={() => {
                              StaffService.detail(user.id)
                                .then(setEditor)
                                .catch(() => toast.error('Could not load account details.'));
                            }}
                          >
                            <ShieldCheck size={15} />
                          </button>
                        )}
                        {canReset && (
                          <button
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Reset password"
                            onClick={() => handleReset(user)}
                          >
                            <KeyRound size={15} />
                          </button>
                        )}
                        {canSuspend &&
                          (user.status === 'Active' ? (
                            <button
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Suspend account"
                              onClick={() => handleSuspend(user)}
                            >
                              <Ban size={15} />
                            </button>
                          ) : (
                            <button
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Reactivate account"
                              onClick={() => handleReactivate(user)}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page} of {totalPages} · {total.toLocaleString()} accounts
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button
              className="btn-ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateStaffModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}
      {editor && (
        <AccessEditorModal
          user={editor}
          onClose={() => setEditor(null)}
          onSaved={(updated) => {
            setEditor(null);
            replaceItem(updated);
          }}
        />
      )}
      {tempPwd && (
        <TemporaryPasswordDialog
          fullName={tempPwd.fullName}
          temporaryPassword={tempPwd.password}
          title="Password reset"
          onClose={() => setTempPwd(null)}
        />
      )}
    </div>
  );
}
